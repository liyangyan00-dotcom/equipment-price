alter table public.wpi_price_collection_tasks
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references auth.users(id) on delete set null;

alter table public.wpi_price_collection_tasks
  drop constraint if exists wpi_price_collection_tasks_archived_schedule_check,
  add constraint wpi_price_collection_tasks_archived_schedule_check
    check (archived_at is null or schedule_enabled = false);

create index if not exists wpi_price_collection_tasks_archive_idx
  on public.wpi_price_collection_tasks (organization_id, archived_at, created_at desc);

comment on column public.wpi_price_collection_tasks.archived_at is
  'Soft archive timestamp. Archived tasks keep their runs, evidence, leads and audit history.';

comment on column public.wpi_price_collection_tasks.archived_by is
  'Authenticated user who archived the collection task.';
