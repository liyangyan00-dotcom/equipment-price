create index wpi_equipment_ai_review_runs_equipment_price_idx
  on public.wpi_equipment_ai_review_runs(equipment_price_id)
  where equipment_price_id is not null;

create index wpi_equipment_ai_review_runs_requested_by_idx
  on public.wpi_equipment_ai_review_runs(requested_by, created_at desc);

;
