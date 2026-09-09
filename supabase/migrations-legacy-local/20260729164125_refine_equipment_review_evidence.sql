update public.wpi_equipment_price_reviews review
set evidence_checks = jsonb_set(
  review.evidence_checks,
  '{price_source}',
  to_jsonb(
    price.source_url is not null
    or price.source_type in ('报价单', '历史成交')
  ),
  true
)
from public.wpi_equipment_prices price
where price.id = review.equipment_price_id;
