create table if not exists public.wpi_inquiry_webhook_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.wpi_organizations(id) on delete cascade,
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  provider_message_id text,
  processing_status text not null default 'received'
    check (processing_status in ('received', 'processing', 'completed', 'ignored', 'failed')),
  payload jsonb not null default '{}'::jsonb,
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, provider_event_id)
);

alter table public.wpi_inquiry_inbound_emails
  add column if not exists recipients text[] not null default '{}'::text[],
  add column if not exists attachment_ids uuid[] not null default '{}'::uuid[],
  add column if not exists provider_event_id text;

create index if not exists wpi_inquiry_webhook_events_org_received_idx
  on public.wpi_inquiry_webhook_events (organization_id, received_at desc);
create index if not exists wpi_inquiry_webhook_events_message_idx
  on public.wpi_inquiry_webhook_events (provider_message_id)
  where provider_message_id is not null;

alter table public.wpi_inquiry_webhook_events enable row level security;
create policy wpi_inquiry_webhook_events_read on public.wpi_inquiry_webhook_events
for select to authenticated
using (
  organization_id is not null
  and private.wpi_has_permission(organization_id, 'inquiry.read')
);
revoke all on public.wpi_inquiry_webhook_events from anon;
grant select on public.wpi_inquiry_webhook_events to authenticated;
grant select, insert, update, delete on public.wpi_inquiry_webhook_events to service_role;

alter table public.wpi_inquiry_events drop constraint if exists wpi_inquiry_events_status_check;
alter table public.wpi_inquiry_events add constraint wpi_inquiry_events_status_check
check (event_status in ('pending', 'running', 'completed', 'needs_review', 'failed'));

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'wpi_inquiry_reminder_cron_secret') then
    perform vault.create_secret(
      replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
      'wpi_inquiry_reminder_cron_secret',
      'Secret used only by the WPI inquiry reminder scheduler and Edge Function'
    );
  end if;
end;
$$;

create or replace function public.wpi_verify_inquiry_reminder_cron_secret(candidate_secret text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from vault.decrypted_secrets
    where name = 'wpi_inquiry_reminder_cron_secret'
      and decrypted_secret = candidate_secret
  );
$$;

revoke all on function public.wpi_verify_inquiry_reminder_cron_secret(text)
  from public, anon, authenticated;
grant execute on function public.wpi_verify_inquiry_reminder_cron_secret(text)
  to service_role;

do $$
declare existing_job bigint;
begin
  select jobid into existing_job from cron.job
  where jobname = 'wpi-inquiry-reminders-due' limit 1;
  if existing_job is not null then perform cron.unschedule(existing_job); end if;
end;
$$;

select cron.schedule(
  'wpi-inquiry-reminders-due',
  '*/15 * * * *',
  $command$
    select net.http_post(
      url := 'https://tkyvafheqyshbjqnzbgq.supabase.co/functions/v1/wpi-inquiry-reminder-runner',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-wpi-cron-secret', (
          select decrypted_secret from vault.decrypted_secrets
          where name = 'wpi_inquiry_reminder_cron_secret' limit 1
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    );
  $command$
);

comment on table public.wpi_inquiry_webhook_events is
  'Idempotent Resend webhook inbox. Raw events are retained for delivery and inbound-mail audit.';;
