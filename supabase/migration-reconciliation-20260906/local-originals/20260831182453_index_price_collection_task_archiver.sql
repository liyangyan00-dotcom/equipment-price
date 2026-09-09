create index if not exists wpi_price_collection_tasks_archived_by_idx
  on public.wpi_price_collection_tasks (archived_by)
  where archived_by is not null;
