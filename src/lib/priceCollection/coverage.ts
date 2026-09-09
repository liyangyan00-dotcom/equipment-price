export type CoverageTarget = { name: string; specification: string; region: string };
export type CoveragePlan = {
  projectId: string;
  from: string;
  to: string;
  targets: CoverageTarget[];
};
export type CoverageLead = CoverageTarget & {
  id: string; quote_date: string | null; status: string;
  price_validity_status: string; evidence_code: string | null;
};
export type CoverageCell = CoverageTarget & {
  month: string; collected: number; pending: number; ready: number;
  transferred: number; rejected: number; incomplete: number; leadIds: string[];
};
const clean = (value: string) => value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
const key = (target: CoverageTarget) => JSON.stringify([target.name, target.specification, target.region].map(clean));
export function monthNumber(value: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return null;
  return Number(value.slice(0, 4)) * 12 + Number(value.slice(5)) - 1;
}
export function validateCoveragePlan(value: unknown): CoveragePlan {
  if (!value || typeof value !== "object") throw new Error("覆盖计划格式错误");
  const plan = value as CoveragePlan;
  const from = typeof plan.from === "string" ? monthNumber(plan.from) : null;
  const to = typeof plan.to === "string" ? monthNumber(plan.to) : null;
  if (from === null || to === null || from > to || to - from >= 36) throw new Error("请选择连续 1 至 36 个月");
  if (typeof plan.projectId !== "string" || (plan.projectId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(plan.projectId))) throw new Error("项目编号无效");
  if (!Array.isArray(plan.targets) || !plan.targets.length || plan.targets.length > 100) throw new Error("请配置 1 至 100 个覆盖对象");
  const targets = plan.targets.map((target) => {
    if (!target || [target.name, target.specification, target.region].some((value) => typeof value !== "string" || !value.trim() || value.length > 200)) throw new Error("名称、规格、地区均为必填，且不超过 200 字");
    return { name: target.name.trim(), specification: target.specification.trim(), region: target.region.trim() };
  });
  if (new Set(targets.map(key)).size !== targets.length) throw new Error("覆盖对象存在重复组合");
  return { projectId: plan.projectId, from: plan.from, to: plan.to, targets };
}
export function buildCoverage(plan: CoveragePlan, leads: CoverageLead[]) {
  const validated = validateCoveragePlan(plan);
  const cells: CoverageCell[] = [];
  const byKey = new Map<string, CoverageCell>();
  for (let index = monthNumber(validated.from)!; index <= monthNumber(validated.to)!; index++) {
    const month = `${Math.floor(index / 12).toString().padStart(4, "0")}-${(index % 12 + 1).toString().padStart(2, "0")}`;
    for (const target of validated.targets) {
      const cell = { ...target, month, collected: 0, pending: 0, ready: 0, transferred: 0, rejected: 0, incomplete: 0, leadIds: [] };
      cells.push(cell);
      byKey.set(month + key(target), cell);
    }
  }
  let unknownDate = 0;
  const targets = new Set(validated.targets.map(key));
  const seen = new Set<string>();
  for (const lead of leads) {
    if (seen.has(lead.id) || !targets.has(key(lead))) continue;
    seen.add(lead.id);
    const date = lead.quote_date || "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) { unknownDate++; continue; }
    const cell = byKey.get(date.slice(0, 7) + key(lead));
    if (!cell) continue;
    cell.collected++;
    cell.leadIds.push(lead.id);
    if (lead.status === "rejected") cell.rejected++;
    else if (lead.price_validity_status !== "valid" || !lead.evidence_code) cell.incomplete++;
    else if (lead.status === "transferred") cell.transferred++;
    else if (lead.status === "ready") cell.ready++;
    else cell.pending++;
  }
  return { cells, unknownDate, total: cells.length, collected: cells.filter((cell) => cell.collected > 0).length, reviewed: cells.filter((cell) => cell.ready + cell.transferred > 0).length };
}
