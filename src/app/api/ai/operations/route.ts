import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { scopedReadResponse } from "@/lib/data/scopedResponseCache";
import type { AiAutomationHealth } from "@/types/aiExecution";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await getApiAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  return scopedReadResponse(access, "ai-operations", () => loadOperations(access));
}

async function loadOperations(access: Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [result, matrixResult, snapshots, incidents, taskRuns, collectionFailures, componentStates] = await Promise.all([
    access.supabase.rpc("wpi_get_ai_automation_health", {
      target_organization_id: access.organizationId,
    }),
    access.supabase.rpc("wpi_get_ai_automation_matrix", {
      target_organization_id: access.organizationId,
    }),
    access.supabase
      .from("wpi_automation_health_snapshots")
      .select("overall_status,captured_at")
      .eq("organization_id", access.organizationId)
      .gte("captured_at", since)
      .order("captured_at", { ascending: false })
      .limit(96),
    access.supabase
      .from("wpi_automation_incidents")
      .select("id,incident_key,status,severity,title,message,first_detected_at,last_detected_at,occurrence_count,resolved_at,metadata")
      .eq("organization_id", access.organizationId)
      .eq("status", "open")
      .order("last_detected_at", { ascending: false }),
    access.supabase
      .from("wpi_ai_execution_tasks")
      .select("workflow_key,status,created_at,completed_at")
      .eq("organization_id", access.organizationId)
      .order("created_at", { ascending: false })
      .limit(500),
    access.supabase
      .from("wpi_price_collection_runs")
      .select("created_at,error_message")
      .eq("organization_id", access.organizationId)
      .eq("run_kind", "source_attempt")
      .eq("status", "failed")
      .order("created_at", { ascending: false })
      .limit(1),
    access.supabase
      .from("wpi_automation_component_states")
      .select("component_key,component_type,label,health_status,message,remediation_href,consecutive_failures,consecutive_successes,first_failed_at,last_checked_at,last_changed_at")
      .eq("organization_id", access.organizationId)
      .order("health_status", { ascending: true })
      .order("component_type", { ascending: true })
      .order("label", { ascending: true }),
  ]);
  if (result.error) {
    return NextResponse.json(
      { error: `自动化健康状态读取失败：${result.error.message}` },
      { status: 500 },
    );
  }
  if (matrixResult.error || snapshots.error || incidents.error || taskRuns.error || collectionFailures.error || componentStates.error) {
    const message = matrixResult.error?.message ?? snapshots.error?.message ?? incidents.error?.message ?? taskRuns.error?.message ?? collectionFailures.error?.message ?? componentStates.error?.message ?? "未知错误";
    return NextResponse.json(
      { error: `持续保障状态读取失败：${message}` },
      { status: 500 },
    );
  }

  const health = result.data as Omit<AiAutomationHealth, "assurance">;
  const matrix = matrixResult.data as {
    workflows?: Array<Pick<AiAutomationHealth["workflows"][number], "workflowKey" | "configuration" | "latestRun" | "humanReview" | "formalWrite" | "smoke">>;
  };
  const now = Date.now();
  const successStatuses = new Set(["completed", "needs_review", "approved"]);
  const workflows = health.workflows.map((workflow) => {
    const matrixWorkflow = matrix.workflows?.find((item) => item.workflowKey === workflow.workflowKey);
    const runs = (taskRuns.data ?? []).filter((task) => task.workflow_key === workflow.workflowKey);
    const lastRun = runs[0];
    const successfulRun = runs.find((task) => successStatuses.has(task.status));
    const runs24h = runs.filter((task) => now - new Date(task.created_at).getTime() <= 24 * 60 * 60 * 1000);
    return {
      ...workflow,
      lastSuccessAt: successfulRun?.completed_at ?? null,
      lastRunAt: lastRun?.created_at ?? null,
      lastRunStatus: lastRun?.status ?? null,
      runs24h: runs24h.length,
      failures24h: runs24h.filter((task) => task.status === "failed").length,
      configuration: matrixWorkflow?.configuration ?? {
        status: workflow.ready ? "passed" : "blocked",
        label: workflow.ready ? "已就绪" : "配置阻塞",
        detail: workflow.blocker,
      },
      latestRun: matrixWorkflow?.latestRun ?? {
        status: lastRun ? (lastRun.status === "failed" ? "failed" : "pending") : "not_run",
        label: lastRun?.status ?? "尚未运行",
        at: lastRun?.created_at ?? null,
      },
      humanReview: matrixWorkflow?.humanReview ?? { status: "not_run", label: "暂无审核记录", count: 0 },
      formalWrite: matrixWorkflow?.formalWrite ?? { status: "not_run", label: "暂无业务结果", count: 0 },
      smoke: matrixWorkflow?.smoke ?? { status: "not_run", label: "等待首次冒烟", at: null },
    };
  });
  const latestCollectionFailure = collectionFailures.data?.[0];
  const snapshotRows = snapshots.data ?? [];
  const incidentRows = incidents.data ?? [];
  const assuredOverallStatus = incidentRows.some((incident) => incident.severity === "critical")
    ? "critical"
    : incidentRows.length > 0 && health.overallStatus === "healthy"
      ? "degraded"
      : health.overallStatus;
  const latestSnapshotAt = snapshotRows[0]?.captured_at ?? null;
  const assuranceFresh = latestSnapshotAt
    ? Date.now() - new Date(latestSnapshotAt).getTime() <= 30 * 60 * 1000
    : false;

  return NextResponse.json({
    data: {
      ...health,
      overallStatus: assuredOverallStatus,
      workflows,
      collection: {
        ...health.collection,
        latestFailureAt: latestCollectionFailure?.created_at ?? null,
        latestFailureMessage: latestCollectionFailure?.error_message ?? null,
      },
      assurance: {
        enabled: assuranceFresh,
        intervalMinutes: 15,
        retentionDays: 90,
        snapshots24h: snapshotRows.length,
        latestSnapshotAt,
        activeIncidents: incidentRows.map((incident) => ({
          id: incident.id,
          incidentKey: incident.incident_key,
          status: incident.status,
          severity: incident.severity,
          title: incident.title,
          message: incident.message,
          firstDetectedAt: incident.first_detected_at,
          lastDetectedAt: incident.last_detected_at,
          occurrenceCount: incident.occurrence_count,
          resolvedAt: incident.resolved_at,
          remediationHref: typeof incident.metadata?.remediationHref === "string" ? incident.metadata.remediationHref : null,
        })),
        components: (componentStates.data ?? []).map((component) => ({
          componentKey: component.component_key,
          componentType: component.component_type,
          label: component.label,
          healthStatus: component.health_status,
          message: component.message,
          remediationHref: component.remediation_href,
          consecutiveFailures: component.consecutive_failures,
          consecutiveSuccesses: component.consecutive_successes,
          firstFailedAt: component.first_failed_at,
          lastCheckedAt: component.last_checked_at,
          lastChangedAt: component.last_changed_at,
        })),
        recentTrend: snapshotRows.slice(0, 24).reverse().map((snapshot) => ({
          capturedAt: snapshot.captured_at,
          status: snapshot.overall_status,
        })),
      },
    } satisfies AiAutomationHealth,
    source: "supabase",
  });
}
