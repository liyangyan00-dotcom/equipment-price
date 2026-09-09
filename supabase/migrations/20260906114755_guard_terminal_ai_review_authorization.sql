-- Check permission before returning terminal runs; no table or data changes.
CREATE OR REPLACE FUNCTION public.wpi_finish_equipment_ai_review(target_run_id uuid, final_status text, final_output jsonb DEFAULT NULL::jsonb, final_confidence numeric DEFAULT NULL::numeric, final_risk_level wpi_risk_level DEFAULT NULL::wpi_risk_level, final_error_code text DEFAULT NULL::text, final_error_message text DEFAULT NULL::text)
 RETURNS wpi_equipment_ai_review_runs
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  run_row public.wpi_equipment_ai_review_runs;
  review_row public.wpi_equipment_price_reviews;
  elevated_role boolean;
  output_judgment text;
  output_recommendation text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if final_status not in ('completed', 'needs_review', 'failed') then
    raise exception 'Unsupported AI run completion status';
  end if;
  if final_confidence is not null and (final_confidence < 0 or final_confidence > 100) then
    raise exception 'AI confidence must be between 0 and 100';
  end if;
  if final_status in ('completed', 'needs_review')
    and (final_output is null or jsonb_typeof(final_output) <> 'object') then
    raise exception 'Successful AI runs require a structured output object';
  end if;

  select * into run_row
  from public.wpi_equipment_ai_review_runs
  where id = target_run_id
  for update;

  if run_row.id is null then
    raise exception 'AI review run not found';
  end if;
  if not private.wpi_has_permission(run_row.organization_id, 'price.review') then
    raise exception 'Insufficient AI pre-review permission';
  end if;

  elevated_role := private.wpi_has_any_role(
    run_row.organization_id,
    array['admin', 'manager']::public.wpi_app_role[]
  );
  if run_row.requested_by is distinct from auth.uid() and not elevated_role then
    raise exception 'Only the requester or a manager can finish this AI run';
  end if;

  -- Completed runs are idempotent only after the caller is authorized.
  if run_row.status not in ('queued', 'running') then
    return run_row;
  end if;

  update public.wpi_equipment_ai_review_runs
  set
    status = final_status,
    output_payload = final_output,
    confidence = final_confidence,
    risk_level = final_risk_level,
    requires_human_review = true,
    error_code = nullif(btrim(final_error_code), ''),
    error_message = nullif(btrim(final_error_message), ''),
    completed_at = now()
  where id = run_row.id
  returning * into run_row;

  if final_status in ('completed', 'needs_review') then
    output_judgment := nullif(btrim(final_output ->> 'judgment'), '');
    output_recommendation := nullif(btrim(final_output ->> 'recommendation'), '');

    select * into review_row
    from public.wpi_equipment_price_reviews
    where id = run_row.review_id;

    if review_row.id is not null
      and review_row.status not in ('approved', 'rejected', 'archived') then
      update public.wpi_equipment_price_reviews
      set
        ai_judgment = coalesce(output_judgment, ai_judgment),
        ai_recommendation = coalesce(output_recommendation, ai_recommendation),
        confidence = coalesce(final_confidence, confidence),
        risk_level = coalesce(final_risk_level, risk_level)
      where id = review_row.id;
    end if;
  end if;

  return run_row;
end;
$function$
;
