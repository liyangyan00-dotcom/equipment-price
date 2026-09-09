alter table public.wpi_equipment_catalog
  add column if not exists collection_task_id uuid
    references public.wpi_price_collection_tasks(id) on delete set null,
  add column if not exists collection_run_id uuid
    references public.wpi_price_collection_runs(id) on delete set null,
  add column if not exists source_discovery_id uuid
    references public.wpi_equipment_collection_discoveries(id) on delete set null,
  add column if not exists extracted_at timestamptz
alter table public.wpi_equipment_catalog_sources
  add column if not exists collection_task_id uuid
    references public.wpi_price_collection_tasks(id) on delete set null,
  add column if not exists collection_run_id uuid
    references public.wpi_price_collection_runs(id) on delete set null,
  add column if not exists discovery_id uuid
    references public.wpi_equipment_collection_discoveries(id) on delete set null
create index if not exists wpi_equipment_catalog_collection_task_idx
  on public.wpi_equipment_catalog(organization_id, collection_task_id, review_status, created_at desc)
  where collection_task_id is not null
create index if not exists wpi_equipment_catalog_collection_run_idx
  on public.wpi_equipment_catalog(collection_run_id)
  where collection_run_id is not null
create index if not exists wpi_equipment_catalog_source_discovery_idx
  on public.wpi_equipment_catalog(source_discovery_id)
  where source_discovery_id is not null
create unique index if not exists wpi_equipment_catalog_sources_discovery_unique
  on public.wpi_equipment_catalog_sources(equipment_catalog_id, discovery_id)
  where discovery_id is not null
comment on column public.wpi_equipment_catalog.collection_task_id is
  'Originating collection task for an AI-extracted equipment catalog candidate.'
comment on column public.wpi_equipment_catalog.collection_run_id is
  'Collection run that most recently extracted this candidate.'
comment on column public.wpi_equipment_catalog.source_discovery_id is
  'Discovered product page used as the primary extraction source.'
comment on column public.wpi_equipment_catalog.extracted_at is
  'Timestamp of the latest structured extraction. AI extraction never implies approval.'
