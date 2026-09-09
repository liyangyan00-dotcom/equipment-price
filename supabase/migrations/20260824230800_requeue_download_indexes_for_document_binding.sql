update public.wpi_equipment_collection_discoveries
set status = 'queued',
    error_message = null,
    updated_at = now(),
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'requeuedReason', 'bind_documents_to_parent_catalog'
    )
where status = 'fetched'
  and resource_type = 'catalog'
  and resource_url ~* '/product/[^/?#]+/downloads?(?:[/?#]|$)';
