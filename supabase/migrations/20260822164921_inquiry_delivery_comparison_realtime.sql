alter table public.wpi_inquiry_suppliers
  add column if not exists delivery_status text not null default 'not_sent',
  add column if not exists sent_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists opened_at timestamptz,
  add column if not exists replied_at timestamptz,
  add column if not exists last_reminded_at timestamptz,
  add column if not exists provider_message_id text,
  add column if not exists send_attempts integer not null default 0,
  add column if not exists last_error text;

alter table public.wpi_inquiry_suppliers
  drop constraint if exists wpi_inquiry_suppliers_delivery_status_check,
  add constraint wpi_inquiry_suppliers_delivery_status_check
  check (delivery_status in ('not_sent', 'queued', 'sent', 'delivered', 'opened', 'replied', 'failed', 'bounced')),
  drop constraint if exists wpi_inquiry_suppliers_send_attempts_check,
  add constraint wpi_inquiry_suppliers_send_attempts_check check (send_attempts >= 0);

create index if not exists wpi_inquiry_suppliers_delivery_idx
  on public.wpi_inquiry_suppliers (organization_id, delivery_status, sent_at desc);
create index if not exists wpi_inquiry_suppliers_provider_message_idx
  on public.wpi_inquiry_suppliers (provider_message_id)
  where provider_message_id is not null;

create table if not exists public.wpi_inquiry_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  inquiry_id uuid not null references public.wpi_inquiries(id) on delete cascade,
  supplier_id uuid references public.wpi_suppliers(id) on delete set null,
  event_type text not null,
  event_status text not null default 'completed',
  actor_id uuid references auth.users(id) on delete set null,
  provider text,
  provider_message_id text,
  error_message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint wpi_inquiry_events_type_check check (event_type in (
    'created', 'submitted', 'approved', 'sent', 'delivered', 'opened', 'replied',
    'reminded', 'send_failed', 'bounced', 'quote_recorded', 'quote_attachment_added',
    'comparison_generated', 'comparison_decided', 'retry_requested'
  )),
  constraint wpi_inquiry_events_status_check check (event_status in ('pending', 'running', 'completed', 'failed'))
);

create index if not exists wpi_inquiry_events_timeline_idx
  on public.wpi_inquiry_events (organization_id, inquiry_id, created_at desc);
create index if not exists wpi_inquiry_events_provider_idx
  on public.wpi_inquiry_events (provider_message_id)
  where provider_message_id is not null;

create table if not exists public.wpi_comparisons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  inquiry_id uuid not null references public.wpi_inquiries(id) on delete cascade,
  comparison_code text not null,
  status text not null default 'draft',
  currency text,
  lowest_amount numeric(18,2),
  highest_amount numeric(18,2),
  spread_rate numeric(9,4),
  recommended_supplier_id uuid references public.wpi_suppliers(id) on delete set null,
  selected_supplier_id uuid references public.wpi_suppliers(id) on delete set null,
  ai_confidence numeric(5,2) check (ai_confidence between 0 and 100),
  risk_level public.wpi_risk_level not null default 'low',
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wpi_comparisons_status_check check (status in ('draft', 'running', 'needs_review', 'decided', 'archived')),
  unique (organization_id, comparison_code),
  unique (organization_id, inquiry_id)
);

create table if not exists public.wpi_comparison_quotes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  comparison_id uuid not null references public.wpi_comparisons(id) on delete cascade,
  inquiry_id uuid not null references public.wpi_inquiries(id) on delete cascade,
  supplier_id uuid not null references public.wpi_suppliers(id) on delete cascade,
  quoted_amount numeric(18,2) not null check (quoted_amount >= 0),
  currency text not null,
  normalized_amount numeric(18,2),
  rank integer,
  commercial_score numeric(5,2) check (commercial_score between 0 and 100),
  technical_score numeric(5,2) check (technical_score between 0 and 100),
  delivery_score numeric(5,2) check (delivery_score between 0 and 100),
  total_score numeric(5,2) check (total_score between 0 and 100),
  ai_recommendation text,
  risk_level public.wpi_risk_level not null default 'low',
  is_recommended boolean not null default false,
  is_selected boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (comparison_id, supplier_id)
);

create index if not exists wpi_comparisons_inquiry_idx
  on public.wpi_comparisons (organization_id, inquiry_id);
create index if not exists wpi_comparison_quotes_rank_idx
  on public.wpi_comparison_quotes (comparison_id, rank, normalized_amount);

drop trigger if exists wpi_comparisons_updated_at on public.wpi_comparisons;
create trigger wpi_comparisons_updated_at before update on public.wpi_comparisons
for each row execute function private.wpi_set_updated_at();
drop trigger if exists wpi_comparison_quotes_updated_at on public.wpi_comparison_quotes;
create trigger wpi_comparison_quotes_updated_at before update on public.wpi_comparison_quotes
for each row execute function private.wpi_set_updated_at();

drop trigger if exists wpi_inquiry_events_audit on public.wpi_inquiry_events;
create trigger wpi_inquiry_events_audit after insert or update or delete on public.wpi_inquiry_events
for each row execute function private.wpi_audit_row_change();
drop trigger if exists wpi_comparisons_audit on public.wpi_comparisons;
create trigger wpi_comparisons_audit after insert or update or delete on public.wpi_comparisons
for each row execute function private.wpi_audit_row_change();
drop trigger if exists wpi_comparison_quotes_audit on public.wpi_comparison_quotes;
create trigger wpi_comparison_quotes_audit after insert or update or delete on public.wpi_comparison_quotes
for each row execute function private.wpi_audit_row_change();

alter table public.wpi_inquiry_events enable row level security;
alter table public.wpi_comparisons enable row level security;
alter table public.wpi_comparison_quotes enable row level security;

create policy wpi_inquiry_events_read on public.wpi_inquiry_events
for select to authenticated using (private.wpi_has_permission(organization_id, 'inquiry.read'));
create policy wpi_inquiry_events_insert on public.wpi_inquiry_events
for insert to authenticated with check (
  private.wpi_has_permission(organization_id, 'inquiry.write')
  and (actor_id is null or actor_id = (select auth.uid()))
);
create policy wpi_inquiry_events_update on public.wpi_inquiry_events
for update to authenticated using (private.wpi_has_permission(organization_id, 'inquiry.write'))
with check (private.wpi_has_permission(organization_id, 'inquiry.write'));

create policy wpi_comparisons_read on public.wpi_comparisons
for select to authenticated using (private.wpi_has_permission(organization_id, 'inquiry.read'));
create policy wpi_comparisons_insert on public.wpi_comparisons
for insert to authenticated with check (
  private.wpi_has_permission(organization_id, 'inquiry.write') and created_by = (select auth.uid())
);
create policy wpi_comparisons_update on public.wpi_comparisons
for update to authenticated using (private.wpi_has_permission(organization_id, 'inquiry.write'))
with check (private.wpi_has_permission(organization_id, 'inquiry.write'));
create policy wpi_comparisons_delete on public.wpi_comparisons
for delete to authenticated using (private.wpi_has_permission(organization_id, 'inquiry.approve'));

create policy wpi_comparison_quotes_read on public.wpi_comparison_quotes
for select to authenticated using (private.wpi_has_permission(organization_id, 'inquiry.read'));
create policy wpi_comparison_quotes_insert on public.wpi_comparison_quotes
for insert to authenticated with check (private.wpi_has_permission(organization_id, 'inquiry.write'));
create policy wpi_comparison_quotes_update on public.wpi_comparison_quotes
for update to authenticated using (private.wpi_has_permission(organization_id, 'inquiry.write'))
with check (private.wpi_has_permission(organization_id, 'inquiry.write'));
create policy wpi_comparison_quotes_delete on public.wpi_comparison_quotes
for delete to authenticated using (private.wpi_has_permission(organization_id, 'inquiry.write'));

grant select, insert, update on public.wpi_inquiry_events to authenticated;
grant select, insert, update, delete on public.wpi_comparisons, public.wpi_comparison_quotes to authenticated;

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'wpi_inquiries'
  ) then alter publication supabase_realtime add table public.wpi_inquiries; end if;
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'wpi_inquiry_suppliers'
  ) then alter publication supabase_realtime add table public.wpi_inquiry_suppliers; end if;
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'wpi_inquiry_events'
  ) then alter publication supabase_realtime add table public.wpi_inquiry_events; end if;
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'wpi_comparisons'
  ) then alter publication supabase_realtime add table public.wpi_comparisons; end if;
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'wpi_comparison_quotes'
  ) then alter publication supabase_realtime add table public.wpi_comparison_quotes; end if;
end $$;

alter table public.wpi_inquiries replica identity full;
alter table public.wpi_inquiry_suppliers replica identity full;
alter table public.wpi_inquiry_events replica identity full;
alter table public.wpi_comparisons replica identity full;
alter table public.wpi_comparison_quotes replica identity full;

;
