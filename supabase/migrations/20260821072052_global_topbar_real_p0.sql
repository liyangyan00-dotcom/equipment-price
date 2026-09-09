create table public.wpi_user_preferences (
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  ai_mode text not null default 'human_review'
    check (ai_mode in ('human_review', 'assisted')),
  notifications_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.wpi_notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  dedupe_key text not null,
  category text not null default 'system'
    check (category in ('system', 'review', 'risk', 'ai', 'inquiry', 'report')),
  title text not null,
  message text,
  href text,
  is_read boolean not null default false,
  read_at timestamptz,
  created_by uuid references auth.users(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, recipient_id, dedupe_key)
);

create index wpi_notifications_recipient_unread_idx
  on public.wpi_notifications (recipient_id, organization_id, is_read, created_at desc);

alter table public.wpi_user_preferences enable row level security;
alter table public.wpi_notifications enable row level security;

create policy wpi_user_preferences_select_self
on public.wpi_user_preferences
for select to authenticated
using (
  user_id = (select auth.uid())
  and private.wpi_is_org_member(organization_id)
);

create policy wpi_user_preferences_insert_self
on public.wpi_user_preferences
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and private.wpi_is_org_member(organization_id)
);

create policy wpi_user_preferences_update_self
on public.wpi_user_preferences
for update to authenticated
using (
  user_id = (select auth.uid())
  and private.wpi_is_org_member(organization_id)
)
with check (
  user_id = (select auth.uid())
  and private.wpi_is_org_member(organization_id)
);

create policy wpi_notifications_select_recipient
on public.wpi_notifications
for select to authenticated
using (
  recipient_id = (select auth.uid())
  and private.wpi_is_org_member(organization_id)
);

create policy wpi_notifications_insert_self
on public.wpi_notifications
for insert to authenticated
with check (
  recipient_id = (select auth.uid())
  and private.wpi_is_org_member(organization_id)
);

create policy wpi_notifications_update_recipient
on public.wpi_notifications
for update to authenticated
using (
  recipient_id = (select auth.uid())
  and private.wpi_is_org_member(organization_id)
)
with check (
  recipient_id = (select auth.uid())
  and private.wpi_is_org_member(organization_id)
);

create policy wpi_notifications_delete_recipient
on public.wpi_notifications
for delete to authenticated
using (
  recipient_id = (select auth.uid())
  and private.wpi_is_org_member(organization_id)
);

create trigger wpi_user_preferences_updated_at
before update on public.wpi_user_preferences
for each row execute function private.wpi_set_updated_at();

create trigger wpi_user_preferences_audit
after insert or update or delete on public.wpi_user_preferences
for each row execute function private.wpi_audit_row_change();

create trigger wpi_notifications_updated_at
before update on public.wpi_notifications
for each row execute function private.wpi_set_updated_at();

revoke all on public.wpi_user_preferences, public.wpi_notifications from anon;
grant select, insert, update on public.wpi_user_preferences to authenticated;
grant select, insert, update, delete on public.wpi_notifications to authenticated;

;
