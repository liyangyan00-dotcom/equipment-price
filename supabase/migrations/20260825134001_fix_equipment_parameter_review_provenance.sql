create or replace function public.wpi_review_equipment_catalog_parameter_candidate(
  p_catalog_id uuid,
  p_candidate_id uuid,
  p_decision text,
  p_note text default ''
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_candidate public.wpi_equipment_catalog_parameter_candidates%rowtype;
  v_pending_count integer;
  v_reviewed_at timestamptz := now();
  v_provider text;
  v_model text;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_decision not in ('accepted', 'rejected') then raise exception 'INVALID_REVIEW_DECISION'; end if;

  select * into v_candidate
  from public.wpi_equipment_catalog_parameter_candidates
  where id = p_candidate_id and equipment_catalog_id = p_catalog_id
  for update;

  if not found then raise exception 'PARAMETER_CANDIDATE_NOT_FOUND'; end if;
  if v_candidate.review_decision <> 'pending' then raise exception 'PARAMETER_CANDIDATE_ALREADY_REVIEWED'; end if;

  select provider, model into v_provider, v_model
  from public.wpi_equipment_catalog_document_jobs
  where id = v_candidate.job_id;

  if p_decision = 'accepted' then
    insert into public.wpi_equipment_catalog_parameters (
      organization_id, equipment_catalog_id, parameter_code, parameter_name,
      raw_value, normalized_value, data_type, unit, is_key, source_page,
      source_evidence, confidence, review_status, created_by, updated_by, updated_at
    ) values (
      v_candidate.organization_id, v_candidate.equipment_catalog_id,
      v_candidate.parameter_code, v_candidate.parameter_name,
      v_candidate.proposed_value, v_candidate.proposed_value, 'text',
      coalesce(v_candidate.proposed_unit, ''),
      v_candidate.risk_level in ('high', 'critical'), v_candidate.source_page,
      jsonb_build_object(
        'sourceUrl', v_candidate.source_url,
        'pageNumber', v_candidate.source_page,
        'bbox', v_candidate.bounding_box,
        'sourceText', v_candidate.source_text,
        'documentJobId', v_candidate.job_id,
        'candidateId', v_candidate.id,
        'extractionMethod', case when lower(coalesce(v_provider, '')) like '%deepseek%'
          then 'deepseek_pdf_text' else 'provider_document_recognition' end,
        'provider', v_provider,
        'model', v_model,
        'humanConfirmed', true,
        'confirmedBy', (select auth.uid()),
        'confirmedAt', v_reviewed_at
      ),
      v_candidate.confidence, 'approved', (select auth.uid()), (select auth.uid()), v_reviewed_at
    )
    on conflict (equipment_catalog_id, parameter_code) do update set
      parameter_name = excluded.parameter_name,
      raw_value = excluded.raw_value,
      normalized_value = excluded.normalized_value,
      unit = excluded.unit,
      is_key = public.wpi_equipment_catalog_parameters.is_key or excluded.is_key,
      source_page = excluded.source_page,
      source_evidence = excluded.source_evidence,
      confidence = excluded.confidence,
      review_status = 'approved',
      updated_by = (select auth.uid()),
      updated_at = v_reviewed_at;
  end if;

  update public.wpi_equipment_catalog_parameter_candidates
  set review_decision = p_decision,
      review_note = left(coalesce(p_note, ''), 2000),
      reviewed_by = (select auth.uid()),
      reviewed_at = v_reviewed_at
  where id = v_candidate.id;

  select count(*)::integer into v_pending_count
  from public.wpi_equipment_catalog_parameter_candidates
  where job_id = v_candidate.job_id and review_decision = 'pending';

  update public.wpi_equipment_catalog_document_jobs
  set status = case when v_pending_count > 0 then 'needs_review' else 'completed' end
  where id = v_candidate.job_id;

  update public.wpi_equipment_catalog
  set review_status = 'pending_review', updated_by = (select auth.uid()), updated_at = v_reviewed_at
  where id = v_candidate.equipment_catalog_id and organization_id = v_candidate.organization_id;

  return jsonb_build_object(
    'candidateId', v_candidate.id,
    'decision', p_decision,
    'pendingCount', v_pending_count,
    'jobStatus', case when v_pending_count > 0 then 'needs_review' else 'completed' end
  );
end;
$$;

revoke all on function public.wpi_review_equipment_catalog_parameter_candidate(uuid, uuid, text, text) from public, anon;
grant execute on function public.wpi_review_equipment_catalog_parameter_candidate(uuid, uuid, text, text) to authenticated;

comment on function public.wpi_review_equipment_catalog_parameter_candidate(uuid, uuid, text, text) is
  '原子确认设备文档参数候选；接受时按真实 Provider 留存证据并写入已审核正式参数。';

;
