create index wpi_ai_gateway_runs_integration_idx
  on public.wpi_ai_gateway_runs(integration_id, created_at desc)
  where integration_id is not null;
