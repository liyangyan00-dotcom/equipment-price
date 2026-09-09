alter table public.wpi_inquiries
  add column if not exists base_currency text not null default 'USD',
  add column if not exists comparison_date date not null default current_date;

alter table public.wpi_comparisons
  add column if not exists base_currency text not null default 'USD',
  add column if not exists comparison_date date not null default current_date;

alter table public.wpi_comparison_quotes
  add column if not exists exchange_rate numeric(20,8),
  add column if not exists exchange_rate_date date,
  add column if not exists exchange_rate_source text;

create table if not exists public.wpi_inquiry_portal_tokens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  inquiry_id uuid not null references public.wpi_inquiries(id) on delete cascade,
  supplier_id uuid not null references public.wpi_suppliers(id) on delete cascade,
  token_hash text not null unique,
  status text not null default 'active' check (status in ('active', 'submitted', 'revoked', 'expired')),
  expires_at timestamptz not null,
  opened_at timestamptz,
  submitted_at timestamptz,
  last_ip inet,
  last_user_agent text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wpi_inquiry_item_quotes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  inquiry_id uuid not null references public.wpi_inquiries(id) on delete cascade,
  inquiry_item_id uuid not null references public.wpi_inquiry_items(id) on delete cascade,
  supplier_id uuid not null references public.wpi_suppliers(id) on delete cascade,
  quantity numeric(18,4) not null check (quantity > 0),
  unit text,
  unit_price numeric(18,4) not null check (unit_price >= 0),
  total_amount numeric(18,2) generated always as (round(quantity * unit_price, 2)) stored,
  currency text not null,
  delivery_days integer check (delivery_days is null or delivery_days >= 0),
  technical_deviation text,
  commercial_deviation text,
  validity_days integer check (validity_days is null or validity_days > 0),
  evidence_attachment_ids uuid[] not null default '{}'::uuid[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (inquiry_item_id, supplier_id)
);

create table if not exists public.wpi_inquiry_reminder_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  inquiry_id uuid not null references public.wpi_inquiries(id) on delete cascade unique,
  enabled boolean not null default true,
  interval_hours integer not null default 48 check (interval_hours between 1 and 720),
  max_reminders integer not null default 3 check (max_reminders between 0 and 20),
  reminder_count integer not null default 0 check (reminder_count >= 0),
  next_run_at timestamptz,
  escalate_after_deadline_hours integer not null default 24 check (escalate_after_deadline_hours between 0 and 720),
  escalation_owner_id uuid references auth.users(id) on delete set null,
  last_run_at timestamptz,
  last_error text,
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wpi_exchange_rates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  base_currency text not null,
  quote_currency text not null,
  rate numeric(20,8) not null check (rate > 0),
  rate_date date not null,
  source text not null,
  is_verified boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, base_currency, quote_currency, rate_date, source),
  check (base_currency <> quote_currency)
);

create table if not exists public.wpi_inquiry_inbound_emails (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  inquiry_id uuid references public.wpi_inquiries(id) on delete set null,
  supplier_id uuid references public.wpi_suppliers(id) on delete set null,
  provider text not null,
  provider_message_id text not null,
  in_reply_to text,
  sender_email text not null,
  subject text,
  received_at timestamptz not null,
  body_text text,
  attachment_count integer not null default 0 check (attachment_count >= 0),
  processing_status text not null default 'received' check (processing_status in ('received', 'processing', 'completed', 'needs_review', 'failed')),
  quote_document_id uuid references public.wpi_quote_documents(id) on delete set null,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider, provider_message_id)
);

create index if not exists wpi_portal_tokens_lookup_idx on public.wpi_inquiry_portal_tokens (token_hash, status, expires_at);
create unique index if not exists wpi_portal_tokens_active_supplier_idx
  on public.wpi_inquiry_portal_tokens (inquiry_id, supplier_id)
  where status = 'active';
create index if not exists wpi_item_quotes_inquiry_supplier_idx on public.wpi_inquiry_item_quotes (organization_id, inquiry_id, supplier_id);
create index if not exists wpi_reminder_policies_due_idx on public.wpi_inquiry_reminder_policies (enabled, next_run_at) where enabled;
create index if not exists wpi_exchange_rates_lookup_idx on public.wpi_exchange_rates (organization_id, base_currency, quote_currency, rate_date desc);
create index if not exists wpi_inbound_emails_inquiry_idx on public.wpi_inquiry_inbound_emails (organization_id, inquiry_id, received_at desc);
create index if not exists wpi_inbound_emails_reply_idx on public.wpi_inquiry_inbound_emails (in_reply_to) where in_reply_to is not null;

drop trigger if exists wpi_inquiry_portal_tokens_updated_at on public.wpi_inquiry_portal_tokens;
create trigger wpi_inquiry_portal_tokens_updated_at before update on public.wpi_inquiry_portal_tokens
for each row execute function private.wpi_set_updated_at();
drop trigger if exists wpi_inquiry_item_quotes_updated_at on public.wpi_inquiry_item_quotes;
create trigger wpi_inquiry_item_quotes_updated_at before update on public.wpi_inquiry_item_quotes
for each row execute function private.wpi_set_updated_at();
drop trigger if exists wpi_inquiry_reminder_policies_updated_at on public.wpi_inquiry_reminder_policies;
create trigger wpi_inquiry_reminder_policies_updated_at before update on public.wpi_inquiry_reminder_policies
for each row execute function private.wpi_set_updated_at();
drop trigger if exists wpi_inquiry_inbound_emails_updated_at on public.wpi_inquiry_inbound_emails;
create trigger wpi_inquiry_inbound_emails_updated_at before update on public.wpi_inquiry_inbound_emails
for each row execute function private.wpi_set_updated_at();

alter table public.wpi_inquiry_portal_tokens enable row level security;
alter table public.wpi_inquiry_item_quotes enable row level security;
alter table public.wpi_inquiry_reminder_policies enable row level security;
alter table public.wpi_exchange_rates enable row level security;
alter table public.wpi_inquiry_inbound_emails enable row level security;

create policy wpi_portal_tokens_read on public.wpi_inquiry_portal_tokens for select to authenticated
using (private.wpi_has_permission(organization_id, 'inquiry.read'));
create policy wpi_portal_tokens_write on public.wpi_inquiry_portal_tokens for all to authenticated
using (private.wpi_has_permission(organization_id, 'inquiry.write'))
with check (private.wpi_has_permission(organization_id, 'inquiry.write'));

create policy wpi_item_quotes_read on public.wpi_inquiry_item_quotes for select to authenticated
using (private.wpi_has_permission(organization_id, 'inquiry.read'));
create policy wpi_item_quotes_write on public.wpi_inquiry_item_quotes for all to authenticated
using (private.wpi_has_permission(organization_id, 'inquiry.write'))
with check (private.wpi_has_permission(organization_id, 'inquiry.write'));

create policy wpi_reminder_policies_read on public.wpi_inquiry_reminder_policies for select to authenticated
using (private.wpi_has_permission(organization_id, 'inquiry.read'));
create policy wpi_reminder_policies_write on public.wpi_inquiry_reminder_policies for all to authenticated
using (private.wpi_has_permission(organization_id, 'inquiry.write'))
with check (private.wpi_has_permission(organization_id, 'inquiry.write'));

create policy wpi_exchange_rates_read on public.wpi_exchange_rates for select to authenticated
using (private.wpi_is_org_member(organization_id));
create policy wpi_exchange_rates_write on public.wpi_exchange_rates for all to authenticated
using (private.wpi_has_permission(organization_id, 'settings.manage'))
with check (private.wpi_has_permission(organization_id, 'settings.manage'));

create policy wpi_inbound_emails_read on public.wpi_inquiry_inbound_emails for select to authenticated
using (private.wpi_has_permission(organization_id, 'inquiry.read'));
create policy wpi_inbound_emails_write on public.wpi_inquiry_inbound_emails for all to authenticated
using (private.wpi_has_permission(organization_id, 'inquiry.write'))
with check (private.wpi_has_permission(organization_id, 'inquiry.write'));

grant select, insert, update, delete on public.wpi_inquiry_portal_tokens, public.wpi_inquiry_item_quotes,
  public.wpi_inquiry_reminder_policies, public.wpi_exchange_rates, public.wpi_inquiry_inbound_emails to authenticated;

alter table public.wpi_inquiry_events drop constraint if exists wpi_inquiry_events_type_check;
alter table public.wpi_inquiry_events add constraint wpi_inquiry_events_type_check check (event_type in (
  'created', 'submitted', 'approved', 'sent', 'delivered', 'opened', 'replied',
  'reminded', 'send_failed', 'bounced', 'quote_recorded', 'quote_attachment_added',
  'comparison_generated', 'comparison_decided', 'retry_requested', 'portal_opened',
  'portal_submitted', 'reminder_escalated', 'inbound_email_received', 'attachment_ingested'
));

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'wpi_inquiry_item_quotes') then
    alter publication supabase_realtime add table public.wpi_inquiry_item_quotes;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'wpi_inquiry_inbound_emails') then
    alter publication supabase_realtime add table public.wpi_inquiry_inbound_emails;
  end if;
end $$;

alter table public.wpi_inquiry_item_quotes replica identity full;
alter table public.wpi_inquiry_inbound_emails replica identity full;

;
