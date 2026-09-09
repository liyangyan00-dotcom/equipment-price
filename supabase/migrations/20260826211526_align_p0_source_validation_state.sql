update public.wpi_price_collection_sources
set is_active = true,
    last_checked_at = now(),
    last_error = null,
    updated_at = now()
where source_code in ('DRC_TALO_OFFICIAL', 'DRC_CAID_LOKOLE');

update public.wpi_price_collection_sources
set is_active = false,
    last_checked_at = now(),
    last_error = '来源连接超时，等待重新验证',
    updated_at = now()
where source_code = 'DRC_KINBRIQUE_P0';;
