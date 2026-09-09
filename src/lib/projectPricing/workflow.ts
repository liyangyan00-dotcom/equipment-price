export type ProjectPricingWorkflowInput = {
  hasProject: boolean;
  totalItems: number;
  matchedItems: number;
  confirmedItems: number;
  gapItems: number;
  inquiryLinkedItems: number;
  inquiryQuoteItems: number;
  matchingCompleted: boolean;
};

export type ProjectPricingWorkflowStatus = "done" | "active" | "pending";

export function getProjectPricingWorkflow(input: ProjectPricingWorkflowInput) {
  const hasItems = input.totalItems > 0;
  const matchingDone = hasItems && input.matchingCompleted;
  const reviewDone = matchingDone && input.confirmedItems >= input.matchedItems;
  const inquiryDone = matchingDone && (input.gapItems === 0 || input.inquiryLinkedItems >= input.gapItems);
  const backfillDone = matchingDone && (input.gapItems === 0 || input.inquiryQuoteItems >= input.gapItems);

  return {
    project: input.hasProject ? "done" : "active",
    upload: hasItems ? "done" : input.hasProject ? "active" : "pending",
    parse: hasItems ? "done" : "pending",
    matching: matchingDone ? "done" : hasItems ? "active" : "pending",
    review: reviewDone ? "done" : matchingDone && input.matchedItems > input.confirmedItems ? "active" : "pending",
    inquiry: inquiryDone ? "done" : matchingDone && input.gapItems > input.inquiryLinkedItems ? "active" : "pending",
    backfill: backfillDone ? "done" : matchingDone && input.inquiryLinkedItems > input.inquiryQuoteItems ? "active" : "pending",
  } satisfies Record<string, ProjectPricingWorkflowStatus>;
}
