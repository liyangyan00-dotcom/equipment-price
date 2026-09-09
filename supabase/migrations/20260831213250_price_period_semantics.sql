alter table public.wpi_price_collection_leads
  add column if not exists price_period_granularity text not null default 'unknown';

alter table public.wpi_price_collection_leads
  drop constraint if exists wpi_price_collection_leads_price_period_granularity_check;

alter table public.wpi_price_collection_leads
  add constraint wpi_price_collection_leads_price_period_granularity_check
  check (price_period_granularity in ('day', 'month', 'unknown'));

update public.wpi_price_collection_leads
set price_period_granularity = case
  when quote_date is null then 'unknown'
  when source_url ilike '%economie.gouv.cd/talo%' then 'month'
  else 'day'
end
where price_period_granularity = 'unknown';

create index if not exists wpi_price_collection_leads_quote_date_idx
  on public.wpi_price_collection_leads (organization_id, quote_date desc)
  where quote_date is not null;

comment on column public.wpi_price_collection_leads.quote_date is
  '价格所属日期。月度价格统一存储为该月第一天，不代表采集时间。';
comment on column public.wpi_price_collection_leads.price_period_granularity is
  '价格所属期粒度：day=具体日期，month=月度价格，unknown=来源未给出价格日期。';

create or replace function public.wpi_search_price_collection_leads_v4(
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
  filter_validity_status text default null,
  filter_issue text default null,
  page_number integer default 1,
  page_size integer default 10
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with scoped as materialized (
    select
      lead.*,
      exists (
        select 1 from public.wpi_price_collection_evidence evidence
        where evidence.lead_id = lead.id
      ) as has_evidence,
      (upper(lead.currency) <> 'CNY'
        and (lead.fx_status <> 'verified' or coalesce(lead.normalized_price_cny, 0) <= 0)) as has_fx_issue,
      (lead.source_checked_at is null
        or lead.source_checked_at < now() - interval '180 days') as has_stale_source
    from public.wpi_price_collection_leads lead
    where (nullif(btrim(search_keyword), '') is null
      or lead.lead_code ilike '%' || btrim(search_keyword) || '%'
      or lead.name ilike '%' || btrim(search_keyword) || '%'
      or coalesce(lead.specification, '') ilike '%' || btrim(search_keyword) || '%'
      or coalesce(lead.supplier_name, '') ilike '%' || btrim(search_keyword) || '%')
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
      and (filter_date_from is null or lead.quote_date >= filter_date_from)
      and (filter_date_to is null or lead.quote_date <= filter_date_to)
      and (nullif(filter_assignee, '') is null
        or (filter_assignee = 'unassigned' and lead.assigned_reviewer_id is null)
        or (filter_assignee <> 'unassigned' and lead.assigned_reviewer_id = filter_assignee::uuid))
  ), issue_scoped as materialized (
    select * from scoped
    where nullif(filter_validity_status, '') is null or price_validity_status = filter_validity_status
  ), filtered as materialized (
    select * from issue_scoped
    where nullif(filter_issue, '') is null
      or (filter_issue = 'missing_evidence' and not has_evidence)
      or (filter_issue = 'missing_fx' and has_fx_issue)
      or (filter_issue = 'duplicate' and duplicate_status = 'suspected_duplicate')
      or (filter_issue = 'stale_source' and has_stale_source)
      or (filter_issue = 'invalid_fields' and price_validity_status <> 'valid')
      or (filter_issue = 'critical_risk' and risk_level::text = 'critical')
      or (filter_issue = 'admission' and (
        not has_evidence or has_fx_issue or duplicate_status = 'suspected_duplicate'
        or has_stale_source or price_validity_status <> 'valid' or risk_level::text = 'critical'
      ))
  ), page_rows as (
    select * from filtered order by quote_date desc nulls last, created_at desc, id desc
    limit greatest(1, least(coalesce(page_size, 10), 100))
    offset (greatest(coalesce(page_number, 1), 1) - 1) * greatest(1, least(coalesce(page_size, 10), 100))
  ), source_distribution as (
    select source_type as label, count(*)::integer as count from filtered group by source_type
  ), status_distribution as (
    select status as label, count(*)::integer as count from filtered group by status
  )
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(to_jsonb(page_rows) - 'has_evidence' - 'has_fx_issue' - 'has_stale_source' order by quote_date desc nulls last, created_at desc, id desc) from page_rows), '[]'::jsonb),
    'pagination', jsonb_build_object(
      'page', greatest(coalesce(page_number, 1), 1),
      'pageSize', greatest(1, least(coalesce(page_size, 10), 100)),
      'total', (select count(*) from filtered),
      'pageCount', greatest(1, ceil((select count(*) from filtered)::numeric / greatest(1, least(coalesce(page_size, 10), 100)))::integer)),
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
      'averageMatch', coalesce((select round(avg(ai_match_score), 1) from filtered), 0),
      'valid', (select count(*) from scoped where price_validity_status = 'valid'),
      'needsReview', (select count(*) from scoped where price_validity_status = 'needs_review'),
      'invalid', (select count(*) from scoped where price_validity_status = 'invalid')),
    'issueSummary', jsonb_build_object(
      'missingEvidence', (select count(*) from issue_scoped where not has_evidence),
      'missingFx', (select count(*) from issue_scoped where has_fx_issue),
      'duplicate', (select count(*) from issue_scoped where duplicate_status = 'suspected_duplicate'),
      'staleSource', (select count(*) from issue_scoped where has_stale_source),
      'invalidFields', (select count(*) from issue_scoped where price_validity_status <> 'valid'),
      'criticalRisk', (select count(*) from issue_scoped where risk_level::text = 'critical')),
    'sourceDistribution', coalesce((select jsonb_agg(to_jsonb(source_distribution) order by count desc, label) from source_distribution), '[]'::jsonb),
    'statusDistribution', coalesce((select jsonb_agg(to_jsonb(status_distribution) order by count desc, label) from status_distribution), '[]'::jsonb));
$$;

revoke all on function public.wpi_search_price_collection_leads_v4(
  text, uuid, text, text, text, text, text, numeric, numeric, numeric, numeric,
  date, date, text, text, text, integer, integer
) from public, anon;
grant execute on function public.wpi_search_price_collection_leads_v4(
  text, uuid, text, text, text, text, text, numeric, numeric, numeric, numeric,
  date, date, text, text, text, integer, integer
) to authenticated, service_role;

comment on function public.wpi_search_price_collection_leads_v4(
  text, uuid, text, text, text, text, text, numeric, numeric, numeric, numeric,
  date, date, text, text, text, integer, integer
) is 'Price lead search. Date filters use quote_date (price period), never collection created_at.';



