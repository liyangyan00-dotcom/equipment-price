alter table public.wpi_price_collection_leads
  add column if not exists quote_date date;

comment on column public.wpi_price_collection_leads.quote_date is
  '报价日期或官方价格观测期；月度数据统一保存为当月第一天。';

create index if not exists wpi_price_collection_leads_quote_date_idx
  on public.wpi_price_collection_leads(organization_id, quote_date desc)
  where quote_date is not null;;
