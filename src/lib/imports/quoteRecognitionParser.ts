import "server-only";

import { parse as parseCsv } from "csv-parse/sync";
import readXlsxFile from "read-excel-file/node";
import type { QuoteItemType, QuoteRiskLevel } from "@/types/quoteRecognition";

type Cell = string | number | boolean | Date | null;

export type ParsedQuoteItem = {
  lineNumber: number;
  itemType: QuoteItemType;
  itemCode: string;
  itemName: string;
  brand: string;
  specification: string;
  category: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  currency: string;
  region: string;
  priceCondition: string;
  supplierName: string;
  confidence: number;
  riskLevel: QuoteRiskLevel;
  missingFields: string[];
  rawData: Record<string, unknown>;
  evidence: {
    pageNumber: number;
    sourceKind: "spreadsheet_row";
    extractionMethod: "spreadsheet";
    sourceText: string;
    confidence: number;
    bbox: { x: number; y: number; width: number; height: number };
  };
};

const aliases = {
  itemCode: ["编号", "序号", "物料编码", "设备编号", "itemcode", "code", "no"],
  itemName: ["设备名称", "材料名称", "产品名称", "品名", "名称", "itemname", "productname", "description"],
  brand: ["品牌", "制造商", "brand", "manufacturer"],
  specification: ["规格型号", "规格", "型号", "参数", "specification", "spec", "model"],
  category: ["设备类别", "材料类别", "分类", "类别", "category", "type"],
  unit: ["单位", "计量单位", "unit", "uom"],
  quantity: ["数量", "工程量", "qty", "quantity"],
  unitPrice: ["含税单价", "未税单价", "报价单价", "单价", "报价", "价格", "unitprice", "price"],
  totalPrice: ["合价", "总价", "金额", "totalprice", "amount", "total"],
  currency: ["币种", "货币", "currency"],
  region: ["地区", "区域", "交货地", "region", "location"],
  priceCondition: ["价格条件", "贸易术语", "pricecondition", "incoterm", "term"],
  supplierName: ["供应商", "供应商名称", "厂商", "supplier", "vendor"],
  itemType: ["对象类型", "物资类型", "价格类型", "itemtype"],
} as const;

type FieldKey = keyof typeof aliases;

function keyText(value: Cell) {
  return String(value ?? "").normalize("NFKC").toLowerCase().replace(/[\s_\-\/（）()]+/g, "");
}

function text(value: Cell, max = 300) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? "").trim().slice(0, max);
}

function numberValue(value: Cell, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const normalized = String(value ?? "")
    .replace(/[,，\s]/g, "")
    .replace(/^(cny|rmb|usd|eur|zar|人民币|￥|¥|\$)/i, "")
    .replace(/[^0-9.\-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function detectHeader(rows: Cell[][]) {
  let bestIndex = 0;
  let bestScore = -1;
  for (let rowIndex = 0; rowIndex < Math.min(rows.length, 12); rowIndex += 1) {
    const keys = rows[rowIndex].map(keyText);
    const score = Object.values(aliases).filter((choices) =>
      keys.some((key) => choices.some((choice) => key.includes(keyText(choice))))
    ).length;
    if (score > bestScore) {
      bestIndex = rowIndex;
      bestScore = score;
    }
  }
  return { index: bestIndex, score: bestScore };
}

function mapColumns(header: Cell[]) {
  const mapping = new Map<FieldKey, number>();
  header.forEach((cell, index) => {
    const normalized = keyText(cell);
    for (const [field, choices] of Object.entries(aliases) as Array<[FieldKey, readonly string[]]>) {
      if (!mapping.has(field) && choices.some((choice) => normalized.includes(keyText(choice)))) {
        mapping.set(field, index);
      }
    }
  });
  return mapping;
}

function inferType(explicit: string, name: string, category: string): QuoteItemType {
  const combined = `${explicit} ${name} ${category}`.toLowerCase();
  return /(材料|地材|钢筋|水泥|砂|石|管材|板材|电缆|material)/i.test(combined)
    ? "material"
    : "equipment";
}

function riskRank(risk: QuoteRiskLevel) {
  return { low: 0, medium: 1, high: 2, critical: 3 }[risk];
}

export async function parseQuoteFile(input: {
  fileName: string;
  mimeType: string;
  bytes: ArrayBuffer;
}) {
  const extension = input.fileName.split(".").pop()?.toLowerCase();
  let rows: Cell[][];
  if (extension === "csv" || input.mimeType.includes("csv")) {
    const content = new TextDecoder("utf-8").decode(input.bytes);
    rows = parseCsv(content, { bom: true, relax_column_count: true, skip_empty_lines: true }) as Cell[][];
  } else if (extension === "xlsx") {
    rows = await readXlsxFile(Buffer.from(input.bytes)) as unknown as Cell[][];
  } else {
    throw new Error("当前真实结构化识别支持 .xlsx 和 .csv；PDF/图片需配置具备文档视觉能力的 AI Provider");
  }

  if (rows.length < 2) throw new Error("报价文件没有可识别的数据行");
  const header = detectHeader(rows);
  const mapping = mapColumns(rows[header.index]);
  if (!mapping.has("itemName") || (!mapping.has("unitPrice") && !mapping.has("totalPrice"))) {
    throw new Error("未找到名称与价格列，请确认文件首部包含设备/材料名称和单价或总价");
  }

  const valueAt = (row: Cell[], key: FieldKey) => {
    const index = mapping.get(key);
    return index === undefined ? null : row[index] ?? null;
  };
  const parsed: ParsedQuoteItem[] = [];
  rows.slice(header.index + 1, header.index + 501).forEach((row, offset) => {
    const itemName = text(valueAt(row, "itemName"), 200);
    const unitPriceRaw = numberValue(valueAt(row, "unitPrice"));
    const quantity = Math.max(0.0001, numberValue(valueAt(row, "quantity"), 1));
    const totalPriceRaw = numberValue(valueAt(row, "totalPrice"));
    const unitPrice = unitPriceRaw > 0 ? unitPriceRaw : totalPriceRaw > 0 ? totalPriceRaw / quantity : 0;
    if (!itemName && unitPrice <= 0) return;

    const category = text(valueAt(row, "category"), 100);
    const itemType = inferType(text(valueAt(row, "itemType")), itemName, category);
    const unit = text(valueAt(row, "unit"), 40);
    const missingFields = [
      !itemName ? "itemName" : "",
      unitPrice <= 0 ? "unitPrice" : "",
      itemType === "material" && !unit ? "unit" : "",
    ].filter(Boolean);
    let confidence = 96;
    confidence -= missingFields.length * 24;
    if (!text(valueAt(row, "specification"))) confidence -= 7;
    if (!text(valueAt(row, "supplierName"))) confidence -= 5;
    confidence = Math.max(20, Math.min(99, confidence));
    const riskLevel: QuoteRiskLevel = missingFields.length >= 2
      ? "high"
      : missingFields.length === 1 || confidence < 75
        ? "medium"
        : "low";
    const rawData = Object.fromEntries(rows[header.index].map((cell, index) => [text(cell) || `column_${index + 1}`, row[index] ?? null]));

    parsed.push({
      lineNumber: header.index + offset + 2,
      itemType,
      itemCode: text(valueAt(row, "itemCode"), 80),
      itemName: itemName || `未命名行项目 ${header.index + offset + 2}`,
      brand: text(valueAt(row, "brand"), 120),
      specification: text(valueAt(row, "specification"), 200),
      category,
      unit,
      quantity,
      unitPrice: Math.max(0, unitPrice),
      totalPrice: totalPriceRaw > 0 ? totalPriceRaw : Math.max(0, unitPrice * quantity),
      currency: text(valueAt(row, "currency"), 12).toUpperCase() || "CNY",
      region: text(valueAt(row, "region"), 100),
      priceCondition: text(valueAt(row, "priceCondition"), 80),
      supplierName: text(valueAt(row, "supplierName"), 160),
      confidence,
      riskLevel,
      missingFields,
      rawData,
      evidence: {
        pageNumber: 1,
        sourceKind: "spreadsheet_row",
        extractionMethod: "spreadsheet",
        sourceText: row.map((cell) => text(cell, 120)).filter(Boolean).join(" | ").slice(0, 4000),
        confidence,
        bbox: {
          x: 0,
          y: Math.min(0.99, (header.index + offset + 1) / Math.max(rows.length, 1)),
          width: 1,
          height: Math.max(0.001, Math.min(0.08, 1 / Math.max(rows.length, 1))),
        },
      },
    });
  });

  if (!parsed.length) throw new Error("报价文件没有可入审核池的有效行项目");
  const allMissing = [...new Set(parsed.flatMap((item) => item.missingFields))];
  const highestRisk = parsed.reduce<QuoteRiskLevel>((current, item) =>
    riskRank(item.riskLevel) > riskRank(current) ? item.riskLevel : current, "low");
  return {
    items: parsed,
    summary: {
      headerRow: header.index + 1,
      mappedFields: Object.fromEntries(mapping),
      rowCount: parsed.length,
      totalAmount: parsed.reduce((sum, item) => sum + item.totalPrice, 0),
      overallConfidence: parsed.reduce((sum, item) => sum + item.confidence, 0) / parsed.length,
      missingFields: allMissing,
      riskLevel: highestRisk,
    },
  };
}
