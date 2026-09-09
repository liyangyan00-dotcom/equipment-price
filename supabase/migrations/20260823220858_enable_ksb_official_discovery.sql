update public.wpi_price_collection_sources
set
  discovery_enabled = true,
  max_discovery_depth = greatest(coalesce(max_discovery_depth, 2), 2),
  updated_at = now()
where source_code = 'KSB_OFFICIAL'
  and source_kind = 'web';
