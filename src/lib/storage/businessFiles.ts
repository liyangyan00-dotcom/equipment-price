import type { SupabaseClient } from "@supabase/supabase-js";

export type BusinessBucket = "business-documents" | "report-exports";

function sanitizeSegment(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildBusinessObjectPath(
  organizationId: string,
  category: string,
  fileName: string
) {
  return `${organizationId}/${sanitizeSegment(category)}/${crypto.randomUUID()}-${sanitizeSegment(fileName)}`;
}

export async function uploadBusinessFile(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    category: string;
    file: File;
    bucket?: BusinessBucket;
  }
) {
  const bucket = input.bucket ?? "business-documents";
  const path = buildBusinessObjectPath(
    input.organizationId,
    input.category,
    input.file.name
  );
  const result = await supabase.storage.from(bucket).upload(path, input.file, {
    contentType: input.file.type || undefined,
    upsert: false,
  });

  if (result.error) {
    throw result.error;
  }

  return { bucket, path };
}

export async function createBusinessFileDownload(
  supabase: SupabaseClient,
  bucket: BusinessBucket,
  path: string,
  expiresIn = 300
) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    throw error;
  }

  return data.signedUrl;
}

export async function deleteBusinessFile(
  supabase: SupabaseClient,
  bucket: BusinessBucket,
  path: string
) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    throw error;
  }
}
