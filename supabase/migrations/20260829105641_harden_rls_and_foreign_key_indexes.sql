-- Authenticated business RPCs are intentionally SECURITY DEFINER because they
-- perform atomic cross-table workflows. Each function validates auth.uid(),
-- organization membership and the relevant application permission internally.
revoke all on function public.wpi_batch_review_equipment_prices(uuid[], text, text) from public, anon;
revoke all on function public.wpi_clear_integration_credential(uuid) from public, anon;
revoke all on function public.wpi_confirm_project_catalog_match(uuid, uuid, text) from public, anon;
revoke all on function public.wpi_finish_equipment_ai_review(uuid, text, jsonb, numeric, public.wpi_risk_level, text, text) from public, anon;
revoke all on function public.wpi_get_equipment_review_audit(uuid) from public, anon;
revoke all on function public.wpi_queue_equipment_price_review(uuid, jsonb) from public, anon;
revoke all on function public.wpi_record_attachment_access_event(uuid, text, jsonb) from public, anon;
revoke all on function public.wpi_record_equipment_access_event(uuid, text, jsonb) from public, anon;
revoke all on function public.wpi_review_equipment_catalog(uuid, public.wpi_review_status, text) from public, anon;
revoke all on function public.wpi_review_suppliers(uuid[], public.wpi_review_status, text) from public, anon;
revoke all on function public.wpi_save_equipment_import_draft(uuid, jsonb, jsonb, jsonb) from public, anon;
revoke all on function public.wpi_set_integration_credential(uuid, text, text) from public, anon;
revoke all on function public.wpi_start_equipment_ai_review(uuid, text, text, text, text, text, jsonb) from public, anon;
revoke all on function public.wpi_submit_attachment_review(uuid, text, text) from public, anon;
revoke all on function public.wpi_submit_equipment_import_batch(uuid) from public, anon;
revoke all on function public.wpi_submit_equipment_price_review(uuid, text, text, jsonb, text[]) from public, anon;

grant execute on function public.wpi_batch_review_equipment_prices(uuid[], text, text) to authenticated, service_role;
grant execute on function public.wpi_clear_integration_credential(uuid) to authenticated, service_role;
grant execute on function public.wpi_confirm_project_catalog_match(uuid, uuid, text) to authenticated, service_role;
grant execute on function public.wpi_finish_equipment_ai_review(uuid, text, jsonb, numeric, public.wpi_risk_level, text, text) to authenticated, service_role;
grant execute on function public.wpi_get_equipment_review_audit(uuid) to authenticated, service_role;
grant execute on function public.wpi_queue_equipment_price_review(uuid, jsonb) to authenticated, service_role;
grant execute on function public.wpi_record_attachment_access_event(uuid, text, jsonb) to authenticated, service_role;
grant execute on function public.wpi_record_equipment_access_event(uuid, text, jsonb) to authenticated, service_role;
grant execute on function public.wpi_review_equipment_catalog(uuid, public.wpi_review_status, text) to authenticated, service_role;
grant execute on function public.wpi_review_suppliers(uuid[], public.wpi_review_status, text) to authenticated, service_role;
grant execute on function public.wpi_save_equipment_import_draft(uuid, jsonb, jsonb, jsonb) to authenticated, service_role;
grant execute on function public.wpi_set_integration_credential(uuid, text, text) to authenticated, service_role;
grant execute on function public.wpi_start_equipment_ai_review(uuid, text, text, text, text, text, jsonb) to authenticated, service_role;
grant execute on function public.wpi_submit_attachment_review(uuid, text, text) to authenticated, service_role;
grant execute on function public.wpi_submit_equipment_import_batch(uuid) to authenticated, service_role;
grant execute on function public.wpi_submit_equipment_price_review(uuid, text, text, jsonb, text[]) to authenticated, service_role;

alter policy wpi_collection_tasks_insert on public.wpi_price_collection_tasks
  with check (private.wpi_has_permission(organization_id, 'price.write') and created_by = (select auth.uid()));
alter policy wpi_suppliers_insert on public.wpi_suppliers
  with check (private.wpi_has_permission(organization_id, 'supplier.write') and created_by = (select auth.uid()));
alter policy wpi_profiles_select_self on public.wpi_profiles
  using (id = (select auth.uid()));
alter policy wpi_profiles_update_self on public.wpi_profiles
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
alter policy wpi_organizations_insert_authenticated on public.wpi_organizations
  with check (created_by = (select auth.uid()));
alter policy wpi_supplier_contacts_insert on public.wpi_supplier_contacts
  with check (private.wpi_has_permission(organization_id, 'supplier.write') and created_by = (select auth.uid()));
alter policy wpi_supplier_reviews_insert on public.wpi_supplier_reviews
  with check (private.wpi_has_permission(organization_id, 'supplier.review') and reviewer_id = (select auth.uid()));
alter policy wpi_reports_insert on public.wpi_reports
  with check (private.wpi_has_permission(organization_id, 'report.write') and created_by = (select auth.uid()));
alter policy wpi_projects_insert on public.wpi_projects
  with check (private.wpi_has_permission(organization_id, 'project.write') and created_by = (select auth.uid()));
alter policy wpi_equipment_price_reviews_insert on public.wpi_equipment_price_reviews
  with check ((private.wpi_has_permission(organization_id, 'price.write') or private.wpi_has_permission(organization_id, 'price.review')) and submitted_by = (select auth.uid()));
alter policy wpi_project_pricing_items_insert on public.wpi_project_pricing_items
  with check (private.wpi_has_permission(organization_id, 'project.write') and created_by = (select auth.uid()));

drop policy wpi_source_validation_jobs_write on public.wpi_collection_source_validation_jobs;
create policy wpi_source_validation_jobs_insert on public.wpi_collection_source_validation_jobs for insert to authenticated
  with check (private.wpi_has_permission(organization_id, 'settings.manage'));
create policy wpi_source_validation_jobs_update on public.wpi_collection_source_validation_jobs for update to authenticated
  using (private.wpi_has_permission(organization_id, 'settings.manage'))
  with check (private.wpi_has_permission(organization_id, 'settings.manage'));
create policy wpi_source_validation_jobs_delete on public.wpi_collection_source_validation_jobs for delete to authenticated
  using (private.wpi_has_permission(organization_id, 'settings.manage'));

drop policy wpi_equipment_discoveries_write on public.wpi_equipment_collection_discoveries;
create policy wpi_equipment_discoveries_insert on public.wpi_equipment_collection_discoveries for insert to authenticated
  with check (private.wpi_has_permission(organization_id, 'settings.manage') and created_by = (select auth.uid()) and (updated_by is null or updated_by = (select auth.uid())));
create policy wpi_equipment_discoveries_update on public.wpi_equipment_collection_discoveries for update to authenticated
  using (private.wpi_has_permission(organization_id, 'settings.manage'))
  with check (private.wpi_has_permission(organization_id, 'settings.manage') and created_by = (select auth.uid()) and (updated_by is null or updated_by = (select auth.uid())));
create policy wpi_equipment_discoveries_delete on public.wpi_equipment_collection_discoveries for delete to authenticated
  using (private.wpi_has_permission(organization_id, 'settings.manage'));

drop policy wpi_collection_methods_write on public.wpi_equipment_collection_methods;
create policy wpi_collection_methods_insert on public.wpi_equipment_collection_methods for insert to authenticated
  with check (private.wpi_has_permission(organization_id, 'settings.manage'));
create policy wpi_collection_methods_update on public.wpi_equipment_collection_methods for update to authenticated
  using (private.wpi_has_permission(organization_id, 'settings.manage')) with check (private.wpi_has_permission(organization_id, 'settings.manage'));
create policy wpi_collection_methods_delete on public.wpi_equipment_collection_methods for delete to authenticated
  using (private.wpi_has_permission(organization_id, 'settings.manage'));

drop policy wpi_source_import_batches_write on public.wpi_equipment_source_import_batches;
create policy wpi_source_import_batches_insert on public.wpi_equipment_source_import_batches for insert to authenticated
  with check (private.wpi_has_permission(organization_id, 'settings.manage'));
create policy wpi_source_import_batches_update on public.wpi_equipment_source_import_batches for update to authenticated
  using (private.wpi_has_permission(organization_id, 'settings.manage')) with check (private.wpi_has_permission(organization_id, 'settings.manage'));
create policy wpi_source_import_batches_delete on public.wpi_equipment_source_import_batches for delete to authenticated
  using (private.wpi_has_permission(organization_id, 'settings.manage'));

drop policy wpi_exchange_rates_write on public.wpi_exchange_rates;
create policy wpi_exchange_rates_insert on public.wpi_exchange_rates for insert to authenticated
  with check (private.wpi_has_permission(organization_id, 'settings.manage'));
create policy wpi_exchange_rates_update on public.wpi_exchange_rates for update to authenticated
  using (private.wpi_has_permission(organization_id, 'settings.manage')) with check (private.wpi_has_permission(organization_id, 'settings.manage'));
create policy wpi_exchange_rates_delete on public.wpi_exchange_rates for delete to authenticated
  using (private.wpi_has_permission(organization_id, 'settings.manage'));

drop policy wpi_inbound_emails_write on public.wpi_inquiry_inbound_emails;
create policy wpi_inbound_emails_insert on public.wpi_inquiry_inbound_emails for insert to authenticated
  with check (private.wpi_has_permission(organization_id, 'inquiry.write'));
create policy wpi_inbound_emails_update on public.wpi_inquiry_inbound_emails for update to authenticated
  using (private.wpi_has_permission(organization_id, 'inquiry.write')) with check (private.wpi_has_permission(organization_id, 'inquiry.write'));
create policy wpi_inbound_emails_delete on public.wpi_inquiry_inbound_emails for delete to authenticated
  using (private.wpi_has_permission(organization_id, 'inquiry.write'));

drop policy wpi_item_quotes_write on public.wpi_inquiry_item_quotes;
create policy wpi_item_quotes_insert on public.wpi_inquiry_item_quotes for insert to authenticated
  with check (private.wpi_has_permission(organization_id, 'inquiry.write'));
create policy wpi_item_quotes_update on public.wpi_inquiry_item_quotes for update to authenticated
  using (private.wpi_has_permission(organization_id, 'inquiry.write')) with check (private.wpi_has_permission(organization_id, 'inquiry.write'));
create policy wpi_item_quotes_delete on public.wpi_inquiry_item_quotes for delete to authenticated
  using (private.wpi_has_permission(organization_id, 'inquiry.write'));

drop policy wpi_portal_tokens_write on public.wpi_inquiry_portal_tokens;
create policy wpi_portal_tokens_insert on public.wpi_inquiry_portal_tokens for insert to authenticated
  with check (private.wpi_has_permission(organization_id, 'inquiry.write'));
create policy wpi_portal_tokens_update on public.wpi_inquiry_portal_tokens for update to authenticated
  using (private.wpi_has_permission(organization_id, 'inquiry.write')) with check (private.wpi_has_permission(organization_id, 'inquiry.write'));
create policy wpi_portal_tokens_delete on public.wpi_inquiry_portal_tokens for delete to authenticated
  using (private.wpi_has_permission(organization_id, 'inquiry.write'));

drop policy wpi_reminder_policies_write on public.wpi_inquiry_reminder_policies;
create policy wpi_reminder_policies_insert on public.wpi_inquiry_reminder_policies for insert to authenticated
  with check (private.wpi_has_permission(organization_id, 'inquiry.write'));
create policy wpi_reminder_policies_update on public.wpi_inquiry_reminder_policies for update to authenticated
  using (private.wpi_has_permission(organization_id, 'inquiry.write')) with check (private.wpi_has_permission(organization_id, 'inquiry.write'));
create policy wpi_reminder_policies_delete on public.wpi_inquiry_reminder_policies for delete to authenticated
  using (private.wpi_has_permission(organization_id, 'inquiry.write'));

drop policy wpi_collection_source_runs_write on public.wpi_price_collection_source_runs;
create policy wpi_collection_source_runs_insert on public.wpi_price_collection_source_runs for insert to authenticated
  with check (private.wpi_has_permission(organization_id, 'price.write'));
create policy wpi_collection_source_runs_update on public.wpi_price_collection_source_runs for update to authenticated
  using (private.wpi_has_permission(organization_id, 'price.write')) with check (private.wpi_has_permission(organization_id, 'price.write'));
create policy wpi_collection_source_runs_delete on public.wpi_price_collection_source_runs for delete to authenticated
  using (private.wpi_has_permission(organization_id, 'price.write'));

-- Add a covering index for every public foreign key that does not already have
-- one. This protects both joins and parent-row delete/update checks as data grows.
do $$
declare
  foreign_key record;
  column_list text;
  index_name text;
begin
  for foreign_key in
    select constraint_row.oid, constraint_row.conname, constraint_row.conrelid,
           constraint_row.conkey, namespace.nspname, relation.relname
    from pg_constraint constraint_row
    join pg_class relation on relation.oid = constraint_row.conrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where constraint_row.contype = 'f'
      and namespace.nspname = 'public'
      and not exists (
        select 1
        from pg_index index_row
        where index_row.indrelid = constraint_row.conrelid
          and index_row.indisvalid
          and index_row.indisready
          and constraint_row.conkey <@ (index_row.indkey::smallint[])
      )
  loop
    select string_agg(quote_ident(attribute.attname), ', ' order by key_column.ordinality)
      into column_list
    from unnest(foreign_key.conkey) with ordinality as key_column(attnum, ordinality)
    join pg_attribute attribute
      on attribute.attrelid = foreign_key.conrelid
     and attribute.attnum = key_column.attnum;

    index_name := left(regexp_replace(foreign_key.conname, '_fkey$', ''), 52)
      || '_fk_idx_' || substr(md5(foreign_key.oid::text), 1, 6);
    execute format('create index if not exists %I on %I.%I (%s)',
      index_name, foreign_key.nspname, foreign_key.relname, column_list);
  end loop;
end;
$$;

;
