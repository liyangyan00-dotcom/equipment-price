create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

do $$
begin
  if not exists (
    select 1 from vault.secrets where name = 'wpi_collection_cron_secret'
  ) then
    perform vault.create_secret(
      replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
      'wpi_collection_cron_secret',
      'Secret used only by the WPI collection scheduler and Edge Function'
    );
  end if;
end;
$$;

create or replace function public.wpi_verify_collection_cron_secret(candidate_secret text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from vault.decrypted_secrets
    where name = 'wpi_collection_cron_secret'
      and decrypted_secret = candidate_secret
  );
$$;

revoke all on function public.wpi_verify_collection_cron_secret(text) from public, anon, authenticated;
grant execute on function public.wpi_verify_collection_cron_secret(text) to service_role;

do $$
declare
  existing_job bigint;
begin
  select jobid into existing_job
  from cron.job
  where jobname = 'wpi-price-collection-due'
  limit 1;

  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;
end;
$$;

select cron.schedule(
  'wpi-price-collection-due',
  '*/5 * * * *',
  $command$
    select net.http_post(
      url := 'https://tkyvafheqyshbjqnzbgq.supabase.co/functions/v1/wpi-price-collector',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-wpi-cron-secret', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'wpi_collection_cron_secret'
          limit 1
        )
      ),
      body := '{"action":"run_due","batchSize":5}'::jsonb,
      timeout_milliseconds := 30000
    );
  $command$
);
