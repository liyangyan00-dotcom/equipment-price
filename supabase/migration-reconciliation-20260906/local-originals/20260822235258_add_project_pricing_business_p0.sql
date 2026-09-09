alter table public.wpi_projects
  add column if not exists project_stage text not null default 'budgeting',
  add column if not exists base_currency text not null default 'USD',
  add column if not exists price_term text not null default 'CIF',
  add column if not exists exchange_rate numeric(18,6) not null default 7.18,
  add column if not exists valid_until date,
  add column if not exists boq_attachment_id uuid references public.wpi_attachments(id) on delete set null,
  add column if not exists metadata jsonb not null default '{}'::jsonb;
create table public.wpi_project_pricing_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  project_id uuid not null references public.wpi_projects(id) on delete cascade,
  boq_code text not null,
  line_no integer not null check (line_no > 0),
  item_name text not null check (length(btrim(item_name)) between 1 and 300),
  specification text not null default '',
  category text not null default 'equipment' check (category in ('equipment', 'material', 'service')),
  quantity numeric(18,4) not null default 1 check (quantity > 0),
  unit text not null default 'item',
  matched_unit_price numeric(18,4) check (matched_unit_price is null or matched_unit_price >= 0),
  currency text not null default 'USD',
  normalized_usd_price numeric(18,4) check (normalized_usd_price is null or normalized_usd_price >= 0),
  price_source_type text not null default 'unmatched' check (
    price_source_type in ('equipment_price', 'material_price', 'inquiry_quote', 'ai_estimate', 'manual', 'unmatched')
  ),
  source_record_id uuid,
  source_legacy_id text,
  supplier_id uuid references public.wpi_suppliers(id) on delete set null,
  confidence numeric(5,2) not null default 0 check (confidence between 0 and 100),
  match_level text not null default 'unmatched' check (match_level in ('exact', 'similar', 'type', 'model', 'unmatched')),
  risk_level public.wpi_risk_level not null default 'medium',
  needs_inquiry boolean not null default true,
  decision_status text not null default 'gap' check (
    decision_status in ('gap', 'ai_recommended', 'manual_selected', 'confirmed')
  ),
  evidence_count integer not null default 0 check (evidence_count >= 0),
  notes text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, boq_code)
);
create index wpi_project_pricing_items_org_project_idx
  on public.wpi_project_pricing_items(organization_id, project_id, line_no);
create index wpi_project_pricing_items_review_idx
  on public.wpi_project_pricing_items(organization_id, decision_status, risk_level);
create index wpi_project_pricing_items_source_idx
  on public.wpi_project_pricing_items(organization_id, price_source_type, source_record_id)
  where source_record_id is not null;
create trigger wpi_project_pricing_items_updated_at
before update on public.wpi_project_pricing_items
for each row execute function private.wpi_set_updated_at();
create trigger wpi_project_pricing_items_audit
after insert or update or delete on public.wpi_project_pricing_items
for each row execute function private.wpi_audit_row_change();
alter table public.wpi_project_pricing_items enable row level security;
create policy wpi_project_pricing_items_read
on public.wpi_project_pricing_items for select to authenticated
using (private.wpi_has_permission(organization_id, 'project.read'));
create policy wpi_project_pricing_items_insert
on public.wpi_project_pricing_items for insert to authenticated
with check (
  private.wpi_has_permission(organization_id, 'project.write')
  and created_by = auth.uid()
);
create policy wpi_project_pricing_items_update
on public.wpi_project_pricing_items for update to authenticated
using (private.wpi_has_permission(organization_id, 'project.write'))
with check (private.wpi_has_permission(organization_id, 'project.write'));
create policy wpi_project_pricing_items_delete
on public.wpi_project_pricing_items for delete to authenticated
using (private.wpi_has_permission(organization_id, 'project.write'));
revoke all on public.wpi_project_pricing_items from public, anon;
grant select, insert, update, delete on public.wpi_project_pricing_items to authenticated;
grant all on public.wpi_project_pricing_items to service_role;
comment on table public.wpi_project_pricing_items is
  'Organization-scoped BOQ pricing lines. AI matches remain recommendations until a user confirms them.';
