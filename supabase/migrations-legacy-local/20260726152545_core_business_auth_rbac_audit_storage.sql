create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create type public.wpi_app_role as enum (
  'admin',
  'manager',
  'reviewer',
  'editor',
  'viewer'
);

create type public.wpi_app_permission as enum (
  'supplier.read',
  'supplier.write',
  'supplier.review',
  'price.read',
  'price.write',
  'price.review',
  'inquiry.read',
  'inquiry.write',
  'inquiry.approve',
  'project.read',
  'project.write',
  'report.read',
  'report.write',
  'file.read',
  'file.write',
  'file.delete',
  'audit.read',
  'settings.manage',
  'user.manage'
);

create type public.wpi_risk_level as enum ('low', 'medium', 'high', 'critical');
create type public.wpi_review_status as enum (
  'draft',
  'pending_review',
  'approved',
  'rejected',
  'archived'
);

create table public.wpi_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  phone text,
  locale text not null default 'zh-CN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wpi_organizations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wpi_organization_members (
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.wpi_app_role not null default 'viewer',
  is_active boolean not null default true,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.wpi_role_permissions (
  role public.wpi_app_role not null,
  permission public.wpi_app_permission not null,
  primary key (role, permission)
);

create table public.wpi_suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  supplier_code text not null,
  name text not null,
  legal_name text,
  country_code text,
  region text,
  category text,
  business_scope text,
  website text,
  unified_social_credit_code text,
  legal_representative text,
  registered_capital text,
  confidence numeric(5,2) check (confidence between 0 and 100),
  risk_level public.wpi_risk_level not null default 'low',
  review_status public.wpi_review_status not null default 'draft',
  source_url text,
  source_checked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, supplier_code)
);

create table public.wpi_supplier_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  supplier_id uuid not null references public.wpi_suppliers(id) on delete cascade,
  name text not null,
  title text,
  phone text,
  whatsapp text,
  email text,
  is_primary boolean not null default false,
  verified_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wpi_supplier_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  supplier_id uuid not null references public.wpi_suppliers(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id),
  status public.wpi_review_status not null default 'pending_review',
  completeness numeric(5,2) check (completeness between 0 and 100),
  confidence numeric(5,2) check (confidence between 0 and 100),
  risk_level public.wpi_risk_level not null default 'low',
  notes text,
  conflicts jsonb not null default '[]'::jsonb,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wpi_equipment_prices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  price_code text not null,
  equipment_name text not null,
  brand text,
  model text,
  category text,
  original_price numeric(18,2) not null check (original_price >= 0),
  original_currency text not null default 'CNY',
  usd_price numeric(18,2) check (usd_price >= 0),
  price_term text,
  supplier_id uuid references public.wpi_suppliers(id),
  source_type text,
  source_url text,
  valid_until date,
  confidence numeric(5,2) check (confidence between 0 and 100),
  risk_level public.wpi_risk_level not null default 'low',
  review_status public.wpi_review_status not null default 'draft',
  technical_parameters jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, price_code)
);

create table public.wpi_material_prices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  price_code text not null,
  material_name text not null,
  specification text,
  category text,
  unit text not null,
  price numeric(18,2) not null check (price >= 0),
  currency text not null default 'CNY',
  region text,
  supplier_id uuid references public.wpi_suppliers(id),
  source_type text,
  source_url text,
  valid_until date,
  confidence numeric(5,2) check (confidence between 0 and 100),
  risk_level public.wpi_risk_level not null default 'low',
  review_status public.wpi_review_status not null default 'draft',
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, price_code)
);

create table public.wpi_inquiries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  inquiry_code text not null,
  subject text not null,
  status public.wpi_review_status not null default 'draft',
  deadline timestamptz,
  letter_content text,
  ai_confidence numeric(5,2) check (ai_confidence between 0 and 100),
  risk_level public.wpi_risk_level not null default 'low',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, inquiry_code)
);

create table public.wpi_inquiry_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  inquiry_id uuid not null references public.wpi_inquiries(id) on delete cascade,
  item_type text not null check (item_type in ('equipment', 'material', 'service')),
  source_id uuid,
  item_name text not null,
  specification text,
  quantity numeric(18,4) not null default 1 check (quantity > 0),
  unit text,
  target_price numeric(18,2),
  created_at timestamptz not null default now()
);

create table public.wpi_inquiry_suppliers (
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  inquiry_id uuid not null references public.wpi_inquiries(id) on delete cascade,
  supplier_id uuid not null references public.wpi_suppliers(id) on delete cascade,
  response_status text not null default 'pending',
  quoted_amount numeric(18,2),
  currency text,
  responded_at timestamptz,
  risk_level public.wpi_risk_level not null default 'low',
  ai_recommendation text,
  primary key (inquiry_id, supplier_id)
);

create table public.wpi_projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  project_code text not null,
  name text not null,
  status public.wpi_review_status not null default 'draft',
  source_inquiry_id uuid references public.wpi_inquiries(id),
  boq_data jsonb not null default '[]'::jsonb,
  pricing_result jsonb not null default '{}'::jsonb,
  risk_level public.wpi_risk_level not null default 'low',
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, project_code)
);

create table public.wpi_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  report_code text not null,
  title text not null,
  report_type text not null,
  status public.wpi_review_status not null default 'draft',
  source_type text,
  source_id uuid,
  outline jsonb not null default '[]'::jsonb,
  content jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, report_code)
);

create table public.wpi_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  bucket_id text not null,
  object_path text not null,
  original_name text not null,
  content_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  related_type text,
  related_id uuid,
  evidence_type text,
  checksum text,
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (bucket_id, object_path)
);

create table public.wpi_audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid,
  actor_id uuid,
  action text not null,
  table_name text not null,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  request_id text,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index wpi_members_user_idx on public.wpi_organization_members(user_id);
create index wpi_suppliers_org_name_idx on public.wpi_suppliers(organization_id, name);
create index wpi_equipment_org_name_idx on public.wpi_equipment_prices(organization_id, equipment_name);
create index wpi_material_org_name_idx on public.wpi_material_prices(organization_id, material_name);
create index wpi_inquiries_org_status_idx on public.wpi_inquiries(organization_id, status);
create index wpi_attachments_relation_idx on public.wpi_attachments(organization_id, related_type, related_id);
create index wpi_audit_org_created_idx on public.wpi_audit_logs(organization_id, created_at desc);

insert into public.wpi_role_permissions (role, permission)
select role_value, permission_value
from unnest(enum_range(null::public.wpi_app_role)) as role_value
cross join unnest(enum_range(null::public.wpi_app_permission)) as permission_value
where role_value = 'admin'::public.wpi_app_role;

insert into public.wpi_role_permissions (role, permission) values
  ('manager', 'supplier.read'), ('manager', 'supplier.write'), ('manager', 'supplier.review'),
  ('manager', 'price.read'), ('manager', 'price.write'), ('manager', 'price.review'),
  ('manager', 'inquiry.read'), ('manager', 'inquiry.write'), ('manager', 'inquiry.approve'),
  ('manager', 'project.read'), ('manager', 'project.write'),
  ('manager', 'report.read'), ('manager', 'report.write'),
  ('manager', 'file.read'), ('manager', 'file.write'), ('manager', 'file.delete'),
  ('manager', 'audit.read'),
  ('reviewer', 'supplier.read'), ('reviewer', 'supplier.review'),
  ('reviewer', 'price.read'), ('reviewer', 'price.review'),
  ('reviewer', 'inquiry.read'), ('reviewer', 'inquiry.approve'),
  ('reviewer', 'project.read'), ('reviewer', 'report.read'), ('reviewer', 'file.read'),
  ('editor', 'supplier.read'), ('editor', 'supplier.write'),
  ('editor', 'price.read'), ('editor', 'price.write'),
  ('editor', 'inquiry.read'), ('editor', 'inquiry.write'),
  ('editor', 'project.read'), ('editor', 'project.write'),
  ('editor', 'report.read'), ('editor', 'report.write'),
  ('editor', 'file.read'), ('editor', 'file.write'),
  ('viewer', 'supplier.read'), ('viewer', 'price.read'),
  ('viewer', 'inquiry.read'), ('viewer', 'project.read'),
  ('viewer', 'report.read'), ('viewer', 'file.read');

create or replace function private.wpi_is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.wpi_organization_members member
    where member.organization_id = target_organization_id
      and member.user_id = auth.uid()
      and member.is_active
  );
$$;

create or replace function private.wpi_has_permission(
  target_organization_id uuid,
  requested_permission public.wpi_app_permission
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.wpi_organization_members member
    join public.wpi_role_permissions role_permission
      on role_permission.role = member.role
    where member.organization_id = target_organization_id
      and member.user_id = auth.uid()
      and member.is_active
      and role_permission.permission = requested_permission
  );
$$;

create or replace function private.wpi_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.wpi_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.wpi_profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function private.wpi_add_organization_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.wpi_organization_members (organization_id, user_id, role)
  values (new.id, new.created_by, 'admin');
  return new;
end;
$$;

create or replace function private.wpi_audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data jsonb;
  old_row jsonb;
  new_row jsonb;
  org_id uuid;
  record_key text;
begin
  old_row := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  new_row := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  row_data := coalesce(new_row, old_row);
  org_id := nullif(row_data ->> 'organization_id', '')::uuid;
  record_key := coalesce(row_data ->> 'id', row_data ->> 'user_id', row_data ->> 'inquiry_id');

  insert into public.wpi_audit_logs (
    organization_id,
    actor_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    request_id
  )
  values (
    org_id,
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    record_key,
    old_row,
    new_row,
    nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-request-id'
  );

  return coalesce(new, old);
end;
$$;

create or replace function private.wpi_storage_org_id(object_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return split_part(object_name, '/', 1)::uuid;
exception when others then
  return null;
end;
$$;

revoke all on function private.wpi_is_org_member(uuid) from public, anon;
revoke all on function private.wpi_has_permission(uuid, public.wpi_app_permission) from public, anon;
revoke all on function private.wpi_storage_org_id(text) from public, anon;
grant execute on function private.wpi_is_org_member(uuid) to authenticated;
grant execute on function private.wpi_has_permission(uuid, public.wpi_app_permission) to authenticated;
grant execute on function private.wpi_storage_org_id(text) to authenticated;

create trigger wpi_auth_user_created
after insert on auth.users
for each row execute function private.wpi_handle_new_user();

insert into public.wpi_profiles (id, display_name, avatar_url)
select id, coalesce(raw_user_meta_data ->> 'display_name', email), raw_user_meta_data ->> 'avatar_url'
from auth.users
on conflict (id) do nothing;

create trigger wpi_organization_created
after insert on public.wpi_organizations
for each row execute function private.wpi_add_organization_owner();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'wpi_profiles',
    'wpi_organizations',
    'wpi_organization_members',
    'wpi_suppliers',
    'wpi_supplier_contacts',
    'wpi_supplier_reviews',
    'wpi_equipment_prices',
    'wpi_material_prices',
    'wpi_inquiries',
    'wpi_projects',
    'wpi_reports'
  ]
  loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function private.wpi_set_updated_at()',
      table_name || '_updated_at',
      table_name
    );
  end loop;
end $$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'wpi_organization_members',
    'wpi_suppliers',
    'wpi_supplier_contacts',
    'wpi_supplier_reviews',
    'wpi_equipment_prices',
    'wpi_material_prices',
    'wpi_inquiries',
    'wpi_inquiry_items',
    'wpi_inquiry_suppliers',
    'wpi_projects',
    'wpi_reports',
    'wpi_attachments'
  ]
  loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function private.wpi_audit_row_change()',
      table_name || '_audit',
      table_name
    );
  end loop;
end $$;

alter table public.wpi_profiles enable row level security;
alter table public.wpi_organizations enable row level security;
alter table public.wpi_organization_members enable row level security;
alter table public.wpi_role_permissions enable row level security;
alter table public.wpi_suppliers enable row level security;
alter table public.wpi_supplier_contacts enable row level security;
alter table public.wpi_supplier_reviews enable row level security;
alter table public.wpi_equipment_prices enable row level security;
alter table public.wpi_material_prices enable row level security;
alter table public.wpi_inquiries enable row level security;
alter table public.wpi_inquiry_items enable row level security;
alter table public.wpi_inquiry_suppliers enable row level security;
alter table public.wpi_projects enable row level security;
alter table public.wpi_reports enable row level security;
alter table public.wpi_attachments enable row level security;
alter table public.wpi_audit_logs enable row level security;

create policy wpi_profiles_select_self on public.wpi_profiles
for select to authenticated using (id = auth.uid());
create policy wpi_profiles_update_self on public.wpi_profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy wpi_organizations_select_member on public.wpi_organizations
for select to authenticated using (private.wpi_is_org_member(id));
create policy wpi_organizations_insert_authenticated on public.wpi_organizations
for insert to authenticated with check (created_by = auth.uid());
create policy wpi_organizations_update_admin on public.wpi_organizations
for update to authenticated
using (private.wpi_has_permission(id, 'settings.manage'))
with check (private.wpi_has_permission(id, 'settings.manage'));

create policy wpi_members_select_org on public.wpi_organization_members
for select to authenticated using (private.wpi_is_org_member(organization_id));
create policy wpi_members_insert_admin on public.wpi_organization_members
for insert to authenticated
with check (private.wpi_has_permission(organization_id, 'user.manage'));
create policy wpi_members_update_admin on public.wpi_organization_members
for update to authenticated
using (private.wpi_has_permission(organization_id, 'user.manage'))
with check (private.wpi_has_permission(organization_id, 'user.manage'));
create policy wpi_members_delete_admin on public.wpi_organization_members
for delete to authenticated
using (private.wpi_has_permission(organization_id, 'user.manage'));

create policy wpi_permissions_read_authenticated on public.wpi_role_permissions
for select to authenticated using (true);

create policy wpi_suppliers_read on public.wpi_suppliers
for select to authenticated using (private.wpi_has_permission(organization_id, 'supplier.read'));
create policy wpi_suppliers_insert on public.wpi_suppliers
for insert to authenticated with check (
  private.wpi_has_permission(organization_id, 'supplier.write') and created_by = auth.uid()
);
create policy wpi_suppliers_update on public.wpi_suppliers
for update to authenticated using (private.wpi_has_permission(organization_id, 'supplier.write'))
with check (private.wpi_has_permission(organization_id, 'supplier.write'));
create policy wpi_suppliers_delete on public.wpi_suppliers
for delete to authenticated using (private.wpi_has_permission(organization_id, 'supplier.review'));

create policy wpi_supplier_contacts_read on public.wpi_supplier_contacts
for select to authenticated using (private.wpi_has_permission(organization_id, 'supplier.read'));
create policy wpi_supplier_contacts_insert on public.wpi_supplier_contacts
for insert to authenticated with check (
  private.wpi_has_permission(organization_id, 'supplier.write') and created_by = auth.uid()
);
create policy wpi_supplier_contacts_update on public.wpi_supplier_contacts
for update to authenticated using (private.wpi_has_permission(organization_id, 'supplier.write'))
with check (private.wpi_has_permission(organization_id, 'supplier.write'));
create policy wpi_supplier_contacts_delete on public.wpi_supplier_contacts
for delete to authenticated using (private.wpi_has_permission(organization_id, 'supplier.write'));
create policy wpi_supplier_reviews_read on public.wpi_supplier_reviews
for select to authenticated using (private.wpi_has_permission(organization_id, 'supplier.read'));
create policy wpi_supplier_reviews_insert on public.wpi_supplier_reviews
for insert to authenticated with check (
  private.wpi_has_permission(organization_id, 'supplier.review') and reviewer_id = auth.uid()
);
create policy wpi_supplier_reviews_update on public.wpi_supplier_reviews
for update to authenticated using (private.wpi_has_permission(organization_id, 'supplier.review'))
with check (private.wpi_has_permission(organization_id, 'supplier.review'));
create policy wpi_supplier_reviews_delete on public.wpi_supplier_reviews
for delete to authenticated using (private.wpi_has_permission(organization_id, 'supplier.review'));

create policy wpi_equipment_prices_read on public.wpi_equipment_prices
for select to authenticated using (private.wpi_has_permission(organization_id, 'price.read'));
create policy wpi_equipment_prices_write on public.wpi_equipment_prices
for insert to authenticated with check (
  private.wpi_has_permission(organization_id, 'price.write') and created_by = auth.uid()
);
create policy wpi_equipment_prices_update on public.wpi_equipment_prices
for update to authenticated using (private.wpi_has_permission(organization_id, 'price.write'))
with check (private.wpi_has_permission(organization_id, 'price.write'));
create policy wpi_equipment_prices_delete on public.wpi_equipment_prices
for delete to authenticated using (private.wpi_has_permission(organization_id, 'price.review'));

create policy wpi_material_prices_read on public.wpi_material_prices
for select to authenticated using (private.wpi_has_permission(organization_id, 'price.read'));
create policy wpi_material_prices_write on public.wpi_material_prices
for insert to authenticated with check (
  private.wpi_has_permission(organization_id, 'price.write') and created_by = auth.uid()
);
create policy wpi_material_prices_update on public.wpi_material_prices
for update to authenticated using (private.wpi_has_permission(organization_id, 'price.write'))
with check (private.wpi_has_permission(organization_id, 'price.write'));
create policy wpi_material_prices_delete on public.wpi_material_prices
for delete to authenticated using (private.wpi_has_permission(organization_id, 'price.review'));

create policy wpi_inquiries_read on public.wpi_inquiries
for select to authenticated using (private.wpi_has_permission(organization_id, 'inquiry.read'));
create policy wpi_inquiries_insert on public.wpi_inquiries
for insert to authenticated with check (
  private.wpi_has_permission(organization_id, 'inquiry.write') and created_by = auth.uid()
);
create policy wpi_inquiries_update on public.wpi_inquiries
for update to authenticated using (private.wpi_has_permission(organization_id, 'inquiry.write'))
with check (private.wpi_has_permission(organization_id, 'inquiry.write'));
create policy wpi_inquiries_delete on public.wpi_inquiries
for delete to authenticated using (private.wpi_has_permission(organization_id, 'inquiry.approve'));
create policy wpi_inquiry_items_read on public.wpi_inquiry_items
for select to authenticated using (private.wpi_has_permission(organization_id, 'inquiry.read'));
create policy wpi_inquiry_items_insert on public.wpi_inquiry_items
for insert to authenticated with check (private.wpi_has_permission(organization_id, 'inquiry.write'));
create policy wpi_inquiry_items_update on public.wpi_inquiry_items
for update to authenticated using (private.wpi_has_permission(organization_id, 'inquiry.write'))
with check (private.wpi_has_permission(organization_id, 'inquiry.write'));
create policy wpi_inquiry_items_delete on public.wpi_inquiry_items
for delete to authenticated using (private.wpi_has_permission(organization_id, 'inquiry.write'));
create policy wpi_inquiry_suppliers_read on public.wpi_inquiry_suppliers
for select to authenticated using (private.wpi_has_permission(organization_id, 'inquiry.read'));
create policy wpi_inquiry_suppliers_insert on public.wpi_inquiry_suppliers
for insert to authenticated with check (private.wpi_has_permission(organization_id, 'inquiry.write'));
create policy wpi_inquiry_suppliers_update on public.wpi_inquiry_suppliers
for update to authenticated using (private.wpi_has_permission(organization_id, 'inquiry.write'))
with check (private.wpi_has_permission(organization_id, 'inquiry.write'));
create policy wpi_inquiry_suppliers_delete on public.wpi_inquiry_suppliers
for delete to authenticated using (private.wpi_has_permission(organization_id, 'inquiry.write'));

create policy wpi_projects_read on public.wpi_projects
for select to authenticated using (private.wpi_has_permission(organization_id, 'project.read'));
create policy wpi_projects_insert on public.wpi_projects
for insert to authenticated with check (
  private.wpi_has_permission(organization_id, 'project.write') and created_by = auth.uid()
);
create policy wpi_projects_update on public.wpi_projects
for update to authenticated using (private.wpi_has_permission(organization_id, 'project.write'))
with check (private.wpi_has_permission(organization_id, 'project.write'));
create policy wpi_projects_delete on public.wpi_projects
for delete to authenticated using (private.wpi_has_permission(organization_id, 'project.write'));
create policy wpi_reports_read on public.wpi_reports
for select to authenticated using (private.wpi_has_permission(organization_id, 'report.read'));
create policy wpi_reports_insert on public.wpi_reports
for insert to authenticated with check (
  private.wpi_has_permission(organization_id, 'report.write') and created_by = auth.uid()
);
create policy wpi_reports_update on public.wpi_reports
for update to authenticated using (private.wpi_has_permission(organization_id, 'report.write'))
with check (private.wpi_has_permission(organization_id, 'report.write'));
create policy wpi_reports_delete on public.wpi_reports
for delete to authenticated using (private.wpi_has_permission(organization_id, 'report.write'));
create policy wpi_attachments_read on public.wpi_attachments
for select to authenticated using (private.wpi_has_permission(organization_id, 'file.read'));
create policy wpi_attachments_write on public.wpi_attachments
for insert to authenticated with check (
  private.wpi_has_permission(organization_id, 'file.write') and uploaded_by = auth.uid()
);
create policy wpi_attachments_delete on public.wpi_attachments
for delete to authenticated using (private.wpi_has_permission(organization_id, 'file.delete'));
create policy wpi_audit_read on public.wpi_audit_logs
for select to authenticated using (
  organization_id is not null and private.wpi_has_permission(organization_id, 'audit.read')
);

revoke all on
  public.wpi_profiles,
  public.wpi_organizations,
  public.wpi_organization_members,
  public.wpi_role_permissions,
  public.wpi_suppliers,
  public.wpi_supplier_contacts,
  public.wpi_supplier_reviews,
  public.wpi_equipment_prices,
  public.wpi_material_prices,
  public.wpi_inquiries,
  public.wpi_inquiry_items,
  public.wpi_inquiry_suppliers,
  public.wpi_projects,
  public.wpi_reports,
  public.wpi_attachments,
  public.wpi_audit_logs
from anon;
grant select, insert, update, delete on
  public.wpi_profiles,
  public.wpi_organizations,
  public.wpi_organization_members,
  public.wpi_suppliers,
  public.wpi_supplier_contacts,
  public.wpi_supplier_reviews,
  public.wpi_equipment_prices,
  public.wpi_material_prices,
  public.wpi_inquiries,
  public.wpi_inquiry_items,
  public.wpi_inquiry_suppliers,
  public.wpi_projects,
  public.wpi_reports,
  public.wpi_attachments
to authenticated;
grant select on public.wpi_role_permissions, public.wpi_audit_logs to authenticated;
grant usage, select on sequence public.wpi_audit_logs_id_seq to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'business-documents',
    'business-documents',
    false,
    52428800,
    array[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png'
    ]
  ),
  (
    'report-exports',
    'report-exports',
    false,
    52428800,
    array[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy wpi_storage_read on storage.objects
for select to authenticated using (
  bucket_id in ('business-documents', 'report-exports')
  and private.wpi_has_permission(private.wpi_storage_org_id(name), 'file.read')
);
create policy wpi_storage_insert on storage.objects
for insert to authenticated with check (
  bucket_id in ('business-documents', 'report-exports')
  and private.wpi_has_permission(private.wpi_storage_org_id(name), 'file.write')
);
create policy wpi_storage_update on storage.objects
for update to authenticated using (
  bucket_id in ('business-documents', 'report-exports')
  and private.wpi_has_permission(private.wpi_storage_org_id(name), 'file.write')
)
with check (
  bucket_id in ('business-documents', 'report-exports')
  and private.wpi_has_permission(private.wpi_storage_org_id(name), 'file.write')
);
create policy wpi_storage_delete on storage.objects
for delete to authenticated using (
  bucket_id in ('business-documents', 'report-exports')
  and private.wpi_has_permission(private.wpi_storage_org_id(name), 'file.delete')
);
