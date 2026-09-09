update public.wpi_equipment_collection_discoveries
set status = 'queued',
    error_message = null,
    updated_at = now(),
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'requeuedReason', 'discover_direct_document_links'
    )
where status = 'fetched'
  and resource_type = 'catalog'
  and resource_url ~* '/product/[^/?#]+/downloads?(?:[/?#]|$)';
