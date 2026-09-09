alter table public.wpi_equipment_import_batches
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists mime_type text,
  add column if not exists file_hash text,
  add column if not exists parse_engine text,
  add column if not exists workbook_sheets jsonb not null default '[]'::jsonb,
  add column if not exists parsed_at timestamptz;

create unique index if not exists wpi_equipment_import_batches_storage_object_idx
  on public.wpi_equipment_import_batches (storage_bucket, storage_path)
  where storage_path is not null;

create index if not exists wpi_equipment_import_batches_parsed_at_idx
  on public.wpi_equipment_import_batches (organization_id, parsed_at desc)
  where parsed_at is not null;

update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv',
  'application/csv',
  'image/jpeg',
  'image/png'
]
where id = 'business-documents';
