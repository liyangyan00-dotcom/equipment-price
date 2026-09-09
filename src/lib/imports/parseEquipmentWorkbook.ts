import "server-only";

import { createHash } from "node:crypto";
import readExcelFile from "read-excel-file/node";
import { parse as parseCsv } from "csv-parse/sync";
import type {
  EquipmentImportMapping,
  EquipmentImportMappingStatus,
  EquipmentImportRow,
} from "@/types/equipmentImport";

type CellValue = string | number | boolean | Date | null | undefined;
type SheetData = {
  sheet: string;
  data: CellValue[][];
};

type SystemField =
  | "equipment_name"
  | "model"
  | "brand"
  | "category"
  | "original_price"
  | "original_currency"
  | "supplier_name"
  | "quote_date"
  | "price_term"
  | "ignore";

type FieldDefinition = {
  field: SystemField;
  required: boolean;
  aliases: string[];
};

const MAX_ROWS = 5000;

const fieldDefinitions: FieldDefinition[] = [
  {
    field: "equipment_name",
    required: true,
    aliases: ["设备名称", "设备名", "产品名称", "产品", "名称", "equipmentname", "equipment", "itemdescription", "description"],
  },
  {
    field: "model",
    required: true,
    aliases: ["规格型号", "型号规格", "型号", "规格", "model", "specification", "spec"],
  },
  {
    field: "brand",
    required: false,
    aliases: ["品牌", "制造商品牌", "brand", "make"],
  },
  {
    field: "category",
    required: true,
    aliases: ["设备类别", "设备分类", "产品类别", "类别", "category", "equipmentcategory"],
  },
  {
    field: "original_price",
    required: true,
    aliases: ["原始价格", "含税单价", "报价单价", "设备单价", "单价", "报价", "价格", "unitprice", "quotedprice", "price"],
  },
  {
    field: "original_currency",
    required: true,
    aliases: ["币种", "货币", "currency", "currencycode"],
  },
  {
    field: "supplier_name",
    required: true,
    aliases: ["供应商名称", "供应商", "厂家名称", "厂家", "制造商", "suppliername", "supplier", "manufacturer", "vendor"],
  },
  {
    field: "quote_date",
    required: true,
    aliases: ["报价日期", "询价日期", "价格日期", "日期", "quotedate", "pricedate", "date"],
  },
  {
    field: "price_term",
    required: false,
    aliases: ["价格条件", "贸易术语", "交货条件", "priceterm", "incoterm", "deliveryterm"],
  },
];

function normalizeHeader(value: CellValue) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s_\-—–/\\()[\]（）【】.:：]+/g, "");
}

function stringifyCell(value: CellValue) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }
  return String(value ?? "").trim();
}

function fieldMatch(header: CellValue) {
  const normalized = normalizeHeader(header);
  if (!normalized) return null;

  let best:
    | {
        field: SystemField;
        confidence: number;
        required: boolean;
      }
    | undefined;

  for (const definition of fieldDefinitions) {
    for (const alias of definition.aliases) {
      const normalizedAlias = normalizeHeader(alias);
      const exact = normalized === normalizedAlias;
      const partial =
        normalized.length >= 4 &&
        normalizedAlias.length >= 4 &&
        (normalized.includes(normalizedAlias) ||
          normalizedAlias.includes(normalized));
      const confidence = exact ? 100 : partial ? 86 : 0;

      if (confidence > (best?.confidence ?? 0)) {
        best = {
          field: definition.field,
          confidence,
          required: definition.required,
        };
      }
    }
  }

  return best ?? null;
}

function detectHeaderRow(rows: CellValue[][]) {
  let best = {
    index: 0,
    score: -1,
    matched: 0,
    fields: new Set<SystemField>(),
  };

  rows.slice(0, 20).forEach((row, index) => {
    const matches = row.map(fieldMatch).filter(Boolean);
    const uniqueFields = new Set(matches.map((match) => match?.field));
    const requiredMatches = matches.filter((match) => match?.required).length;
    const score = uniqueFields.size * 10 + requiredMatches * 4;

    if (score > best.score) {
      best = {
        index,
        score,
        matched: uniqueFields.size,
        fields: new Set(
          [...uniqueFields].filter((field): field is SystemField =>
            Boolean(field)
          )
        ),
      };
    }
  });

  if (
    best.matched < 2 ||
    (!best.fields.has("equipment_name") &&
      !best.fields.has("original_price"))
  ) {
    throw new Error("未识别到有效表头，请确认文件包含设备名称、价格或供应商等字段。");
  }

  return best.index;
}

function buildMappings(headers: CellValue[], firstDataRow: CellValue[]) {
  const usedFields = new Set<SystemField>();

  return headers
    .map((header, index): EquipmentImportMapping | null => {
      const sourceField = stringifyCell(header);
      if (!sourceField) return null;

      const match = fieldMatch(header);
      const isDuplicateMapping = Boolean(
        match && match.field !== "ignore" && usedFields.has(match.field)
      );
      if (match && !isDuplicateMapping) {
        usedFields.add(match.field);
      }
      const confidence = isDuplicateMapping ? 0 : (match?.confidence ?? 0);
      const status: EquipmentImportMappingStatus = match && !isDuplicateMapping
        ? confidence >= 90
          ? "mapped"
          : "warning"
        : "unmapped";

      return {
        id: `map-${index + 1}`,
        sourceField,
        systemField:
          match && !isDuplicateMapping ? match.field : "ignore",
        sampleValue: stringifyCell(firstDataRow[index]),
        confidence,
        status,
        required: match?.required ?? false,
      };
    })
    .filter((mapping): mapping is EquipmentImportMapping => Boolean(mapping));
}

function parseNumber(value: CellValue) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const normalized = stringifyCell(value)
    .replace(/[,\s]/g, "")
    .replace(/^(USD|CNY|RMB|EUR|GBP|ZAR|CDF|¥|￥|\$|€|£)/i, "")
    .replace(/(USD|CNY|RMB|EUR|GBP|ZAR|CDF)$/i, "");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function parseDate(value: CellValue) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const text = stringifyCell(value);
  if (!text) return "";

  const normalized = text.replace(/[./年]/g, "-").replace(/月/g, "-").replace(/日/g, "");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? text : date.toISOString().slice(0, 10);
}

function valueByField(
  row: CellValue[],
  mappings: EquipmentImportMapping[],
  field: SystemField
) {
  const mapping = mappings.find((item) => item.systemField === field);
  if (!mapping) return null;
  const index = Number(mapping.id.replace("map-", "")) - 1;
  return row[index] ?? null;
}

function normalizeCurrency(value: CellValue) {
  const text = stringifyCell(value).toUpperCase();
  if (["￥", "¥", "RMB"].includes(text)) return "CNY";
  if (text === "$") return "USD";
  if (text === "€") return "EUR";
  return text;
}

function isDateLike(value: string) {
  if (!value) return false;
  return !Number.isNaN(new Date(value).getTime());
}

function buildRows(
  dataRows: CellValue[][],
  mappings: EquipmentImportMapping[],
  headerRowIndex: number
) {
  const seen = new Map<string, number>();

  return dataRows
    .slice(0, MAX_ROWS)
    .map((row, index): EquipmentImportRow | null => {
      if (row.every((cell) => stringifyCell(cell) === "")) return null;

      const equipmentName = stringifyCell(
        valueByField(row, mappings, "equipment_name")
      );
      const model = stringifyCell(valueByField(row, mappings, "model"));
      const brand = stringifyCell(valueByField(row, mappings, "brand"));
      const category = stringifyCell(valueByField(row, mappings, "category"));
      const originalPrice = parseNumber(
        valueByField(row, mappings, "original_price")
      );
      const currency = normalizeCurrency(
        valueByField(row, mappings, "original_currency")
      );
      const supplier = stringifyCell(
        valueByField(row, mappings, "supplier_name")
      );
      const quoteDate = parseDate(valueByField(row, mappings, "quote_date"));
      const issues: string[] = [];

      if (!equipmentName) issues.push("设备名称为空");
      if (!model) issues.push("规格型号为空");
      if (!category) issues.push("设备类别为空");
      if (originalPrice <= 0) issues.push("价格为空或不是有效数字");
      if (!currency) issues.push("币种为空");
      if (!supplier) issues.push("供应商为空");
      if (!quoteDate) {
        issues.push("报价日期为空");
      } else if (!isDateLike(quoteDate)) {
        issues.push("报价日期格式无法识别");
      }

      const duplicateKey = [
        equipmentName,
        model,
        supplier,
        originalPrice,
        currency,
      ]
        .map((item) => String(item).trim().toLowerCase())
        .join("|");
      const duplicateOf = duplicateKey.replaceAll("|", "")
        ? seen.get(duplicateKey)
        : undefined;
      if (duplicateOf) {
        issues.push(`与第 ${duplicateOf} 行数据重复`);
      } else if (duplicateKey.replaceAll("|", "")) {
        seen.set(duplicateKey, headerRowIndex + index + 2);
      }

      const errorCount = issues.filter((issue) =>
        /名称为空|价格为空|币种为空/.test(issue)
      ).length;
      const status = duplicateOf
        ? "duplicate"
        : errorCount > 0
          ? "error"
          : issues.length > 0
            ? "warning"
            : "valid";
      const confidence = Math.max(
        35,
        Math.min(99, 98 - errorCount * 22 - (issues.length - errorCount) * 9)
      );

      return {
        id: `row-${headerRowIndex + index + 2}`,
        rowNumber: headerRowIndex + index + 2,
        equipmentName,
        model,
        brand,
        category,
        originalPrice,
        currency,
        supplier,
        quoteDate,
        status,
        confidence,
        issues,
        selected: status === "valid" || status === "warning",
      };
    })
    .filter((row): row is EquipmentImportRow => Boolean(row));
}

async function readCsv(buffer: Buffer): Promise<SheetData[]> {
  const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
  const data = parseCsv(text, {
    bom: true,
    columns: false,
    relax_column_count: true,
    skip_empty_lines: false,
    trim: true,
  }) as CellValue[][];
  return [{ sheet: "CSV", data }];
}

async function readWorkbook(buffer: Buffer, fileName: string) {
  if (/\.csv$/i.test(fileName)) {
    return readCsv(buffer);
  }
  if (!/\.xlsx$/i.test(fileName)) {
    throw new Error("当前支持 .xlsx 和 .csv 文件；旧版 .xls 请先另存为 .xlsx。");
  }

  return (await readExcelFile(buffer)) as SheetData[];
}

export async function parseEquipmentWorkbook(
  buffer: Buffer,
  fileName: string,
  preferredSheet?: string,
  mappingOverrides?: Record<string, string>
) {
  const sheets = await readWorkbook(buffer, fileName);
  const candidates = sheets.filter((sheet) =>
    sheet.data.some((row) => row.some((cell) => stringifyCell(cell) !== ""))
  );

  if (candidates.length === 0) {
    throw new Error("工作簿中没有可解析的数据。");
  }

  const selected =
    candidates.find((sheet) => sheet.sheet === preferredSheet) ?? candidates[0];
  const headerRowIndex = detectHeaderRow(selected.data);
  const headers = selected.data[headerRowIndex] ?? [];
  const firstDataRow = selected.data[headerRowIndex + 1] ?? [];
  const mappings = buildMappings(headers, firstDataRow).map((mapping) => {
    const systemField = mappingOverrides?.[mapping.sourceField];
    if (!systemField) return mapping;
    return {
      ...mapping,
      systemField,
      confidence: 100,
      status: systemField === "ignore" ? "unmapped" as const : "mapped" as const,
      userModified: true,
    };
  });
  const rows = buildRows(
    selected.data.slice(headerRowIndex + 1),
    mappings,
    headerRowIndex
  );
  const mappedMappings = mappings.filter(
    (mapping) => mapping.status !== "unmapped"
  );
  const mappingConfidence = mappedMappings.length
    ? Math.round(
        mappedMappings.reduce(
          (sum, mapping) => sum + mapping.confidence,
          0
        ) / mappedMappings.length
      )
    : 0;

  return {
    mappings,
    rows,
    selectedSheet: selected.sheet,
    headerRow: headerRowIndex + 1,
    mappingConfidence,
    sheets: candidates.map((sheet) => ({
      name: sheet.sheet,
      rowCount: sheet.data.length,
      selected: sheet.sheet === selected.sheet,
    })),
    truncated: selected.data.length - headerRowIndex - 1 > MAX_ROWS,
    fileHash: createHash("sha256").update(buffer).digest("hex"),
  };
}
