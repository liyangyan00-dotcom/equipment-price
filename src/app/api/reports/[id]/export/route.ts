import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";
import { buildStructuredReportChapters } from "@/lib/reports/reportTemplates";

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] ?? character,
  );
}

function object(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string =>
          typeof item === "string" && Boolean(item.trim()),
      )
    : [];
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await getApiAccess();
  if (!access.ok)
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  const { id } = await context.params;
  let query = access.supabase
    .from("wpi_reports")
    .select("*")
    .eq("organization_id", access.organizationId);
  query = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)
    ? query.eq("id", id)
    : query.eq("report_code", id);
  const result = await query.maybeSingle();
  if (result.error)
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  if (!result.data)
    return NextResponse.json({ error: "报告不存在" }, { status: 404 });
  const report = result.data;
  const preview = new URL(request.url).searchParams.get("preview") === "1";
  const formallyExportable = ["approved", "archived"].includes(report.status);
  if (!formallyExportable && !preview) {
    return NextResponse.json(
      { error: "报告尚未通过人工审核，只能查看带水印预览" },
      { status: 409 },
    );
  }
  const content =
    report.content && typeof report.content === "object"
      ? (report.content as Record<string, unknown>)
      : {};
  const outline: unknown[] = Array.isArray(report.outline)
    ? report.outline
    : [];
  const aiOutput = object(content.aiOutput);
  const chapters = Array.isArray(aiOutput.chapters)
    ? aiOutput.chapters.map(object)
    : [];
  const config = object(content.config);
  const structuredChapters = buildStructuredReportChapters(
    report.report_type,
    content.dataSnapshot,
    aiOutput,
    {
      project: text(content.project) || "全项目汇总",
      period:
        text(config.startDate) && text(config.endDate)
          ? `${text(config.startDate)} 至 ${text(config.endDate)}`
          : undefined,
      source: text(config.source) || "已保存业务数据快照",
      sourceId: report.source_id,
    },
  );
  const summary =
    content.manualSummary ||
    content.executiveSummary ||
    content.summary ||
    aiOutput.summary;
  const reviewNotice =
    content.reviewNotice || "AI 生成结果必须经人工审核后发布";
  const chapterHtml = outline
    .map((item, index) => {
      const chapter =
        chapters.find(
          (candidate) => String(candidate.title) === String(item),
        ) ??
        chapters[index] ??
        {};
      const structured =
        structuredChapters.find(
          (candidate) => candidate.title === String(item),
        ) ?? structuredChapters[index];
      const chapterSummary = text(chapter.summary) || structured?.summary || "";
      const findings = stringList(chapter.findings).length
        ? stringList(chapter.findings)
        : (structured?.findings ?? []);
      const evidenceRefs = stringList(chapter.evidenceRefs).length
        ? stringList(chapter.evidenceRefs)
        : (structured?.evidenceRefs ?? []);
      const fallback =
        index === 0
          ? text(aiOutput.summary)
          : "AI 结果未返回本章专属正文，请完成人工复核与补充。";
      const metrics = structured?.metrics ?? [];
      const decisions = structured?.decisionFocus ?? [];
      const actions = structured?.actions ?? [];
      const dataLinks = structured?.dataLinks ?? [];
      return `<section><h2>${index + 1}. ${escapeHtml(item)}</h2>${structured?.leadershipQuestion ? `<div class="leadership"><strong>领导需要回答：</strong>${escapeHtml(structured.leadershipQuestion)}</div>` : ""}${metrics.length ? `<div class="metrics">${metrics.map((metric) => `<div><small>${escapeHtml(metric.label)}</small><strong>${escapeHtml(metric.value)}</strong><span>${escapeHtml(metric.interpretation)}</span></div>`).join("")}</div>` : ""}<p>${escapeHtml(chapterSummary || fallback)}</p>${findings.length ? `<ul>${findings.map((finding) => `<li>${escapeHtml(finding)}</li>`).join("")}</ul>` : ""}${decisions.length ? `<div class="decision"><strong>决策关注</strong><ul>${decisions.map((decision) => `<li>${escapeHtml(decision)}</li>`).join("")}</ul></div>` : ""}${actions.length ? `<table><thead><tr><th>优先级</th><th>管理动作</th><th>责任角色</th><th>完成时点</th></tr></thead><tbody>${actions.map((action) => `<tr><td>${escapeHtml(action.priority)}</td><td>${escapeHtml(action.action)}</td><td>${escapeHtml(action.owner)}</td><td>${escapeHtml(action.timing)}</td></tr>`).join("")}</tbody></table>` : ""}${evidenceRefs.length ? `<p class="evidence"><strong>证据引用：</strong>${evidenceRefs.map(escapeHtml).join("；")}</p>` : ""}${dataLinks.length ? `<p class="links"><strong>关联业务：</strong>${dataLinks.map((link) => `<a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`).join(" · ")}</p>` : ""}</section>`;
    })
    .join("");
  const watermark = formallyExportable
    ? ""
    : `<div class="watermark">预览 · 未经审核不得用于商务决策</div>`;
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${escapeHtml(report.title)}</title><style>body{font-family:Arial,"Microsoft YaHei",sans-serif;max-width:960px;margin:40px auto;color:#172033;line-height:1.7;font-size:13px}h1{font-size:28px}h2{font-size:19px;margin-top:0}.meta{color:#64748b}.summary{margin:24px 0;padding:16px;border-left:4px solid #0b5cad;background:#f1f6ff;white-space:pre-wrap}.leadership{padding:12px 14px;border-left:4px solid #7c3aed;background:#f5f3ff;margin:12px 0}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0}.metrics div{border:1px solid #dce3ed;padding:10px;background:#f8fafc}.metrics small,.metrics strong,.metrics span{display:block}.metrics strong{font-size:16px;color:#0b5cad}.metrics span{font-size:10px;color:#64748b}.decision{padding:12px 14px;background:#fff7e6;color:#7c4a03;margin:12px 0}table{width:100%;border-collapse:collapse;margin:12px 0;font-size:11px}th,td{border:1px solid #dce3ed;padding:7px;text-align:left}th{background:#f8fafc}.notice{padding:12px 16px;background:#fff7e6;color:#925d00}.evidence{padding:8px 12px;background:#f0fdf4;color:#166534;font-size:12px}.links{font-size:11px}.links a{color:#0b5cad}section{border-top:1px solid #dce3ed;padding:20px 0}.watermark{position:fixed;inset:45% auto auto 12%;transform:rotate(-24deg);font-size:38px;font-weight:700;color:rgba(220,38,38,.14);pointer-events:none;z-index:5}@media print{.watermark{position:fixed}}@media(max-width:700px){.metrics{grid-template-columns:repeat(2,1fr)}}</style></head><body>${watermark}<h1>${escapeHtml(report.title)}</h1><p class="meta">${escapeHtml(report.report_code)} · ${escapeHtml(report.report_type)} · 状态：${escapeHtml(report.status)}</p>${summary ? `<div class="summary"><strong>报告摘要 / 人工结论</strong><br>${escapeHtml(summary)}</div>` : ""}${chapterHtml}<p class="notice"><strong>复核说明：</strong>${escapeHtml(reviewNotice)}</p></body></html>`;
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="${report.report_code}.html"`,
      "X-Report-Export-Mode": formallyExportable
        ? "approved-print"
        : "watermarked-preview",
    },
  });
}
