create index if not exists wpi_comparison_quotes_inquiry_id_idx
  on public.wpi_comparison_quotes (inquiry_id);

create index if not exists wpi_comparison_quotes_organization_id_idx
  on public.wpi_comparison_quotes (organization_id);
