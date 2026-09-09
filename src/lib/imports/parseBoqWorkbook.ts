import "server-only";

import readExcelFile from "read-excel-file/node";
import { parse as parseCsv } from "csv-parse/sync";

type Cell = string | number | boolean | Date | null | undefined;

export type ParsedBoqItem = {
  boqCode: string;
  lineNo: number;
  itemName: string;
  specification: string;
  category: "equipment" | "material" | "service";
  quantity: number;
  unit: string;
};

const aliases = {
  code: ["boq编号", "项目编号", "清单编号", "编号", "code", "itemcode"],
  name: ["项目名称", "设备名称", "材料名称", "名称", "description", "itemname"],
  specification: ["规格型号", "型号规格", "规格", "型号", "specification", "model"],
  category: ["分类", "类别", "设备类别", "材料类别", "category"],
  quantity: ["数量", "工程量", "qty", "quantity"],
  unit: ["单位", "unit"],
} as const;

function normalize(value: Cell) {
  return String(value ?? "").normalize("NFKC").trim();
}

function key(value: Cell) {
  return normalize(value).toLowerCase().replace(/[\s_\-—–/\\()[\]（）【】.:：]+/g, "");
}

function column(headers: Cell[], field: keyof typeof aliases) {
  return headers.findIndex((header) => aliases[field].some((alias) => {
    const headerKey = key(header);
    const aliasKey = key(alias);
    return headerKey === aliasKey || (headerKey.length >= 4 && headerKey.includes(aliasKey));
  }));
}

function number(value: Cell, fallback = 1) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(normalize(value).replace(/[,\s]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function category(value: Cell, name: string): ParsedBoqItem["category"] {
  const text = `${normalize(value)} ${name}`;
  if (/材料|地材|钢|水泥|砂|石|电缆|管材/i.test(text)) return "material";
  if (/服务|安装|运输|调试|人工/i.test(text)) return "service";
  return "equipment";
}

export async function parseBoqWorkbook(bytes: Uint8Array, fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  let rows: Cell[][];
  if (extension === "csv") {
    rows = parseCsv(Buffer.from(bytes), { skip_empty_lines: true, relax_column_count: true }) as Cell[][];
  } else if (extension === "xlsx") {
    const sheets = await readExcelFile(Buffer.from(bytes));
    rows = (sheets[0]?.data ?? []) as Cell[][];
  } else {
    throw new Error("仅支持 .xlsx 与 .csv BOQ 文件");
  }
  if (rows.length < 2) throw new Error("BOQ 文件没有可解析的行项目");

  let headerIndex = 0;
  let bestScore = -1;
  rows.slice(0, 20).forEach((row, index) => {
    const score = (Object.keys(aliases) as (keyof typeof aliases)[])
      .filter((field) => column(row, field) >= 0).length;
    if (score > bestScore) {
      bestScore = score;
      headerIndex = index;
    }
  });
  if (bestScore < 2) throw new Error("未识别到 BOQ 表头，请至少包含名称、数量或规格字段");

  const headers = rows[headerIndex];
  const indices = {
    code: column(headers, "code"),
    name: column(headers, "name"),
    specification: column(headers, "specification"),
    category: column(headers, "category"),
    quantity: column(headers, "quantity"),
    unit: column(headers, "unit"),
  };

  const items = rows.slice(headerIndex + 1).flatMap((row, offset) => {
    const itemName = normalize(row[indices.name]);
    if (!itemName) return [];
    const lineNo = offset + 1;
    return [{
      boqCode: normalize(row[indices.code]) || `BOQ-${String(lineNo).padStart(4, "0")}`,
      lineNo,
      itemName,
      specification: normalize(row[indices.specification]),
      category: category(row[indices.category], itemName),
      quantity: number(row[indices.quantity]),
      unit: normalize(row[indices.unit]) || "项",
    } satisfies ParsedBoqItem];
  });

  if (!items.length) throw new Error("BOQ 文件未发现有效行项目");
  return items.slice(0, 5000);
}
