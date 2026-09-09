-- A cron job observes itself while its current run is still `running`.
-- Only terminal non-success states are failures; otherwise the assurance job
-- creates a false component warning on every health capture.

do $migration$
declare
  function_definition text;
  updated_definition text;
begin
  select pg_get_functiondef(
    'public.wpi_get_ai_automation_health(uuid)'::regprocedure
  ) into function_definition;

  updated_definition := replace(
    function_definition,
    $old$details.status <> 'succeeded'$old$,
    $new$details.status not in ('succeeded', 'running')$new$
  );

  if updated_definition = function_definition then
    raise exception 'Unable to exclude running cron executions from failure totals';
  end if;

  execute updated_definition;
end;
$migration$;

comment on function public.wpi_get_ai_automation_health(uuid) is
  'Organization-scoped automation health snapshot; active cron executions are not counted as failures.';
