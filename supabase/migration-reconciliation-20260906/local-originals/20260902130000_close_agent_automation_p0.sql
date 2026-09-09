-- P0 closure: make repeated collection observations idempotent across both
-- the legacy content identity and the newer lead/source observation identity.
do $migration$
declare
  function_definition text;
  updated_definition text;
begin
  select pg_get_functiondef(
    'public.wpi_ingest_price_collection_candidate(uuid,uuid,uuid,jsonb,jsonb)'::regprocedure
  ) into function_definition;

  updated_definition := replace(
    function_definition,
    $old$on conflict (organization_id, task_id, observation_key)
    WHERE (observation_key IS NOT NULL)$old$,
    'on conflict'
  );

  if updated_definition = function_definition then
    updated_definition := replace(
      function_definition,
      $old$on conflict (organization_id, task_id, observation_key)
    where observation_key is not null$old$,
      'on conflict'
    );
  end if;

  if updated_definition = function_definition then
    raise exception 'Unable to make collection evidence ingest conflict-safe';
  end if;

  execute updated_definition;
end;
$migration$;

-- A partial parent run is a terminal business outcome. It must not remain in
-- active health counts or be refreshed forever by the stale-run reconciler.
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
    $old$run.status = ANY (ARRAY['queued'::text, 'running'::text, 'partial'::text])$old$,
    $new$run.status = ANY (ARRAY['queued'::text, 'running'::text])$new$
  );
  updated_definition := replace(
    updated_definition,
    $old$run.status in ('queued', 'running', 'partial')$old$,
    $new$run.status in ('queued', 'running')$new$
  );

  if updated_definition = function_definition then
    raise exception 'Unable to correct active parent-run health status';
  end if;

  execute updated_definition;
end;
$migration$;

do $migration$
declare
  function_definition text;
  updated_definition text;
begin
  select pg_get_functiondef(
    'public.wpi_reconcile_stale_price_collection_runs(interval)'::regprocedure
  ) into function_definition;

  updated_definition := replace(
    function_definition,
    $old$parent_run.status = ANY (ARRAY['queued'::text, 'running'::text, 'partial'::text])$old$,
    $new$parent_run.status = ANY (ARRAY['queued'::text, 'running'::text])$new$
  );
  updated_definition := replace(
    updated_definition,
    $old$parent_run.status in ('queued', 'running', 'partial')$old$,
    $new$parent_run.status in ('queued', 'running')$new$
  );

  if updated_definition = function_definition then
    raise exception 'Unable to stop terminal partial parent reconciliation';
  end if;

  execute updated_definition;
end;
$migration$;

comment on function public.wpi_ingest_price_collection_candidate(uuid, uuid, uuid, jsonb, jsonb) is
  'Incremental candidate ingest. Repeated evidence is merged through either legacy content identity or task/lead/source observation identity.';
