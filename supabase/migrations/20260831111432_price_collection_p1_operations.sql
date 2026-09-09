alter table public.wpi_price_collection_evidence
  add column if not exists observation_key text,
  add column if not exists first_seen_at timestamptz,
  add column if not exists last_seen_at timestamptz,
  add column if not exists observation_count integer not null default 1;

update public.wpi_price_collection_evidence
set first_seen_at = coalesce(first_seen_at, fetched_at, created_at),
    last_seen_at = coalesce(last_seen_at, fetched_at, created_at),
    observation_count = greatest(observation_count, 1)
where first_seen_at is null or last_seen_at is null or observation_count < 1;

with ranked as (
  select id,
         first_value(id) over (
           partition by organization_id, task_id, lead_id, source_id,
             lower(coalesce(nullif(canonical_url, ''), nullif(source_url, '')))
           order by coalesce(fetched_at, created_at) desc, created_at desc, id desc
         ) as keeper_id,
         min(coalesce(first_seen_at, fetched_at, created_at)) over (
           partition by organization_id, task_id, lead_id, source_id,
             lower(coalesce(nullif(canonical_url, ''), nullif(source_url, '')))
         ) as earliest_seen,
         max(coalesce(last_seen_at, fetched_at, created_at)) over (
           partition by organization_id, task_id, lead_id, source_id,
             lower(coalesce(nullif(canonical_url, ''), nullif(source_url, '')))
         ) as latest_seen,
         sum(greatest(observation_count, 1)) over (
           partition by organization_id, task_id, lead_id, source_id,
             lower(coalesce(nullif(canonical_url, ''), nullif(source_url, '')))
         ) as total_observations
  from public.wpi_price_collection_evidence
  where lead_id is not null
    and coalesce(nullif(canonical_url, ''), nullif(source_url, '')) is not null
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
           partition by organization_id, task_id, lead_id, source_id,
             lower(coalesce(nullif(canonical_url, ''), nullif(source_url, '')))
           order by coalesce(fetched_at, created_at) desc, created_at desc, id desc
         ) as keeper_id
  from public.wpi_price_collection_evidence
  where lead_id is not null
    and coalesce(nullif(canonical_url, ''), nullif(source_url, '')) is not null
)
delete from public.wpi_price_collection_evidence evidence
using ranked
where evidence.id = ranked.id
  and ranked.id <> ranked.keeper_id;

create or replace function private.wpi_prepare_collection_evidence_observation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  stable_url text;
begin
  stable_url := lower(coalesce(nullif(btrim(new.canonical_url), ''), nullif(btrim(new.source_url), '')));
  if new.lead_id is not null and stable_url is not null then
    new.observation_key := md5(concat_ws('|', new.task_id, new.lead_id, new.source_id, stable_url));
  else
    new.observation_key := null;
  end if;
  new.first_seen_at := coalesce(new.first_seen_at, new.fetched_at, now());
  new.last_seen_at := coalesce(new.last_seen_at, new.fetched_at, now());
  new.observation_count := greatest(coalesce(new.observation_count, 1), 1);
  return new;
end;
$$;

drop trigger if exists wpi_prepare_collection_evidence_observation on public.wpi_price_collection_evidence;
create trigger wpi_prepare_collection_evidence_observation
before insert or update of task_id, lead_id, source_id, source_url, canonical_url, fetched_at
on public.wpi_price_collection_evidence
for each row execute function private.wpi_prepare_collection_evidence_observation();

update public.wpi_price_collection_evidence
set source_url = source_url;

create unique index if not exists wpi_collection_evidence_observation_key_uidx
  on public.wpi_price_collection_evidence (organization_id, task_id, observation_key)
  where observation_key is not null;

create or replace function private.wpi_default_collection_lead_review()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  task_owner uuid;
begin
  if new.status = 'pending_review' and new.task_id is not null then
    select task.created_by into task_owner
    from public.wpi_price_collection_tasks task
    where task.id = new.task_id
      and task.organization_id = new.organization_id;

    if new.assigned_reviewer_id is null and task_owner is not null then
      new.assigned_reviewer_id := task_owner;
      new.assigned_at := coalesce(new.assigned_at, now());
      new.assigned_by := coalesce(new.assigned_by, task_owner);
      new.assignment_note := coalesce(nullif(new.assignment_note, ''), '采集任务创建人默认负责首次审核');
    end if;
    new.review_due_at := coalesce(new.review_due_at, now() + interval '48 hours');
  end if;
  return new;
end;
$$;

drop trigger if exists wpi_default_collection_lead_review on public.wpi_price_collection_leads;
create trigger wpi_default_collection_lead_review
before insert on public.wpi_price_collection_leads
for each row execute function private.wpi_default_collection_lead_review();

update public.wpi_price_collection_leads lead
set assigned_reviewer_id = task.created_by,
    assigned_at = coalesce(lead.assigned_at, now()),
    assigned_by = coalesce(lead.assigned_by, task.created_by),
    assignment_note = coalesce(nullif(lead.assignment_note, ''), '采集任务创建人默认负责首次审核'),
    review_due_at = coalesce(lead.review_due_at, now() + interval '48 hours')
from public.wpi_price_collection_tasks task
where lead.task_id = task.id
  and lead.organization_id = task.organization_id
  and lead.status = 'pending_review'
  and (lead.assigned_reviewer_id is null or lead.review_due_at is null);

do $migration$
declare
  function_definition text;
  old_block text;
  new_block text;
begin
  select pg_get_functiondef(
    'public.wpi_ingest_price_collection_candidate(uuid,uuid,uuid,jsonb,jsonb)'::regprocedure
  ) into function_definition;

  old_block := $old$on conflict (organization_id, task_id, content_hash) do update
    set lead_id = excluded.lead_id,
        run_id = excluded.run_id,
        fetched_at = excluded.fetched_at,
        metadata = public.wpi_price_collection_evidence.metadata || excluded.metadata$old$;
  new_block := $new$on conflict (organization_id, task_id, observation_key)
    where observation_key is not null
  do update
    set lead_id = excluded.lead_id,
        run_id = excluded.run_id,
        source_id = excluded.source_id,
        source_url = excluded.source_url,
        canonical_url = excluded.canonical_url,
        page_title = excluded.page_title,
        excerpt = excluded.excerpt,
        content_hash = excluded.content_hash,
        http_status = excluded.http_status,
        mime_type = excluded.mime_type,
        fetched_at = excluded.fetched_at,
        last_seen_at = excluded.fetched_at,
        observation_count = public.wpi_price_collection_evidence.observation_count + 1,
        metadata = public.wpi_price_collection_evidence.metadata || excluded.metadata || jsonb_build_object(
          'previousContentHash', public.wpi_price_collection_evidence.content_hash,
          'incrementalObservation', true
        )$new$;

  if position(old_block in function_definition) = 0 then
    raise exception 'Unable to update collection evidence observation conflict target';
  end if;

  execute replace(function_definition, old_block, new_block);
end;
$migration$;

comment on column public.wpi_price_collection_evidence.observation_key is
  'Stable task/lead/source/url identity used to merge repeated collector observations.';
comment on column public.wpi_price_collection_evidence.observation_count is
  'Number of collector observations merged into this evidence record.';


