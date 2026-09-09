create type public.wpi_price_review_task_status as enum (
  'pending',
  'in_review',
  'need_info',
  'approved',
  'rejected',
  'archived'
);

create table public.wpi_equipment_price_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  equipment_price_id uuid not null references public.wpi_equipment_prices(id) on delete cascade,
  status public.wpi_price_review_task_status not null default 'pending',
  confidence numeric(5,2) check (confidence between 0 and 100),
  completeness numeric(5,2) check (completeness between 0 and 100),
  risk_level public.wpi_risk_level not null default 'low',
  matched_rules text[] not null default '{}',
  missing_fields text[] not null default '{}',
  evidence_checks jsonb not null default '{}'::jsonb,
  ai_judgment text,
  ai_recommendation text,
  assigned_to uuid references auth.users(id),
  submitted_by uuid not null references auth.users(id),
  reviewed_by uuid references auth.users(id),
  review_comment text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, equipment_price_id)
);

create index wpi_equipment_price_reviews_org_status_idx
  on public.wpi_equipment_price_reviews(organization_id, status, submitted_at desc);
create index wpi_equipment_price_reviews_equipment_idx
  on public.wpi_equipment_price_reviews(equipment_price_id);
create index wpi_equipment_price_reviews_assignee_idx
  on public.wpi_equipment_price_reviews(assigned_to, status)
  where assigned_to is not null;

create trigger wpi_equipment_price_reviews_updated_at
before update on public.wpi_equipment_price_reviews
for each row execute function private.wpi_set_updated_at();

create trigger wpi_equipment_price_reviews_audit
after insert or update or delete on public.wpi_equipment_price_reviews
for each row execute function private.wpi_audit_row_change();

alter table public.wpi_equipment_price_reviews enable row level security;

create policy wpi_equipment_price_reviews_read on public.wpi_equipment_price_reviews
for select to authenticated
using (private.wpi_has_permission(organization_id, 'price.read'));

create policy wpi_equipment_price_reviews_insert on public.wpi_equipment_price_reviews
for insert to authenticated
with check (
  private.wpi_has_permission(organization_id, 'price.review')
  and submitted_by = auth.uid()
);

create policy wpi_equipment_price_reviews_update on public.wpi_equipment_price_reviews
for update to authenticated
using (private.wpi_has_permission(organization_id, 'price.review'))
with check (private.wpi_has_permission(organization_id, 'price.review'));

create policy wpi_equipment_price_reviews_delete on public.wpi_equipment_price_reviews
for delete to authenticated
using (private.wpi_has_permission(organization_id, 'price.review'));

revoke all on public.wpi_equipment_price_reviews from anon;
grant select, insert, update, delete on public.wpi_equipment_price_reviews to authenticated;

create or replace function public.wpi_review_equipment_price(
  review_id uuid,
  decision text,
  comment text default null
)
returns public.wpi_equipment_price_reviews
language plpgsql
security definer
set search_path = ''
as $$
declare
  review_row public.wpi_equipment_price_reviews;
  next_task_status public.wpi_price_review_task_status;
  next_price_status public.wpi_review_status;
begin
  select *
  into review_row
  from public.wpi_equipment_price_reviews
  where id = review_id;

  if review_row.id is null then
    raise exception 'Review task not found';
  end if;

  if not private.wpi_has_permission(review_row.organization_id, 'price.review') then
    raise exception 'Insufficient review permission';
  end if;

  case decision
    when 'start' then
      next_task_status := 'in_review';
      next_price_status := 'pending_review';
    when 'approve' then
      next_task_status := 'approved';
      next_price_status := 'approved';
    when 'reject' then
      next_task_status := 'rejected';
      next_price_status := 'rejected';
    when 'need_info' then
      next_task_status := 'need_info';
      next_price_status := 'pending_review';
    else
      raise exception 'Unsupported review decision: %', decision;
  end case;

  if decision in ('reject', 'need_info') and nullif(btrim(comment), '') is null then
    raise exception 'A review comment is required for this decision';
  end if;

  update public.wpi_equipment_price_reviews
  set
    status = next_task_status,
    assigned_to = coalesce(assigned_to, auth.uid()),
    reviewed_by = case when decision = 'start' then reviewed_by else auth.uid() end,
    review_comment = case
      when decision = 'start' then review_comment
      else nullif(btrim(comment), '')
    end,
    reviewed_at = case when decision = 'start' then reviewed_at else now() end
  where id = review_id
  returning * into review_row;

  update public.wpi_equipment_prices
  set
    review_status = next_price_status,
    updated_by = auth.uid()
  where id = review_row.equipment_price_id
    and organization_id = review_row.organization_id;

  return review_row;
end;
$$;

revoke all on function public.wpi_review_equipment_price(uuid, text, text) from public, anon;
grant execute on function public.wpi_review_equipment_price(uuid, text, text) to authenticated;

insert into public.wpi_equipment_price_reviews (
  organization_id,
  equipment_price_id,
  status,
  confidence,
  completeness,
  risk_level,
  matched_rules,
  missing_fields,
  evidence_checks,
  ai_judgment,
  ai_recommendation,
  submitted_by,
  submitted_at
)
select
  price.organization_id,
  price.id,
  case
    when price.review_status = 'approved' then 'approved'::public.wpi_price_review_task_status
    when price.review_status = 'rejected' then 'rejected'::public.wpi_price_review_task_status
    when price.review_status = 'archived' then 'archived'::public.wpi_price_review_task_status
    else 'pending'::public.wpi_price_review_task_status
  end,
  coalesce(price.confidence, 60),
  greatest(
    48,
    least(
      98,
      coalesce(price.confidence, 60)
      - case when price.supplier_id is null then 8 else 0 end
      - case when price.source_type in ('AI采集', '邮件报价') then 5 else 0 end
    )
  ),
  price.risk_level,
  array_remove(
    array[
      case when price.risk_level in ('high', 'critical') then '价格偏离阈值' end,
      case when price.confidence < 70 then '低置信度需人工复核' end,
      case when price.supplier_id is null then '供应商主体缺失' end,
      case when price.source_type = 'AI采集' then 'AI采集来源待核验' end
    ],
    null
  ),
  array_remove(
    array[
      case when price.supplier_id is null then '供应商' end,
      case when price.valid_until is null then '价格有效期' end,
      case when coalesce(price.technical_parameters ->> 'specification', price.model, '') = '' then '规格型号' end
    ],
    null
  ),
  jsonb_build_object(
    'price_source', price.source_type is not null,
    'supplier', price.supplier_id is not null,
    'technical_parameters', coalesce(price.technical_parameters, '{}'::jsonb) <> '{}'::jsonb,
    'validity', price.valid_until is not null
  ),
  case
    when price.risk_level = 'critical' then '价格风险严重，当前记录不得直接进入询价或项目套价。'
    when price.risk_level = 'high' then '价格与同类样本偏差较大，需核验来源与技术参数。'
    when price.confidence < 70 then '来源置信度不足，建议补充原始报价证据。'
    when price.supplier_id is null then '价格基础字段可用，但供应商主体尚未完成匹配。'
    else '价格、参数与来源基本一致，可由人工审核后纳入正式价格库。'
  end,
  case
    when price.risk_level in ('high', 'critical') then '优先人工复核价格差异与证据链。'
    when price.supplier_id is null then '补全供应商并核验联系方式后再通过。'
    when price.valid_until is null then '补充价格有效期，避免过期价格进入套价。'
    else '核对原始附件后可人工通过。'
  end,
  price.created_by,
  price.created_at
from public.wpi_equipment_prices price
on conflict (organization_id, equipment_price_id) do nothing;
