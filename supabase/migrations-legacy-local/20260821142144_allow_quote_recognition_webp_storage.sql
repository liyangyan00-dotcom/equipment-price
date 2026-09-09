update storage.buckets
set allowed_mime_types = array(
  select distinct mime_type
  from unnest(coalesce(allowed_mime_types, '{}'::text[]) || array['image/webp']) as mime_type
)
where id = 'business-documents';
