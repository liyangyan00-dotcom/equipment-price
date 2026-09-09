import type {
  EquipmentAiReviewInput,
  EquipmentAiReviewOutput,
} from "@/types/equipmentAiReview";

export type EquipmentReviewProviderMetadata = {
  provider: string;
  model: string;
  promptKey: string;
  promptVersion: string;
  schemaVersion: "1.0";
};

export interface EquipmentReviewAiProvider {
  readonly metadata: EquipmentReviewProviderMetadata;
  analyze(input: EquipmentAiReviewInput): Promise<EquipmentAiReviewOutput>;
}
