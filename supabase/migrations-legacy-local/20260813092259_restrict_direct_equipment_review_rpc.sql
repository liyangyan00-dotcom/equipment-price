revoke all on function public.wpi_review_equipment_price(uuid, text, text)
from public, anon, authenticated;

comment on function public.wpi_review_equipment_price(uuid, text, text) is
  'Internal equipment price review transition function. Use wpi_submit_equipment_price_review or wpi_batch_review_equipment_prices from application clients.';
