export type EquipmentPriceCreateAction = "draft" | "submit_review";

export type EquipmentTechnicalParameter = {
  id: string;
  name: string;
  value: string;
  unit: string;
  required: boolean;
};

export type EquipmentEvidenceInput = {
  id?: string;
  bucket: string;
  path: string;
  name: string;
  contentType: string;
  size: number;
  evidenceType: string;
  status?: "active" | "archived";
  verificationStatus?: "pending" | "verified" | "rejected";
  description?: string;
  documentDate?: string;
  validUntil?: string;
  createdAt?: string;
};

export type EquipmentPriceCreatePayload = {
  id?: string;
  action: EquipmentPriceCreateAction;
  equipmentName: string;
  brand: string;
  model: string;
  category: string;
  unit: string;
  originalPrice: number;
  originalCurrency: string;
  exchangeRate: number;
  usdPrice: number;
  priceTerm: string;
  quoteDate: string;
  validUntil: string;
  taxStatus: string;
  deliveryCycle: string;
  priceBoundary: string;
  supplierId: string;
  sourceType: string;
  sourceUrl: string;
  inquiryCode: string;
  technicalParameters: EquipmentTechnicalParameter[];
  confidence: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  aiJudgment: string;
  aiRecommendation: string;
  evidence: EquipmentEvidenceInput[];
};

export type EquipmentPriceCreateResponse = {
  data: {
    id: string;
    priceCode: string;
    reviewStatus: string;
    reviewId?: string;
  };
  source: "supabase";
};

export type EquipmentPriceEditData = {
  id: string;
  priceCode: string;
  reviewStatus: string;
  reviewId?: string;
  reviewTaskStatus?: string;
  reviewComment?: string;
  equipmentName: string;
  brand: string;
  model: string;
  category: string;
  unit: string;
  originalPrice: number;
  originalCurrency: string;
  exchangeRate: number;
  usdPrice: number;
  priceTerm: string;
  quoteDate: string;
  validUntil: string;
  taxStatus: string;
  deliveryCycle: string;
  priceBoundary: string;
  supplierId: string;
  supplierName: string;
  sourceType: string;
  sourceUrl: string;
  inquiryCode: string;
  technicalParameters: EquipmentTechnicalParameter[];
  confidence: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  aiJudgment: string;
  aiRecommendation: string;
  evidence: EquipmentEvidenceInput[];
  updatedAt: string;
};
