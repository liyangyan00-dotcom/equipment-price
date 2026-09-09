create index if not exists wpi_collection_evidence_captured_by_idx
  on public.wpi_price_collection_evidence (captured_by)
  where captured_by is not null;
