update public.wpi_equipment_collection_discoveries as discovery
set status='tracked', run_id=null, error_message=null,
metadata=coalesce(discovery.metadata,'{}'::jsonb)||jsonb_build_object('trackedOnly',true,'parseStatus','not_applicable','requiresHumanReview',true),
updated_at=now()
where discovery.resource_type='pdf' and discovery.status='queued'
and not (lower(discovery.resource_url) ~ '/lokole/.*(janvier|fevrier|mars|avril|mai|juin|juillet|aout|sept(embre)?|octobre|novembre|decembre)[^/]*20[0-9]{2}')
and exists (select 1 from public.wpi_price_collection_sources source where source.id=discovery.source_id and source.config->>'adapter'='caid_lokole_reports');

update public.wpi_price_collection_evidence as evidence
set metadata=coalesce(evidence.metadata,'{}'::jsonb)||jsonb_build_object('trackedOnly',true,'parseStatus','not_applicable','requiresHumanReview',true)
where not (lower(evidence.source_url) ~ '/lokole/.*(janvier|fevrier|mars|avril|mai|juin|juillet|aout|sept(embre)?|octobre|novembre|decembre)[^/]*20[0-9]{2}')
and exists (select 1 from public.wpi_price_collection_sources source where source.id=evidence.source_id and source.config->>'adapter'='caid_lokole_reports');
