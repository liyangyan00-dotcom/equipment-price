type JsonObject = Record<string, unknown>;

export type ReportChapter = {
  title: string;
  summary: string;
  findings: string[];
  evidenceRefs: string[];
};

function object(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject
    : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : [];
}

export function reportOutline(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(text).filter(Boolean).slice(0, 50)
    : [];
}

export function reportChapters(contentValue: unknown): ReportChapter[] {
  const content = object(contentValue);
  const aiOutput = object(content.aiOutput);
  if (!Array.isArray(aiOutput.chapters)) return [];
  return aiOutput.chapters.map((value) => {
    const chapter = object(value);
    return {
      title: text(chapter.title),
      summary: text(chapter.summary),
      findings: stringList(chapter.findings),
      evidenceRefs: stringList(chapter.evidenceRefs),
    };
  });
}

export function validateReportCompleteness(outlineValue: unknown, contentValue: unknown) {
  const outline = reportOutline(outlineValue);
  const chapters = reportChapters(contentValue);
  const errors: string[] = [];

  if (!outline.length) errors.push("报告至少需要一个章节");
  if (chapters.length !== outline.length) {
    errors.push(`章节正文数量应为 ${outline.length}，当前为 ${chapters.length}`);
  }

  outline.forEach((title, index) => {
    const chapter = chapters[index];
    if (!chapter) return;
    if (chapter.title !== title) errors.push(`第 ${index + 1} 章标题与模板不一致`);
    if (chapter.summary.length < 10) errors.push(`第 ${index + 1} 章“${title}”正文不足 10 个字符`);
    const rawChapter = object(object(contentValue).aiOutput);
    const raw = Array.isArray(rawChapter.chapters) ? object(rawChapter.chapters[index]) : {};
    if (!Array.isArray(raw.findings)) errors.push(`第 ${index + 1} 章缺少结论清单`);
    if (!Array.isArray(raw.evidenceRefs)) errors.push(`第 ${index + 1} 章缺少证据引用清单`);
  });

  return { valid: errors.length === 0, errors, outline, chapters };
}

export const requiredReportReviewChecks = [
  "dataSources",
  "confidence",
  "risks",
  "evidence",
  "chapters",
] as const;

export function validateReviewChecklist(value: unknown) {
  const checklist = object(value);
  const missing = requiredReportReviewChecks.filter((key) => checklist[key] !== true);
  return { valid: missing.length === 0, missing, checklist };
}
