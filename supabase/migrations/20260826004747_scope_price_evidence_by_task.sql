alter table public.wpi_price_collection_evidence
  drop constraint if exists wpi_price_collection_evidence_organization_id_content_hash_key;

alter table public.wpi_price_collection_evidence
  add constraint wpi_price_collection_evidence_org_task_content_hash_key
  unique (organization_id, task_id, content_hash);

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
    'on conflict (organization_id, content_hash)',
    'on conflict (organization_id, task_id, content_hash)'
  );

  if updated_definition = function_definition then
    raise exception 'Unable to update price evidence conflict target';
  end if;

  execute updated_definition;
end;
$migration$;;
