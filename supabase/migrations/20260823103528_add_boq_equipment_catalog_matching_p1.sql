alter table public.wpi_project_pricing_items
  add column if not exists normalized_item_name text not null default '',
  add column if not exists normalized_specification text not null default '',
  add column if not exists requirement_parameters jsonb not null default '{}'::jsonb
create table public.wpi_project_pricing_catalog_matches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  project_id uuid not null references public.wpi_projects(id) on delete cascade,
  project_item_id uuid not null references public.wpi_project_pricing_items(id) on delete cascade,
  equipment_catalog_id uuid not null references public.wpi_equipment_catalog(id) on delete cascade,
  candidate_rank integer not null default 1 check (candidate_rank between 1 and 20),
  name_score numeric(5,2) not null default 0 check (name_score between 0 and 100),
  model_score numeric(5,2) not null default 0 check (model_score between 0 and 100),
  parameter_score numeric(5,2) not null default 0 check (parameter_score between 0 and 100),
  overall_score numeric(5,2) not null default 0 check (overall_score between 0 and 100),
  confidence numeric(5,2) not null default 0 check (confidence between 0 and 100),
  match_reason jsonb not null default '{}'::jsonb,
  parameter_differences jsonb not null default '[]'::jsonb,
  decision text not null default 'suggested'
    check (decision in ('suggested', 'accepted', 'rejected')),
  reviewer_id uuid references auth.users(id),
  reviewed_at timestamptz,
  review_notes text not null default '',
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_item_id, equipment_catalog_id)
)
create index wpi_project_catalog_matches_item_rank_idx
  on public.wpi_project_pricing_catalog_matches(organization_id, project_item_id, candidate_rank)
create index wpi_project_catalog_matches_catalog_idx
  on public.wpi_project_pricing_catalog_matches(organization_id, equipment_catalog_id, decision)
create trigger wpi_project_catalog_matches_updated_at
before update on public.wpi_project_pricing_catalog_matches
for each row execute function private.wpi_set_updated_at()
create trigger wpi_project_catalog_matches_audit
after insert or update or delete on public.wpi_project_pricing_catalog_matches
for each row execute function private.wpi_audit_row_change()
alter table public.wpi_project_pricing_catalog_matches enable row level security
create policy wpi_project_catalog_matches_read
on public.wpi_project_pricing_catalog_matches for select to authenticated
using (private.wpi_has_permission(organization_id, 'project.read'))
create policy wpi_project_catalog_matches_insert
on public.wpi_project_pricing_catalog_matches for insert to authenticated
with check (
  private.wpi_has_permission(organization_id, 'project.write')
  and created_by = (select auth.uid())
)
create policy wpi_project_catalog_matches_update
on public.wpi_project_pricing_catalog_matches for update to authenticated
using (private.wpi_has_permission(organization_id, 'project.write'))
with check (private.wpi_has_permission(organization_id, 'project.write'))
create policy wpi_project_catalog_matches_delete
on public.wpi_project_pricing_catalog_matches for delete to authenticated
using (private.wpi_has_permission(organization_id, 'project.write'))
create or replace function public.wpi_confirm_project_catalog_match(
  p_project_item_id uuid,
  p_match_id uuid,
  p_notes text default ''
) returns public.wpi_project_pricing_items
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_catalog_id uuid;
  v_score numeric(5,2);
  v_result public.wpi_project_pricing_items;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  select match.organization_id, match.equipment_catalog_id, match.overall_score
    into v_organization_id, v_catalog_id, v_score
  from public.wpi_project_pricing_catalog_matches as match
  where match.id = p_match_id
    and match.project_item_id = p_project_item_id;

  if v_organization_id is null then
    raise exception 'Catalog match candidate not found';
  end if;
  if not private.wpi_has_permission(v_organization_id, 'project.write') then
    raise exception 'Permission denied';
  end if;

  update public.wpi_project_pricing_catalog_matches
  set decision = case when id = p_match_id then 'accepted' else 'rejected' end,
      reviewer_id = (select auth.uid()),
      reviewed_at = now(),
      review_notes = case when id = p_match_id then left(coalesce(p_notes, ''), 2000) else review_notes end,
      updated_by = (select auth.uid())
  where organization_id = v_organization_id
    and project_item_id = p_project_item_id;

  update public.wpi_project_pricing_items
  set equipment_catalog_id = v_catalog_id,
      catalog_match_status = case
        when v_score >= 92 then 'exact'
        when v_score >= 78 then 'compatible'
        else 'partial'
      end,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'catalogMatch', jsonb_build_object(
          'matchId', p_match_id,
          'score', v_score,
          'confirmedBy', (select auth.uid()),
          'confirmedAt', now(),
          'humanConfirmed', true
        )
      ),
      updated_by = (select auth.uid())
  where id = p_project_item_id
    and organization_id = v_organization_id
  returning * into v_result;

  return v_result;
end;
$$
revoke all on public.wpi_project_pricing_catalog_matches from public, anon
grant select, insert, update, delete on public.wpi_project_pricing_catalog_matches to authenticated
grant all on public.wpi_project_pricing_catalog_matches to service_role
revoke all on function public.wpi_confirm_project_catalog_match(uuid, uuid, text) from public, anon
grant execute on function public.wpi_confirm_project_catalog_match(uuid, uuid, text)
  to authenticated, service_role
update public.wpi_project_pricing_items
set normalized_item_name = lower(regexp_replace(btrim(item_name), '\s+', '', 'g')),
    normalized_specification = lower(regexp_replace(btrim(specification), '\s+', '', 'g')),
    requirement_parameters = jsonb_strip_nulls(jsonb_build_object(
      'rawSpecification', nullif(specification, ''),
      'unit', nullif(unit, ''),
      'quantity', quantity
    ))
where normalized_item_name = '' or normalized_specification = ''
comment on table public.wpi_project_pricing_catalog_matches is
  'Ranked equipment-catalog candidates for BOQ lines. AI scores are advisory until a user accepts one.'
