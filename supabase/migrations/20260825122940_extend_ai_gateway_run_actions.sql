alter table public.wpi_ai_gateway_runs
  drop constraint if exists wpi_ai_gateway_runs_action_check;

alter table public.wpi_ai_gateway_runs
  add constraint wpi_ai_gateway_runs_action_check
  check (
    action = any (
      array[
        'execute'::text,
        'validate'::text,
        'recognize_quote_document'::text,
        'recognize_equipment_document'::text
      ]
    )
  );;
