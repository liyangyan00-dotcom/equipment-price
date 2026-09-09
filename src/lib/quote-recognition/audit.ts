import type { SupabaseClient } from "@supabase/supabase-js";

export const quoteEventActions = [
  "quote.uploaded",
  "quote.upload_failed",
  "quote.source_previewed",
  "quote.source_downloaded",
  "quote.parse_started",
  "quote.parse_completed",
  "quote.parse_failed",
  "quote.ai_review_queued",
  "quote.ai_review_unavailable",
  "quote.fields_saved",
  "quote.needs_info",
  "quote.rejected",
  "quote.voided",
  "quote.imported",
] as const;

export type QuoteEventAction = (typeof quoteEventActions)[number];

export async function recordQuoteEvent(
  supabase: SupabaseClient,
  input: {
    documentId: string;
    itemId?: string | null;
    action: QuoteEventAction;
    note?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  return supabase.rpc("wpi_record_quote_event", {
    target_document_id: input.documentId,
    target_item_id: input.itemId ?? null,
    event_action: input.action,
    event_note: input.note?.trim() || null,
    event_metadata: input.metadata ?? {},
  });
}
