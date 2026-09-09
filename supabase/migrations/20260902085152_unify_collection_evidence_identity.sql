create or replace function private.wpi_prepare_collection_evidence_observation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  stable_url text;
  subject_identity text;
begin
  stable_url := lower(coalesce(nullif(btrim(new.canonical_url), ''), nullif(btrim(new.source_url), '')));
  subject_identity := coalesce(new.lead_id::text, 'unlinked');
  if stable_url is not null then
    new.observation_key := md5(concat_ws('|', new.task_id, subject_identity, new.source_id, stable_url));
  else
    new.observation_key := null;
  end if;
  new.first_seen_at := coalesce(new.first_seen_at, new.fetched_at, now());
  new.last_seen_at := coalesce(new.last_seen_at, new.fetched_at, now());
  new.observation_count := greatest(coalesce(new.observation_count, 1), 1);
  return new;
end;
$$;

drop index if exists public.wpi_collection_evidence_observation_key_uidx;

alter table public.wpi_price_collection_evidence
  drop constraint if exists wpi_price_collection_evidence_org_task_content_hash_key;

update public.wpi_price_collection_evidence
set source_url = source_url;

with ranked as (
  select id,
         first_value(id) over (
           partition by organization_id, task_id, observation_key
           order by coalesce(last_seen_at, fetched_at, created_at) desc, id desc
         ) as keeper_id,
         min(coalesce(first_seen_at, fetched_at, created_at)) over (
           partition by organization_id, task_id, observation_key
         ) as earliest_seen,
         max(coalesce(last_seen_at, fetched_at, created_at)) over (
           partition by organization_id, task_id, observation_key
         ) as latest_seen,
         sum(greatest(observation_count, 1)) over (
           partition by organization_id, task_id, observation_key
         ) as total_observations
  from public.wpi_price_collection_evidence
  where observation_key is not null
), aggregates as (
  select distinct keeper_id, earliest_seen, latest_seen, total_observations
  from ranked
)
update public.wpi_price_collection_evidence evidence
set first_seen_at = aggregates.earliest_seen,
    last_seen_at = aggregates.latest_seen,
    observation_count = aggregates.total_observations
from aggregates
where evidence.id = aggregates.keeper_id;

with ranked as (
  select id,
         first_value(id) over (
           partition by organization_id, task_id, observation_key
           order by coalesce(last_seen_at, fetched_at, created_at) desc, id desc
         ) as keeper_id
  from public.wpi_price_collection_evidence
  where observation_key is not null
)
delete from public.wpi_price_collection_evidence evidence
using ranked
where evidence.id = ranked.id
  and ranked.id <> ranked.keeper_id;

create unique index wpi_collection_evidence_observation_key_uidx
  on public.wpi_price_collection_evidence (organization_id, task_id, observation_key);

create index if not exists wpi_collection_evidence_content_hash_idx
  on public.wpi_price_collection_evidence (organization_id, task_id, content_hash);

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
    $old$on conflict
  do update$old$,
    $new$on conflict (organization_id, task_id, observation_key)
  do update$new$
  );

  if updated_definition = function_definition then
    raise exception 'Unable to restore collection evidence observation conflict target';
  end if;

  execute updated_definition;
end;
$migration$;

comment on column public.wpi_price_collection_evidence.observation_key is
  'Stable task/subject/source/url identity for both linked price observations and unlinked discovery artifacts.';


