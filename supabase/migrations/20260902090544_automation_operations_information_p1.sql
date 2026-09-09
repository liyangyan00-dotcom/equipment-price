-- Include the assurance heartbeat itself in the same operational contract as
-- collection, reminders, and stale-run reconciliation.
do $migration$
declare
  function_definition text;
  updated_definition text;
  old_jobs text := $jobs$'wpi-price-collection-due',
      'wpi-inquiry-reminders-due',
      'wpi-reconcile-stale-ai-gateway-runs'$jobs$;
  new_jobs text := $jobs$'wpi-price-collection-due',
      'wpi-inquiry-reminders-due',
      'wpi-reconcile-stale-ai-gateway-runs',
      'wpi-capture-automation-health'$jobs$;
begin
  select pg_get_functiondef(
    'public.wpi_get_ai_automation_health(uuid)'::regprocedure
  ) into function_definition;

  updated_definition := replace(function_definition, old_jobs, new_jobs);
  if updated_definition = function_definition then
    raise exception 'Unable to add assurance cron to automation health';
  end if;

  execute updated_definition;
end;
$migration$;

comment on function public.wpi_get_ai_automation_health(uuid) is
  'Organization-scoped operational snapshot covering workflow admission, integrations, all automation cron jobs, failures, and collection runs.';


