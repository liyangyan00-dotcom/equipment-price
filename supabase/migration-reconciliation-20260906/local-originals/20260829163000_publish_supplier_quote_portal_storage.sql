insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'supplier-quote-portal',
  'supplier-quote-portal',
  true,
  1048576,
  array['text/html', 'application/json']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists wpi_supplier_portal_publish_once on storage.objects;
create policy wpi_supplier_portal_publish_once
on storage.objects for insert to anon
with check (
  bucket_id = 'supplier-quote-portal'
  and name in ('index.html', 'health.json')
);
