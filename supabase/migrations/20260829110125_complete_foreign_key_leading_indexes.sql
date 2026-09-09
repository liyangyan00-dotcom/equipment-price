create index if not exists wpi_source_validation_jobs_source_id_idx
  on public.wpi_collection_source_validation_jobs (source_id);
create index if not exists wpi_comparison_quotes_supplier_id_idx
  on public.wpi_comparison_quotes (supplier_id);
create index if not exists wpi_comparisons_inquiry_id_idx
  on public.wpi_comparisons (inquiry_id);
create index if not exists wpi_equipment_catalog_assigned_reviewer_id_idx
  on public.wpi_equipment_catalog (assigned_reviewer_id);
create index if not exists wpi_equipment_catalog_collection_task_id_idx
  on public.wpi_equipment_catalog (collection_task_id);
create index if not exists wpi_equipment_catalog_duplicate_of_catalog_id_idx
  on public.wpi_equipment_catalog (duplicate_of_catalog_id);
create index if not exists wpi_equipment_catalog_sources_discovery_id_idx
  on public.wpi_equipment_catalog_sources (discovery_id);
create index if not exists wpi_equipment_discoveries_source_id_idx
  on public.wpi_equipment_collection_discoveries (source_id);
create index if not exists wpi_equipment_prices_catalog_id_idx
  on public.wpi_equipment_prices (equipment_catalog_id);
create index if not exists wpi_inquiry_events_inquiry_id_idx
  on public.wpi_inquiry_events (inquiry_id);
create index if not exists wpi_inbound_emails_inquiry_id_idx
  on public.wpi_inquiry_inbound_emails (inquiry_id);
create index if not exists wpi_item_quotes_inquiry_id_idx
  on public.wpi_inquiry_item_quotes (inquiry_id);
create index if not exists wpi_item_quotes_supplier_id_idx
  on public.wpi_inquiry_item_quotes (supplier_id);
create index if not exists wpi_portal_tokens_supplier_id_idx
  on public.wpi_inquiry_portal_tokens (supplier_id);
create index if not exists wpi_collection_leads_assigned_reviewer_id_idx
  on public.wpi_price_collection_leads (assigned_reviewer_id);
create index if not exists wpi_collection_source_runs_source_id_idx
  on public.wpi_price_collection_source_runs (source_id);
create index if not exists wpi_pricing_catalog_matches_catalog_id_idx
  on public.wpi_project_pricing_catalog_matches (equipment_catalog_id);
create index if not exists wpi_project_pricing_items_catalog_id_idx
  on public.wpi_project_pricing_items (equipment_catalog_id);
create index if not exists wpi_supplier_equipment_catalog_supplier_id_idx
  on public.wpi_supplier_equipment_catalog (supplier_id);


;
