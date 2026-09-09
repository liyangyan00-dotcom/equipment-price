create table public.wpi_dictionary_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  dictionary_type text not null check (dictionary_type in (
    'equipment_category',
    'material_category',
    'unit',
    'currency',
    'business_status'
  )),
  code text not null,
  name text not null,
  description text,
  parent_id uuid references public.wpi_dictionary_items(id) on delete set null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_system boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wpi_dictionary_code_format check (code ~ '^[A-Z0-9][A-Z0-9_.-]{0,63}$'),
  constraint wpi_dictionary_name_not_blank check (length(btrim(name)) between 1 and 100),
  constraint wpi_dictionary_sort_order_range check (sort_order between 0 and 9999),
  unique (organization_id, dictionary_type, code)
);

create index wpi_dictionary_items_org_type_sort_idx
  on public.wpi_dictionary_items(organization_id, dictionary_type, sort_order, name);
create index wpi_dictionary_items_parent_idx
  on public.wpi_dictionary_items(parent_id)
  where parent_id is not null;
create index wpi_dictionary_items_active_idx
  on public.wpi_dictionary_items(organization_id, dictionary_type)
  where is_active;

create trigger wpi_dictionary_items_updated_at
before update on public.wpi_dictionary_items
for each row execute function private.wpi_set_updated_at();

create trigger wpi_dictionary_items_audit
after insert or update or delete on public.wpi_dictionary_items
for each row execute function private.wpi_audit_row_change();

alter table public.wpi_dictionary_items enable row level security;

create policy wpi_dictionary_items_read on public.wpi_dictionary_items
for select to authenticated
using (private.wpi_is_org_member(organization_id));

create policy wpi_dictionary_items_insert on public.wpi_dictionary_items
for insert to authenticated
with check (
  private.wpi_has_permission(organization_id, 'settings.manage')
  and created_by = (select auth.uid())
  and (updated_by is null or updated_by = (select auth.uid()))
);

create policy wpi_dictionary_items_update on public.wpi_dictionary_items
for update to authenticated
using (private.wpi_has_permission(organization_id, 'settings.manage'))
with check (
  private.wpi_has_permission(organization_id, 'settings.manage')
  and updated_by = (select auth.uid())
);

create policy wpi_dictionary_items_delete on public.wpi_dictionary_items
for delete to authenticated
using (
  private.wpi_has_permission(organization_id, 'settings.manage')
  and not is_system
);

revoke all on public.wpi_dictionary_items from anon;
revoke all on public.wpi_dictionary_items from public;
grant select, insert, update, delete on public.wpi_dictionary_items to authenticated;
grant select, insert, update, delete on public.wpi_dictionary_items to service_role;

with seed(dictionary_type, code, name, description, sort_order, is_system, metadata) as (
  values
    ('equipment_category', 'PUMP', '水泵设备', '离心泵、潜水泵、排污泵与增压泵', 10, true, '{"color":"blue"}'::jsonb),
    ('equipment_category', 'VALVE', '阀门与管道配件', '蝶阀、闸阀、止回阀与管件', 20, true, '{"color":"cyan"}'::jsonb),
    ('equipment_category', 'ELECTRICAL', '电气与自动化', '配电、变频、仪表与自动控制设备', 30, true, '{"color":"purple"}'::jsonb),
    ('equipment_category', 'WATER_TREATMENT', '水处理工艺设备', '加药、过滤、消毒与污泥处理设备', 40, true, '{"color":"green"}'::jsonb),
    ('equipment_category', 'LAB', '实验室及检测设备', '分析仪器、在线监测与实验室辅助设备', 50, true, '{"color":"orange"}'::jsonb),
    ('equipment_category', 'AUXILIARY', '通用辅助设备', '风机、起重、空压与辅助机械', 60, true, '{"color":"slate"}'::jsonb),

    ('material_category', 'STEEL', '钢材', '钢筋、型钢、钢板与钢管', 10, true, '{"color":"blue"}'::jsonb),
    ('material_category', 'CEMENT', '水泥与胶凝材料', '水泥、粉煤灰与外加剂', 20, true, '{"color":"cyan"}'::jsonb),
    ('material_category', 'AGGREGATE', '砂石骨料', '砂、碎石与级配材料', 30, true, '{"color":"orange"}'::jsonb),
    ('material_category', 'PIPE', '管材', 'PE、PVC、球墨铸铁及其他管材', 40, true, '{"color":"purple"}'::jsonb),
    ('material_category', 'CABLE', '电缆与辅材', '电力电缆、控制电缆与安装辅材', 50, true, '{"color":"green"}'::jsonb),
    ('material_category', 'CHEMICAL', '药剂与耗材', '水处理药剂、滤料和实验耗材', 60, true, '{"color":"red"}'::jsonb),

    ('unit', 'PCS', '件', '按件计价', 10, true, '{"symbol":"件"}'::jsonb),
    ('unit', 'SET', '套', '成套设备计价', 20, true, '{"symbol":"套"}'::jsonb),
    ('unit', 'UNIT', '台', '设备台数计价', 30, true, '{"symbol":"台"}'::jsonb),
    ('unit', 'M', '米', '长度计价', 40, true, '{"symbol":"m"}'::jsonb),
    ('unit', 'M2', '平方米', '面积计价', 50, true, '{"symbol":"m²"}'::jsonb),
    ('unit', 'M3', '立方米', '体积计价', 60, true, '{"symbol":"m³"}'::jsonb),
    ('unit', 'KG', '千克', '重量计价', 70, true, '{"symbol":"kg"}'::jsonb),
    ('unit', 'TON', '吨', '吨位计价', 80, true, '{"symbol":"t"}'::jsonb),
    ('unit', 'BAG', '袋', '包装单位计价', 90, true, '{"symbol":"袋"}'::jsonb),

    ('currency', 'CNY', '人民币', '中国人民币', 10, true, '{"symbol":"¥","decimalPlaces":2}'::jsonb),
    ('currency', 'USD', '美元', '美元', 20, true, '{"symbol":"$","decimalPlaces":2}'::jsonb),
    ('currency', 'EUR', '欧元', '欧元', 30, true, '{"symbol":"€","decimalPlaces":2}'::jsonb),
    ('currency', 'CDF', '刚果法郎', '刚果民主共和国法定货币', 40, true, '{"symbol":"FC","decimalPlaces":2}'::jsonb),
    ('currency', 'ZAR', '南非兰特', '南非兰特', 50, true, '{"symbol":"R","decimalPlaces":2}'::jsonb),

    ('business_status', 'DRAFT', '草稿', '尚未提交审核', 10, true, '{"tone":"slate"}'::jsonb),
    ('business_status', 'PENDING_REVIEW', '待审核', '等待人工审核', 20, true, '{"tone":"orange"}'::jsonb),
    ('business_status', 'NEEDS_INFO', '待补充', '缺少必要字段或证据', 30, true, '{"tone":"orange"}'::jsonb),
    ('business_status', 'APPROVED', '已审核', '已通过人工审核', 40, true, '{"tone":"green"}'::jsonb),
    ('business_status', 'REJECTED', '已驳回', '审核不通过', 50, true, '{"tone":"red"}'::jsonb),
    ('business_status', 'ARCHIVED', '已归档', '已停止参与当前业务流程', 60, true, '{"tone":"slate"}'::jsonb)
)
insert into public.wpi_dictionary_items (
  organization_id,
  dictionary_type,
  code,
  name,
  description,
  sort_order,
  is_system,
  metadata,
  created_by
)
select
  organization.id,
  seed.dictionary_type,
  seed.code,
  seed.name,
  seed.description,
  seed.sort_order,
  seed.is_system,
  seed.metadata,
  organization.created_by
from public.wpi_organizations organization
cross join seed
on conflict (organization_id, dictionary_type, code) do nothing;
