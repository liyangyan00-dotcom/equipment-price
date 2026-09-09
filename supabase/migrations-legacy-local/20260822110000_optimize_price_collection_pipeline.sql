-- Keep the real collection pipeline efficient as evidence and lead volumes grow.

create index if not exists wpi_collection_evidence_run_id_idx
  on public.wpi_price_collection_evidence (run_id)
  where run_id is not null;

create index if not exists wpi_collection_evidence_source_id_idx
  on public.wpi_price_collection_evidence (source_id)
  where source_id is not null;

create index if not exists wpi_collection_evidence_quote_document_id_idx
  on public.wpi_price_collection_evidence (quote_document_id)
  where quote_document_id is not null;

create index if not exists wpi_collection_evidence_created_by_idx
  on public.wpi_price_collection_evidence (created_by)
  where created_by is not null;

create index if not exists wpi_collection_leads_source_id_idx
  on public.wpi_price_collection_leads (source_id)
  where source_id is not null;

create index if not exists wpi_collection_leads_quote_document_id_idx
  on public.wpi_price_collection_leads (quote_document_id)
  where quote_document_id is not null;

create index if not exists wpi_collection_leads_duplicate_of_idx
  on public.wpi_price_collection_leads (duplicate_of_lead_id)
  where duplicate_of_lead_id is not null;

create index if not exists wpi_collection_runs_requested_by_idx
  on public.wpi_price_collection_runs (requested_by)
  where requested_by is not null;

create index if not exists wpi_collection_sources_created_by_idx
  on public.wpi_price_collection_sources (created_by)
  where created_by is not null;

create index if not exists wpi_collection_sources_updated_by_idx
  on public.wpi_price_collection_sources (updated_by)
  where updated_by is not null;

drop policy if exists wpi_currency_rates_write on public.wpi_currency_rates;
create policy wpi_currency_rates_insert
  on public.wpi_currency_rates for insert to authenticated
  with check (private.wpi_has_permission(organization_id, 'settings.manage'::public.wpi_app_permission));
create policy wpi_currency_rates_update
  on public.wpi_currency_rates for update to authenticated
  using (private.wpi_has_permission(organization_id, 'settings.manage'::public.wpi_app_permission))
  with check (private.wpi_has_permission(organization_id, 'settings.manage'::public.wpi_app_permission));
create policy wpi_currency_rates_delete
  on public.wpi_currency_rates for delete to authenticated
  using (private.wpi_has_permission(organization_id, 'settings.manage'::public.wpi_app_permission));

drop policy if exists wpi_collection_sources_write on public.wpi_price_collection_sources;
create policy wpi_collection_sources_insert
  on public.wpi_price_collection_sources for insert to authenticated
  with check (private.wpi_has_permission(organization_id, 'settings.manage'::public.wpi_app_permission));
create policy wpi_collection_sources_update
  on public.wpi_price_collection_sources for update to authenticated
  using (private.wpi_has_permission(organization_id, 'settings.manage'::public.wpi_app_permission))
  with check (private.wpi_has_permission(organization_id, 'settings.manage'::public.wpi_app_permission));
create policy wpi_collection_sources_delete
  on public.wpi_price_collection_sources for delete to authenticated
  using (private.wpi_has_permission(organization_id, 'settings.manage'::public.wpi_app_permission));

drop policy if exists wpi_collection_runs_write on public.wpi_price_collection_runs;
create policy wpi_collection_runs_insert
  on public.wpi_price_collection_runs for insert to authenticated
  with check (private.wpi_has_permission(organization_id, 'price.write'::public.wpi_app_permission));
create policy wpi_collection_runs_update
  on public.wpi_price_collection_runs for update to authenticated
  using (private.wpi_has_permission(organization_id, 'price.write'::public.wpi_app_permission))
  with check (private.wpi_has_permission(organization_id, 'price.write'::public.wpi_app_permission));
create policy wpi_collection_runs_delete
  on public.wpi_price_collection_runs for delete to authenticated
  using (private.wpi_has_permission(organization_id, 'price.write'::public.wpi_app_permission));

drop policy if exists wpi_collection_evidence_write on public.wpi_price_collection_evidence;
create policy wpi_collection_evidence_insert
  on public.wpi_price_collection_evidence for insert to authenticated
  with check (private.wpi_has_permission(organization_id, 'price.write'::public.wpi_app_permission));
create policy wpi_collection_evidence_update
  on public.wpi_price_collection_evidence for update to authenticated
  using (private.wpi_has_permission(organization_id, 'price.write'::public.wpi_app_permission))
  with check (private.wpi_has_permission(organization_id, 'price.write'::public.wpi_app_permission));
create policy wpi_collection_evidence_delete
  on public.wpi_price_collection_evidence for delete to authenticated
  using (private.wpi_has_permission(organization_id, 'price.write'::public.wpi_app_permission));
