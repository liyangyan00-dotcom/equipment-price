alter table public.wpi_user_preferences
  add column if not exists price_collection_templates jsonb not null default '[]'::jsonb;

comment on column public.wpi_user_preferences.price_collection_templates is
  'User-scoped reusable price collection task templates synchronized through Supabase.';

create or replace function public.wpi_search_price_collection_leads_v2(
  search_keyword text default null,
  filter_task_id uuid default null,
  filter_target_type text default null,
  filter_source_type text default null,
  filter_region text default null,
  filter_status text default null,
  filter_risk_level text default null,
  filter_min_match numeric default null,
  filter_max_match numeric default null,
  filter_min_confidence numeric default null,
  filter_max_confidence numeric default null,
  filter_date_from date default null,
  filter_date_to date default null,
  filter_assignee text default null,
  page_number integer default 1,
  page_size integer default 10
)
returns jsonb
language sql
security invoker
stable
set search_path = ''
as $$
  with filtered as materialized (
    select lead.*
    from public.wpi_price_collection_leads lead
    where (
      nullif(btrim(search_keyword), '') is null
      or lead.lead_code ilike '%' || btrim(search_keyword) || '%'
      or lead.name ilike '%' || btrim(search_keyword) || '%'
      or coalesce(lead.specification, '') ilike '%' || btrim(search_keyword) || '%'
      or coalesce(lead.supplier_name, '') ilike '%' || btrim(search_keyword) || '%'
    )
      and (filter_task_id is null or lead.task_id = filter_task_id)
      and (nullif(filter_target_type, '') is null or lead.target_type = filter_target_type)
      and (nullif(filter_source_type, '') is null or lead.source_type = filter_source_type)
      and (nullif(filter_region, '') is null or lead.region = filter_region)
      and (nullif(filter_status, '') is null or lead.status = filter_status)
      and (nullif(filter_risk_level, '') is null or lead.risk_level::text = filter_risk_level)
      and (filter_min_match is null or coalesce(lead.ai_match_score, 0) >= filter_min_match)
      and (filter_max_match is null or coalesce(lead.ai_match_score, 0) <= filter_max_match)
      and (filter_min_confidence is null or coalesce(lead.confidence, 0) >= filter_min_confidence)
      and (filter_max_confidence is null or coalesce(lead.confidence, 0) < filter_max_confidence)
      and (filter_date_from is null or lead.created_at >= filter_date_from::timestamptz)
      and (filter_date_to is null or lead.created_at < (filter_date_to + 1)::timestamptz)
      and (
        nullif(filter_assignee, '') is null
        or (filter_assignee = 'unassigned' and lead.assigned_reviewer_id is null)
        or (filter_assignee <> 'unassigned' and lead.assigned_reviewer_id = filter_assignee::uuid)
      )
  ), page_rows as (
    select * from filtered
    order by created_at desc, id desc
    limit greatest(1, least(coalesce(page_size, 10), 100))
    offset (greatest(coalesce(page_number, 1), 1) - 1) * greatest(1, least(coalesce(page_size, 10), 100))
  ), source_distribution as (
    select source_type as label, count(*)::integer as count from filtered group by source_type
  ), status_distribution as (
    select status as label, count(*)::integer as count from filtered group by status
  )
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(to_jsonb(page_rows) order by created_at desc, id desc) from page_rows), '[]'::jsonb),
    'pagination', jsonb_build_object(
      'page', greatest(coalesce(page_number, 1), 1),
      'pageSize', greatest(1, least(coalesce(page_size, 10), 100)),
      'total', (select count(*) from filtered),
      'pageCount', greatest(1, ceil((select count(*) from filtered)::numeric / greatest(1, least(coalesce(page_size, 10), 100)))::integer)
    ),
    'summary', jsonb_build_object(
      'total', (select count(*) from filtered),
      'pending', (select count(*) from filtered where status = 'pending_review'),
      'ready', (select count(*) from filtered where status = 'ready'),
      'transferred', (select count(*) from filtered where status = 'transferred'),
      'rejected', (select count(*) from filtered where status = 'rejected'),
      'highRisk', (select count(*) from filtered where risk_level::text in ('high', 'critical')),
      'unassigned', (select count(*) from filtered where assigned_reviewer_id is null),
      'overdue', (select count(*) from filtered where status = 'pending_review' and review_due_at < now()),
      'averageConfidence', coalesce((select round(avg(confidence), 1) from filtered), 0),
      'averageMatch', coalesce((select round(avg(ai_match_score), 1) from filtered), 0)
    ),
    'sourceDistribution', coalesce((select jsonb_agg(to_jsonb(source_distribution) order by count desc, label) from source_distribution), '[]'::jsonb),
    'statusDistribution', coalesce((select jsonb_agg(to_jsonb(status_distribution) order by count desc, label) from status_distribution), '[]'::jsonb)
  );
$$;

revoke all on function public.wpi_search_price_collection_leads_v2(
  text, uuid, text, text, text, text, text, numeric, numeric, numeric, numeric, date, date, text, integer, integer
) from public, anon;
grant execute on function public.wpi_search_price_collection_leads_v2(
  text, uuid, text, text, text, text, text, numeric, numeric, numeric, numeric, date, date, text, integer, integer
) to authenticated;

comment on function public.wpi_search_price_collection_leads_v2(
  text, uuid, text, text, text, text, text, numeric, numeric, numeric, numeric, date, date, text, integer, integer
) is 'Organization-scoped price collection lead search with task scope, confidence filters and operational review metrics.';;
