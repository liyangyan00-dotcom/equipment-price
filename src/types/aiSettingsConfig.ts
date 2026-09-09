export type AiOperationMode = "conservative" | "balanced" | "aggressive";

export type AiSettingsCore = {
  operationMode: AiOperationMode;
  autoApproveThreshold: number;
  humanReviewThreshold: number;
  priceDeviationThreshold: number;
  boqMatchThreshold: number;
  riskAlertEnabled: boolean;
  mandatoryHumanReview: boolean;
  configVersion: number;
  updatedAt: string | null;
};

export type AiModelConfig = {
  key: string;
  name: string;
  provider: string;
  model: string;
  mode: string;
  threshold: number;
  description: string;
  enabled: boolean;
  sortOrder: number;
};

export type AiRiskRuleConfig = {
  key: string;
  title: string;
  condition: string;
  action: string;
  severity: "low" | "medium" | "high" | "critical";
  enabled: boolean;
  sortOrder: number;
};

export type AiReviewPolicyConfig = {
  key: string;
  title: string;
  required: boolean;
  enabled: boolean;
  sortOrder: number;
};

export type AiPromptConfig = {
  key: string;
  name: string;
  version: string;
  scope: string;
  content: string;
  enabled: boolean;
  sortOrder: number;
};

export type AiTaskConfig = {
  key: string;
  name: string;
  owner: string;
  enabled: boolean;
  sortOrder: number;
};

export type AiProviderOption = {
  code: string;
  name: string;
  provider: string;
  status: string;
  credentialState: string;
};

export type AiSettingsPayload = {
  settings: AiSettingsCore;
  models: AiModelConfig[];
  riskRules: AiRiskRuleConfig[];
  reviewPolicies: AiReviewPolicyConfig[];
  prompts: AiPromptConfig[];
  tasks: AiTaskConfig[];
};

export type AiSettingsResponse = AiSettingsPayload & {
  organization: { id: string; name: string } | null;
  canManage: boolean;
  currentRole: string;
  providers: AiProviderOption[];
};
