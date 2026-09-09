-- Queue previously discovered CAID reports so the document parser can backfill
-- monthly, review-only price leads. New reports are queued by the collector.
update public.wpi_equipment_collection_discoveries as discovery
set
  status = 'queued',
  error_message = null,
  run_id = null,
  metadata = coalesce(discovery.metadata, '{}'::jsonb) || jsonb_build_object(
    'trackedOnly', false,
    'parseStatus', 'queued',
    'parser', 'caid-price-report-v1',
    'requiresHumanReview', true
  ),
  updated_at = now()
where discovery.resource_type = 'pdf'
  and discovery.status = 'tracked'
  and lower(discovery.resource_url) ~ '/lokole/.*(janvier|fevrier|mars|avril|mai|juin|juillet|aout|sept(embre)?|octobre|novembre|decembre)[^/]*20[0-9]{2}'
  and exists (
    select 1
    from public.wpi_price_collection_sources as source
    where source.id = discovery.source_id
      and source.config ->> 'adapter' = 'caid_lokole_reports'
  );

update public.wpi_price_collection_evidence as evidence
set metadata = coalesce(evidence.metadata, '{}'::jsonb) || jsonb_build_object(
  'trackedOnly', false,
  'parseStatus', 'queued',
  'parser', 'caid-price-report-v1',
  'requiresHumanReview', true
)
where evidence.metadata ->> 'documentFormat' in ('pdf', 'xls', 'xlsx')
  and lower(evidence.source_url) ~ '/lokole/.*(janvier|fevrier|mars|avril|mai|juin|juillet|aout|sept(embre)?|octobre|novembre|decembre)[^/]*20[0-9]{2}'
  and exists (
    select 1
    from public.wpi_price_collection_sources as source
    where source.id = evidence.source_id
      and source.config ->> 'adapter' = 'caid_lokole_reports'
  );
