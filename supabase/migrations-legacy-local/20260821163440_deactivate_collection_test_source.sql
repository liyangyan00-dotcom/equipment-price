-- The controlled public API is retained for repeatable acceptance tests, but it
-- must never appear as a selectable production source.
update public.wpi_price_collection_sources
set is_active = false,
    updated_at = now()
where source_code = 'TEST_DUMMYJSON';
