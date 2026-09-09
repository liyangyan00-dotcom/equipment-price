create table public.wpi_equipment_ai_review_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  review_id uuid not null references public.wpi_equipment_price_reviews(id) on delete cascade,
  equipment_price_id uuid references public.wpi_equipment_prices(id) on delete set null,
  task_type text not null default 'equipment_price_pre_review'
    check (task_type in ('equipment_price_pre_review')),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'needs_review', 'failed', 'cancelled')),
  provider text not null,
  model text not null,
  prompt_key text not null,
  prompt_version text not null,
  schema_version text not null default '1.0',
  input_snapshot jsonb not null default '{}'::jsonb,
  output_payload jsonb,
  confidence numeric(5,2) check (confidence between 0 and 100),
  risk_level public.wpi_risk_level,
  requires_human_review boolean not null default true,
  error_code text,
  error_message text,
  requested_by uuid not null references auth.users(id),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wpi_equipment_ai_review_runs_output_object check (
    output_payload is null or jsonb_typeof(output_payload) = 'object'
  ),
  constraint wpi_equipment_ai_review_runs_input_object check (
    jsonb_typeof(input_snapshot) = 'object'
  )
);

create index wpi_equipment_ai_review_runs_review_created_idx
  on public.wpi_equipment_ai_review_runs(review_id, created_at desc);

create index wpi_equipment_ai_review_runs_org_status_idx
  on public.wpi_equipment_ai_review_runs(organization_id, status, created_at desc);

create unique index wpi_equipment_ai_review_runs_one_active_idx
  on public.wpi_equipment_ai_review_runs(review_id)
  where status in ('queued', 'running');

create trigger wpi_equipment_ai_review_runs_updated_at
before update on public.wpi_equipment_ai_review_runs
for each row execute function private.wpi_set_updated_at();

create trigger wpi_equipment_ai_review_runs_audit
after insert or update or delete on public.wpi_equipment_ai_review_runs
for each row execute function private.wpi_audit_row_change();

alter table public.wpi_equipment_ai_review_runs enable row level security;

create policy wpi_equipment_ai_review_runs_read
on public.wpi_equipment_ai_review_runs
for select to authenticated
using (private.wpi_has_permission(organization_id, 'price.read'));

revoke all on public.wpi_equipment_ai_review_runs from public, anon;
grant select on public.wpi_equipment_ai_review_runs to authenticated;

create or replace function public.wpi_start_equipment_ai_review(
  target_review_id uuid,
  run_provider text,
  run_model text,
  run_prompt_key text,
  run_prompt_version text,
  run_schema_version text,
  run_input_snapshot jsonb
)
returns public.wpi_equipment_ai_review_runs
language plpgsql
security definer
set search_path = ''
as $$
declare
  review_row public.wpi_equipment_price_reviews;
  active_run public.wpi_equipment_ai_review_runs;
  created_run public.wpi_equipment_ai_review_runs;
  elevated_role boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into review_row
  from public.wpi_equipment_price_reviews
  where id = target_review_id
  for update;

  if review_row.id is null then
    raise exception 'Review task not found';
  end if;
  if not private.wpi_has_permission(review_row.organization_id, 'price.review') then
    raise exception 'Insufficient AI pre-review permission';
  end if;
  if review_row.status = 'archived' then
    raise exception 'Archived review tasks cannot run AI pre-review';
  end if;

  elevated_role := private.wpi_has_any_role(
    review_row.organization_id,
    array['admin', 'manager']::public.wpi_app_role[]
  );
  if review_row.assigned_to is not null
    and review_row.assigned_to <> auth.uid()
    and not elevated_role then
    raise exception 'Review task is assigned to another reviewer';
  end if;

  if nullif(btrim(run_provider), '') is null
    or nullif(btrim(run_model), '') is null
    or nullif(btrim(run_prompt_key), '') is null
    or nullif(btrim(run_prompt_version), '') is null
    or nullif(btrim(run_schema_version), '') is null then
    raise exception 'AI run metadata is incomplete';
  end if;
  if run_input_snapshot is null or jsonb_typeof(run_input_snapshot) <> 'object' then
    raise exception 'AI input snapshot must be a JSON object';
  end if;

  select * into active_run
  from public.wpi_equipment_ai_review_runs
  where review_id = review_row.id
    and status in ('queued', 'running')
  order by created_at desc
  limit 1;

  if active_run.id is not null then
    return active_run;
  end if;

  insert into public.wpi_equipment_ai_review_runs (
    organization_id,
    review_id,
    equipment_price_id,
    status,
    provider,
    model,
    prompt_key,
    prompt_version,
    schema_version,
    input_snapshot,
    requested_by,
    started_at
  ) values (
    review_row.organization_id,
    review_row.id,
    review_row.equipment_price_id,
    'running',
    btrim(run_provider),
    btrim(run_model),
    btrim(run_prompt_key),
    btrim(run_prompt_version),
    btrim(run_schema_version),
    run_input_snapshot,
    auth.uid(),
    now()
  ) returning * into created_run;

  return created_run;
end;
$$;

revoke all on function public.wpi_start_equipment_ai_review(
  uuid, text, text, text, text, text, jsonb
) from public, anon;
grant execute on function public.wpi_start_equipment_ai_review(
  uuid, text, text, text, text, text, jsonb
) to authenticated;

create or replace function public.wpi_finish_equipment_ai_review(
  target_run_id uuid,
  final_status text,
  final_output jsonb default null,
  final_confidence numeric default null,
  final_risk_level public.wpi_risk_level default null,
  final_error_code text default null,
  final_error_message text default null
)
returns public.wpi_equipment_ai_review_runs
language plpgsql
security definer
set search_path = ''
as $$
declare
  run_row public.wpi_equipment_ai_review_runs;
  review_row public.wpi_equipment_price_reviews;
  elevated_role boolean;
  output_judgment text;
  output_recommendation text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if final_status not in ('completed', 'needs_review', 'failed') then
    raise exception 'Unsupported AI run completion status';
  end if;
  if final_confidence is not null and (final_confidence < 0 or final_confidence > 100) then
    raise exception 'AI confidence must be between 0 and 100';
  end if;
  if final_status in ('completed', 'needs_review')
    and (final_output is null or jsonb_typeof(final_output) <> 'object') then
    raise exception 'Successful AI runs require a structured output object';
  end if;

  select * into run_row
  from public.wpi_equipment_ai_review_runs
  where id = target_run_id
  for update;

  if run_row.id is null then
    raise exception 'AI review run not found';
  end if;
  if run_row.status not in ('queued', 'running') then
    return run_row;
  end if;
  if not private.wpi_has_permission(run_row.organization_id, 'price.review') then
    raise exception 'Insufficient AI pre-review permission';
  end if;

  elevated_role := private.wpi_has_any_role(
    run_row.organization_id,
    array['admin', 'manager']::public.wpi_app_role[]
  );
  if run_row.requested_by <> auth.uid() and not elevated_role then
    raise exception 'Only the requester or a manager can finish this AI run';
  end if;

  update public.wpi_equipment_ai_review_runs
  set
    status = final_status,
    output_payload = final_output,
    confidence = final_confidence,
    risk_level = final_risk_level,
    requires_human_review = true,
    error_code = nullif(btrim(final_error_code), ''),
    error_message = nullif(btrim(final_error_message), ''),
    completed_at = now()
  where id = run_row.id
  returning * into run_row;

  if final_status in ('completed', 'needs_review') then
    output_judgment := nullif(btrim(final_output ->> 'judgment'), '');
    output_recommendation := nullif(btrim(final_output ->> 'recommendation'), '');

    select * into review_row
    from public.wpi_equipment_price_reviews
    where id = run_row.review_id;

    if review_row.id is not null
      and review_row.status not in ('approved', 'rejected', 'archived') then
      update public.wpi_equipment_price_reviews
      set
        ai_judgment = coalesce(output_judgment, ai_judgment),
        ai_recommendation = coalesce(output_recommendation, ai_recommendation),
        confidence = coalesce(final_confidence, confidence),
        risk_level = coalesce(final_risk_level, risk_level)
      where id = review_row.id;
    end if;
  end if;

  return run_row;
end;
$$;

revoke all on function public.wpi_finish_equipment_ai_review(
  uuid, text, jsonb, numeric, public.wpi_risk_level, text, text
) from public, anon;
grant execute on function public.wpi_finish_equipment_ai_review(
  uuid, text, jsonb, numeric, public.wpi_risk_level, text, text
) to authenticated;
