create extension if not exists pg_trgm with schema extensions;

alter table public.wpi_price_collection_tasks
  add column if not exists collection_mode text not null default 'web'
    check (collection_mode in ('web', 'quote_upload', 'manual', 'api')),
  add column if not exists schedule_enabled boolean not null default false,
  add column if not exists schedule_expression text,
  add column if not exists next_run_at timestamptz,
  add column if not exists last_run_at timestamptz,
  add column if not exists retry_count integer not null default 0 check (retry_count >= 0),
  add column if not exists max_retries integer not null default 3 check (max_retries between 0 and 10),
  add column if not exists retry_at timestamptz;

create table public.wpi_price_collection_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  source_code text not null,
  name text not null,
  source_kind text not null default 'web' check (source_kind in ('web', 'api')),
  base_url text not null,
  allowed_hosts text[] not null default '{}',
  allowed_path_prefixes text[] not null default array['/']::text[],
  is_active boolean not null default true,
  robots_policy text not null default 'respect' check (robots_policy in ('respect', 'manual_only')),
  rate_limit_per_minute smallint not null default 6 check (rate_limit_per_minute between 1 and 60),
  default_currency text not null default 'CNY',
  default_region text,
  quality_score numeric(5,2) not null default 75 check (quality_score between 0 and 100),
  extraction_strategy text not null default 'structured_data'
    check (extraction_strategy in ('structured_data', 'html_table', 'json_api')),
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  last_checked_at timestamptz,
  last_error text,
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, source_code),
  unique (organization_id, base_url)
);

create table public.wpi_price_collection_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  task_id uuid not null references public.wpi_price_collection_tasks(id) on delete cascade,
  run_code text not null default (
    'PCR-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISS') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
  ),
  trigger_type text not null default 'manual'
    check (trigger_type in ('manual', 'schedule', 'retry', 'upload')),
  attempt integer not null default 1 check (attempt between 1 and 20),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'partial', 'failed', 'cancelled')),
  progress smallint not null default 0 check (progress between 0 and 100),
  fetched_count integer not null default 0 check (fetched_count >= 0),
  created_lead_count integer not null default 0 check (created_lead_count >= 0),
  updated_lead_count integer not null default 0 check (updated_lead_count >= 0),
  duplicate_count integer not null default 0 check (duplicate_count >= 0),
  failed_source_count integer not null default 0 check (failed_source_count >= 0),
  current_source text,
  error_message text,
  metrics jsonb not null default '{}'::jsonb check (jsonb_typeof(metrics) = 'object'),
  requested_by uuid references auth.users(id),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, run_code)
);

create table public.wpi_currency_rates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  base_currency text not null,
  quote_currency text not null default 'CNY',
  rate numeric(20,8) not null check (rate > 0),
  source_name text not null,
  effective_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (organization_id, base_currency, quote_currency, effective_at)
);

alter table public.wpi_price_collection_leads
  add column if not exists run_id uuid references public.wpi_price_collection_runs(id) on delete set null,
  add column if not exists source_id uuid references public.wpi_price_collection_sources(id) on delete set null,
  add column if not exists quote_document_id uuid,
  add column if not exists collection_mode text not null default 'web'
    check (collection_mode in ('web', 'quote_upload', 'manual', 'api')),
  add column if not exists normalized_name text,
  add column if not exists normalized_specification text,
  add column if not exists normalized_unit text,
  add column if not exists normalized_price_cny numeric(18,2) check (normalized_price_cny >= 0),
  add column if not exists exchange_rate numeric(20,8) check (exchange_rate > 0),
  add column if not exists fingerprint text,
  add column if not exists duplicate_of_lead_id uuid references public.wpi_price_collection_leads(id) on delete set null,
  add column if not exists duplicate_score numeric(5,2) check (duplicate_score between 0 and 100),
  add column if not exists source_quality_score numeric(5,2) check (source_quality_score between 0 and 100),
  add column if not exists freshness_score numeric(5,2) check (freshness_score between 0 and 100),
  add column if not exists observation_count integer not null default 1 check (observation_count > 0),
  add column if not exists last_seen_at timestamptz not null default now();

create table public.wpi_price_collection_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  task_id uuid not null references public.wpi_price_collection_tasks(id) on delete cascade,
  run_id uuid references public.wpi_price_collection_runs(id) on delete set null,
  lead_id uuid references public.wpi_price_collection_leads(id) on delete set null,
  source_id uuid references public.wpi_price_collection_sources(id) on delete set null,
  quote_document_id uuid,
  evidence_code text not null,
  source_url text,
  canonical_url text,
  page_title text,
  excerpt text,
  content_hash text not null,
  http_status integer check (http_status between 100 and 599),
  mime_type text,
  storage_bucket text,
  storage_path text,
  fetched_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (organization_id, evidence_code),
  unique (organization_id, content_hash)
);

alter table public.wpi_quote_documents
  add column if not exists collection_task_id uuid
    references public.wpi_price_collection_tasks(id) on delete set null;

alter table public.wpi_price_collection_leads
  drop constraint if exists wpi_price_collection_leads_quote_document_id_fkey;
alter table public.wpi_price_collection_leads
  add constraint wpi_price_collection_leads_quote_document_id_fkey
  foreign key (quote_document_id) references public.wpi_quote_documents(id) on delete set null;

alter table public.wpi_price_collection_evidence
  drop constraint if exists wpi_price_collection_evidence_quote_document_id_fkey;
alter table public.wpi_price_collection_evidence
  add constraint wpi_price_collection_evidence_quote_document_id_fkey
  foreign key (quote_document_id) references public.wpi_quote_documents(id) on delete set null;

create index wpi_collection_tasks_due_idx
  on public.wpi_price_collection_tasks(next_run_at, status)
  where schedule_enabled;
create index wpi_collection_runs_task_idx
  on public.wpi_price_collection_runs(task_id, created_at desc);
create index wpi_collection_runs_org_status_idx
  on public.wpi_price_collection_runs(organization_id, status, created_at desc);
create index wpi_collection_sources_org_active_idx
  on public.wpi_price_collection_sources(organization_id, is_active, name);
create index wpi_collection_evidence_task_idx
  on public.wpi_price_collection_evidence(task_id, fetched_at desc);
create index wpi_collection_evidence_lead_idx
  on public.wpi_price_collection_evidence(lead_id)
  where lead_id is not null;
create index wpi_collection_leads_run_idx
  on public.wpi_price_collection_leads(run_id)
  where run_id is not null;
create index wpi_collection_leads_fingerprint_idx
  on public.wpi_price_collection_leads(organization_id, fingerprint)
  where fingerprint is not null;
create index wpi_collection_leads_normalized_search_idx
  on public.wpi_price_collection_leads using gin (
    (coalesce(normalized_name, '') || ' ' || coalesce(normalized_specification, '')) extensions.gin_trgm_ops
  );
create index wpi_quote_documents_collection_task_idx
  on public.wpi_quote_documents(collection_task_id)
  where collection_task_id is not null;
create index wpi_currency_rates_lookup_idx
  on public.wpi_currency_rates(organization_id, base_currency, quote_currency, effective_at desc);

create or replace function private.wpi_normalize_collection_text(input text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(regexp_replace(translate(coalesce(input, ''), '×Φφ－—，。；：／\\', 'xDD--,.;:/'), '[[:space:][:punct:]]+', '', 'g'));
$$;

create or replace function private.wpi_collection_next_run(
  frequency text,
  from_time timestamptz default now()
)
returns timestamptz
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case lower(coalesce(frequency, 'manual'))
    when 'hourly' then from_time + interval '1 hour'
    when 'daily' then from_time + interval '1 day'
    when 'weekly' then from_time + interval '7 days'
    when '每小时' then from_time + interval '1 hour'
    when '每天' then from_time + interval '1 day'
    when '每周' then from_time + interval '7 days'
    else null
  end;
$$;

create or replace function private.wpi_prepare_collection_lead()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  rate_value numeric(20,8) := 1;
  comparison public.wpi_price_collection_leads;
  similarity_value numeric(5,2) := 0;
  threshold_value numeric := 86;
begin
  new.normalized_name := private.wpi_normalize_collection_text(new.name);
  new.normalized_specification := private.wpi_normalize_collection_text(new.specification);
  new.normalized_unit := private.wpi_normalize_collection_text(new.original_unit);
  new.fingerprint := md5(concat_ws('|', new.target_type, new.normalized_name, new.normalized_specification, new.normalized_unit, private.wpi_normalize_collection_text(new.region)));
  new.last_seen_at := coalesce(new.last_seen_at, now());

  if upper(new.currency) <> 'CNY' then
    select rate into rate_value
    from public.wpi_currency_rates
    where organization_id = new.organization_id
      and base_currency = upper(new.currency)
      and quote_currency = 'CNY'
      and effective_at <= coalesce(new.source_checked_at, now())
    order by effective_at desc
    limit 1;
    rate_value := coalesce(rate_value, 1);
  end if;
  new.exchange_rate := coalesce(new.exchange_rate, rate_value);
  new.normalized_price_cny := round(new.price * new.exchange_rate, 2);

  if new.source_quality_score is null then
    select quality_score into new.source_quality_score
    from public.wpi_price_collection_sources
    where id = new.source_id;
  end if;
  new.source_quality_score := coalesce(new.source_quality_score, 60);
  new.freshness_score := coalesce(
    new.freshness_score,
    greatest(0, 100 - extract(day from now() - coalesce(new.source_checked_at, now())) * 2)
  );
  new.confidence := coalesce(
    new.confidence,
    round(
      new.source_quality_score * 0.40
      + new.freshness_score * 0.20
      + coalesce(new.ai_match_score, 50) * 0.20
      + (case when nullif(new.specification, '') is null then 35 else 100 end) * 0.20,
      2
    )
  );

  if new.task_id is not null then
    select coalesce((config ->> 'dedupThreshold')::numeric, 86)
      into threshold_value
    from public.wpi_price_collection_tasks
    where id = new.task_id;
  end if;

  select candidate.*
    into comparison
  from public.wpi_price_collection_leads candidate
  where candidate.organization_id = new.organization_id
    and candidate.id <> coalesce(new.id, gen_random_uuid())
    and candidate.target_type = new.target_type
    and candidate.status <> 'rejected'
    and (
      candidate.fingerprint = new.fingerprint
      or extensions.similarity(
        coalesce(candidate.normalized_name, '') || ' ' || coalesce(candidate.normalized_specification, ''),
        new.normalized_name || ' ' || new.normalized_specification
      ) >= threshold_value / 100.0
    )
  order by
    (candidate.fingerprint = new.fingerprint) desc,
    extensions.similarity(
      coalesce(candidate.normalized_name, '') || ' ' || coalesce(candidate.normalized_specification, ''),
      new.normalized_name || ' ' || new.normalized_specification
    ) desc
  limit 1;

  if comparison.id is not null then
    similarity_value := round(extensions.similarity(
      coalesce(comparison.normalized_name, '') || ' ' || coalesce(comparison.normalized_specification, ''),
      new.normalized_name || ' ' || new.normalized_specification
    ) * 100, 2);
    new.duplicate_of_lead_id := comparison.id;
    new.duplicate_score := case when comparison.fingerprint = new.fingerprint then 100 else similarity_value end;
    new.duplicate_status := 'suspected_duplicate';
  else
    new.duplicate_of_lead_id := null;
    new.duplicate_score := 0;
    new.duplicate_status := 'unique';
  end if;

  if new.price <= 0 or new.confidence < 50 then
    new.risk_level := 'high';
  elsif new.duplicate_status = 'suspected_duplicate' or new.confidence < 75 then
    new.risk_level := 'medium';
  else
    new.risk_level := coalesce(new.risk_level, 'low');
  end if;
  return new;
end;
$$;

drop trigger if exists wpi_prepare_collection_lead on public.wpi_price_collection_leads;
create trigger wpi_prepare_collection_lead
before insert or update of name, specification, original_unit, region, price, currency,
  source_checked_at, source_id, ai_match_score, source_quality_score, freshness_score
on public.wpi_price_collection_leads
for each row execute function private.wpi_prepare_collection_lead();

-- Backfill records created before normalization and deduplication were introduced.
update public.wpi_price_collection_leads
set name = name
where fingerprint is null
   or normalized_price_cny is null
   or normalized_name is null;

create or replace function public.wpi_transition_price_collection_task(
  target_task_id uuid,
  requested_action text,
  next_progress smallint default null,
  next_success_count integer default null,
  next_failed_count integer default null,
  next_current_source text default null,
  next_error text default null
)
returns public.wpi_price_collection_tasks
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_task public.wpi_price_collection_tasks;
  target_status text;
begin
  select * into current_task
  from public.wpi_price_collection_tasks
  where id = target_task_id
  for update;

  if current_task.id is null then raise exception 'Collection task not found'; end if;

  target_status := case requested_action
    when 'start' then 'running'
    when 'pause' then 'paused'
    when 'resume' then 'running'
    when 'stop' then 'stopped'
    when 'complete' then 'completed'
    when 'fail' then 'failed'
    when 'progress' then current_task.status
    else null
  end;
  if target_status is null then raise exception 'Unsupported collection task action'; end if;

  if requested_action = 'start' and current_task.status not in ('queued', 'failed', 'stopped', 'completed') then
    raise exception 'Task cannot be started from status %', current_task.status;
  elsif requested_action = 'pause' and current_task.status <> 'running' then
    raise exception 'Only running tasks can be paused';
  elsif requested_action = 'resume' and current_task.status <> 'paused' then
    raise exception 'Only paused tasks can be resumed';
  elsif requested_action = 'stop' and current_task.status not in ('queued', 'running', 'paused') then
    raise exception 'Task cannot be stopped from status %', current_task.status;
  elsif requested_action in ('complete', 'fail', 'progress') and current_task.status <> 'running' then
    raise exception 'Task is not running';
  end if;

  update public.wpi_price_collection_tasks
  set status = target_status,
      progress = case when requested_action = 'complete' then 100 else coalesce(next_progress, progress) end,
      success_count = coalesce(next_success_count, success_count),
      failed_count = coalesce(next_failed_count, failed_count),
      current_source = coalesce(next_current_source, current_source),
      last_error = case when requested_action = 'fail' then next_error when requested_action = 'start' then null else last_error end,
      started_at = case when requested_action = 'start' then now() else started_at end,
      finished_at = case when requested_action in ('stop', 'complete', 'fail') then now() when requested_action = 'start' then null else finished_at end,
      retry_count = case when requested_action = 'start' and current_task.status = 'failed' then retry_count + 1 else retry_count end,
      last_run_at = case when requested_action = 'start' then now() else last_run_at end,
      updated_by = coalesce(auth.uid(), updated_by)
  where id = target_task_id
  returning * into current_task;

  return current_task;
end;
$$;

create or replace function public.wpi_ingest_price_collection_candidate(
  target_task_id uuid,
  target_run_id uuid,
  target_source_id uuid,
  candidate jsonb,
  evidence jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  task_row public.wpi_price_collection_tasks;
  run_row public.wpi_price_collection_runs;
  lead_row public.wpi_price_collection_leads;
  existing_row public.wpi_price_collection_leads;
  evidence_row public.wpi_price_collection_evidence;
  lead_fingerprint text;
  candidate_name text := nullif(btrim(candidate ->> 'name'), '');
  candidate_spec text := nullif(btrim(candidate ->> 'specification'), '');
  candidate_url text := nullif(btrim(evidence ->> 'sourceUrl'), '');
  was_created boolean := false;
begin
  if candidate_name is null then raise exception 'Candidate name is required'; end if;
  select * into task_row from public.wpi_price_collection_tasks where id = target_task_id for update;
  if task_row.id is null then raise exception 'Collection task not found'; end if;
  select * into run_row from public.wpi_price_collection_runs
    where id = target_run_id and task_id = target_task_id for update;
  if run_row.id is null then raise exception 'Collection run not found'; end if;
  if target_source_id is not null and not exists (
    select 1 from public.wpi_price_collection_sources
    where id = target_source_id and organization_id = task_row.organization_id and is_active
  ) then raise exception 'Collection source is not active'; end if;

  lead_fingerprint := md5(concat_ws('|',
    coalesce(candidate ->> 'targetType', task_row.target_type),
    private.wpi_normalize_collection_text(candidate_name),
    private.wpi_normalize_collection_text(candidate_spec),
    private.wpi_normalize_collection_text(candidate ->> 'unit'),
    private.wpi_normalize_collection_text(coalesce(candidate ->> 'region', task_row.region))
  ));

  select * into existing_row
  from public.wpi_price_collection_leads
  where organization_id = task_row.organization_id
    and fingerprint = lead_fingerprint
    and coalesce(source_url, '') = coalesce(candidate_url, '')
    and status <> 'rejected'
  order by created_at desc
  limit 1
  for update;

  if existing_row.id is not null then
    update public.wpi_price_collection_leads
    set price = greatest(0, coalesce((candidate ->> 'price')::numeric, price)),
        currency = upper(coalesce(nullif(candidate ->> 'currency', ''), currency)),
        supplier_name = coalesce(nullif(candidate ->> 'supplierName', ''), supplier_name),
        source_checked_at = now(),
        last_seen_at = now(),
        observation_count = observation_count + 1,
        run_id = target_run_id,
        source_id = target_source_id,
        metadata = metadata || jsonb_build_object(
          'lastObservationAt', now(),
          'incrementalUpdate', true,
          'previousPrice', existing_row.price
        ),
        updated_by = task_row.created_by
    where id = existing_row.id
    returning * into lead_row;
  else
    insert into public.wpi_price_collection_leads (
      organization_id, task_id, run_id, source_id, lead_code, target_type,
      name, specification, source_type, source_url, source_checked_at,
      evidence_code, region, price, currency, normalized_price, original_unit,
      supplier_name, match_target, ai_match_score, source_quality_score,
      collection_mode, status, metadata, created_by, updated_by
    ) values (
      task_row.organization_id, task_row.id, run_row.id, target_source_id,
      'LS' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISS') || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4)),
      case when candidate ->> 'targetType' = 'material' then 'material' else task_row.target_type end,
      candidate_name, candidate_spec,
      coalesce(nullif(candidate ->> 'sourceType', ''), task_row.source_type),
      candidate_url, now(),
      coalesce(nullif(evidence ->> 'evidenceCode', ''), 'EV-COL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
      coalesce(nullif(candidate ->> 'region', ''), task_row.region),
      greatest(0, coalesce((candidate ->> 'price')::numeric, 0)),
      upper(coalesce(nullif(candidate ->> 'currency', ''), task_row.currency, 'CNY')),
      greatest(0, coalesce((candidate ->> 'price')::numeric, 0)),
      nullif(candidate ->> 'unit', ''), nullif(candidate ->> 'supplierName', ''),
      nullif(candidate ->> 'matchTarget', ''),
      greatest(0, least(100, coalesce((candidate ->> 'matchScore')::numeric, 50))),
      greatest(0, least(100, coalesce((candidate ->> 'sourceQuality')::numeric, 60))),
      task_row.collection_mode, 'pending_review',
      jsonb_build_object('rawCandidate', candidate, 'aiFinalDecision', false, 'incrementalUpdate', false),
      task_row.created_by, task_row.created_by
    ) returning * into lead_row;
    was_created := true;
  end if;

  insert into public.wpi_price_collection_evidence (
    organization_id, task_id, run_id, lead_id, source_id, evidence_code,
    source_url, canonical_url, page_title, excerpt, content_hash, http_status,
    mime_type, fetched_at, metadata, created_by
  ) values (
    task_row.organization_id, task_row.id, run_row.id, lead_row.id, target_source_id,
    coalesce(nullif(evidence ->> 'evidenceCode', ''), 'EV-COL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
    candidate_url, nullif(evidence ->> 'canonicalUrl', ''),
    nullif(evidence ->> 'pageTitle', ''), left(coalesce(evidence ->> 'excerpt', ''), 8000),
    md5(concat_ws('|', coalesce(candidate_url, ''), candidate_name, candidate_spec, coalesce(evidence ->> 'excerpt', ''))),
    greatest(100, least(599, coalesce((evidence ->> 'httpStatus')::integer, 200))),
    coalesce(nullif(evidence ->> 'mimeType', ''), 'text/html'), now(),
    coalesce(evidence -> 'metadata', '{}'::jsonb), task_row.created_by
  ) on conflict (organization_id, content_hash) do update
    set lead_id = excluded.lead_id,
        run_id = excluded.run_id,
        fetched_at = excluded.fetched_at,
        metadata = public.wpi_price_collection_evidence.metadata || excluded.metadata
  returning * into evidence_row;

  return jsonb_build_object(
    'leadId', lead_row.id,
    'leadCode', lead_row.lead_code,
    'evidenceId', evidence_row.id,
    'created', was_created,
    'duplicate', lead_row.duplicate_status = 'suspected_duplicate',
    'confidence', lead_row.confidence,
    'riskLevel', lead_row.risk_level,
    'normalizedPriceCny', lead_row.normalized_price_cny
  );
end;
$$;

create or replace function private.wpi_collection_quote_imported_lead()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  document_row public.wpi_quote_documents;
  task_row public.wpi_price_collection_tasks;
begin
  if new.review_status <> 'imported' or old.review_status = 'imported' then return new; end if;
  select * into document_row from public.wpi_quote_documents where id = new.document_id;
  if document_row.collection_task_id is null then return new; end if;
  select * into task_row from public.wpi_price_collection_tasks where id = document_row.collection_task_id;
  if task_row.id is null then return new; end if;

  insert into public.wpi_price_collection_leads (
    organization_id, task_id, quote_document_id, lead_code, target_type,
    name, specification, source_type, source_checked_at, evidence_code,
    region, price, currency, normalized_price, original_unit, supplier_name,
    match_target, ai_match_score, confidence, risk_level, collection_mode,
    status, reviewed_by, reviewed_at, transferred_at, metadata, created_by, updated_by
  ) values (
    new.organization_id, task_row.id, document_row.id,
    'LSQ' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISS') || lpad(new.line_number::text, 3, '0'),
    new.item_type, new.item_name, new.specification, 'uploaded_quote', now(),
    'EV-QUOTE-' || upper(substr(replace(new.id::text, '-', ''), 1, 10)),
    new.region, new.unit_price, new.currency, new.unit_price, new.unit,
    coalesce(new.supplier_name, document_row.supplier_name),
    case when new.item_type = 'material' then '地材价格库' else '设备价格库' end,
    new.confidence, new.confidence, new.risk_level, 'quote_upload',
    'transferred', new.reviewed_by, new.reviewed_at, now(),
    jsonb_build_object(
      'quoteItemId', new.id,
      'equipmentPriceId', new.target_equipment_price_id,
      'materialPriceId', new.target_material_price_id,
      'sourceDocument', document_row.document_code,
      'aiFinalDecision', false
    ),
    document_row.created_by, coalesce(new.reviewed_by, document_row.created_by)
  ) on conflict (organization_id, lead_code) do nothing;

  update public.wpi_price_collection_tasks
  set success_count = (
        select count(*) from public.wpi_price_collection_leads
        where task_id = task_row.id and status = 'transferred'
      ),
      current_source = '上传报价 · ' || document_row.file_name,
      updated_by = coalesce(new.reviewed_by, document_row.created_by)
  where id = task_row.id;
  return new;
end;
$$;

drop trigger if exists wpi_collection_quote_imported_lead on public.wpi_quote_items;
create trigger wpi_collection_quote_imported_lead
after update of review_status on public.wpi_quote_items
for each row execute function private.wpi_collection_quote_imported_lead();

create or replace function public.wpi_claim_due_price_collection_tasks(batch_size integer default 5)
returns setof public.wpi_price_collection_tasks
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with due as (
    select id
    from public.wpi_price_collection_tasks
    where schedule_enabled
      and collection_mode in ('web', 'api')
      and next_run_at <= now()
      and status in ('queued', 'completed', 'failed', 'stopped')
      and (status <> 'failed' or retry_count < max_retries)
    order by next_run_at
    for update skip locked
    limit greatest(1, least(batch_size, 20))
  )
  update public.wpi_price_collection_tasks task
  set status = 'queued',
      next_run_at = private.wpi_collection_next_run(task.frequency, now()),
      last_run_at = now(),
      retry_at = null
  from due
  where task.id = due.id
  returning task.*;
end;
$$;

create or replace function private.wpi_guard_collection_task_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status <> old.status and not (
    (old.status in ('queued', 'failed', 'stopped', 'completed') and new.status = 'running') or
    (old.status = 'running' and new.status in ('paused', 'completed', 'stopped', 'failed')) or
    (old.status = 'paused' and new.status in ('running', 'stopped')) or
    (old.status in ('completed', 'failed', 'stopped') and new.status = 'queued')
  ) then
    raise exception 'Invalid collection task transition: % -> %', old.status, new.status;
  end if;
  return new;
end;
$$;

create trigger wpi_collection_sources_updated_at
before update on public.wpi_price_collection_sources
for each row execute function private.wpi_set_updated_at();
create trigger wpi_collection_runs_updated_at
before update on public.wpi_price_collection_runs
for each row execute function private.wpi_set_updated_at();
create trigger wpi_collection_sources_audit
after insert or update or delete on public.wpi_price_collection_sources
for each row execute function private.wpi_audit_row_change();
create trigger wpi_collection_runs_audit
after insert or update or delete on public.wpi_price_collection_runs
for each row execute function private.wpi_audit_row_change();
create trigger wpi_collection_evidence_audit
after insert or update or delete on public.wpi_price_collection_evidence
for each row execute function private.wpi_audit_row_change();

alter table public.wpi_price_collection_sources enable row level security;
alter table public.wpi_price_collection_runs enable row level security;
alter table public.wpi_price_collection_evidence enable row level security;
alter table public.wpi_currency_rates enable row level security;

create policy wpi_collection_sources_read on public.wpi_price_collection_sources
for select to authenticated using (private.wpi_has_permission(organization_id, 'price.read'));
create policy wpi_collection_sources_write on public.wpi_price_collection_sources
for all to authenticated using (private.wpi_has_permission(organization_id, 'settings.manage'))
with check (private.wpi_has_permission(organization_id, 'settings.manage'));
create policy wpi_collection_runs_read on public.wpi_price_collection_runs
for select to authenticated using (private.wpi_has_permission(organization_id, 'price.read'));
create policy wpi_collection_runs_write on public.wpi_price_collection_runs
for all to authenticated using (private.wpi_has_permission(organization_id, 'price.write'))
with check (private.wpi_has_permission(organization_id, 'price.write'));
create policy wpi_collection_evidence_read on public.wpi_price_collection_evidence
for select to authenticated using (private.wpi_has_permission(organization_id, 'price.read'));
create policy wpi_collection_evidence_write on public.wpi_price_collection_evidence
for all to authenticated using (private.wpi_has_permission(organization_id, 'price.write'))
with check (private.wpi_has_permission(organization_id, 'price.write'));
create policy wpi_currency_rates_read on public.wpi_currency_rates
for select to authenticated using (private.wpi_has_permission(organization_id, 'price.read'));
create policy wpi_currency_rates_write on public.wpi_currency_rates
for all to authenticated using (private.wpi_has_permission(organization_id, 'settings.manage'))
with check (private.wpi_has_permission(organization_id, 'settings.manage'));

grant select, insert, update, delete on public.wpi_price_collection_sources to authenticated;
grant select, insert, update, delete on public.wpi_price_collection_runs to authenticated;
grant select, insert, update, delete on public.wpi_price_collection_evidence to authenticated;
grant select, insert, update, delete on public.wpi_currency_rates to authenticated;
grant select, insert, update, delete on public.wpi_price_collection_sources to service_role;
grant select, insert, update, delete on public.wpi_price_collection_runs to service_role;
grant select, insert, update, delete on public.wpi_price_collection_evidence to service_role;
grant select, insert, update, delete on public.wpi_currency_rates to service_role;

revoke all on function public.wpi_ingest_price_collection_candidate(uuid, uuid, uuid, jsonb, jsonb)
from public, anon, authenticated;
grant execute on function public.wpi_ingest_price_collection_candidate(uuid, uuid, uuid, jsonb, jsonb)
to service_role;
revoke all on function public.wpi_claim_due_price_collection_tasks(integer)
from public, anon, authenticated;
grant execute on function public.wpi_claim_due_price_collection_tasks(integer)
to service_role;

insert into public.wpi_currency_rates (
  organization_id, base_currency, quote_currency, rate, source_name, effective_at
)
select id, 'CNY', 'CNY', 1, 'system_identity', now()
from public.wpi_organizations
on conflict do nothing;
