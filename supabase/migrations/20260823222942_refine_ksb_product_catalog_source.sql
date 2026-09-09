update public.wpi_price_collection_sources
set
  base_url = 'https://www.ksb.com/zh-cn/chanpin/chanpin-mulu?productType=PUMP',
  allowed_hosts = array[
    'www.ksb.com',
    'ksb.com',
    'live-resources-e2e-sales.ksb.com',
    'live-commerce-proxy-e2e-sales.ksb.com'
  ]::text[],
  allowed_path_prefixes = array[
    '/zh-cn/chanpin/chanpin-mulu',
    '/zh-cn/lc/',
    '/resource/',
    '/rest/v2/ksb/users/anonymous/odata/disfile'
  ]::text[],
  discovery_enabled = true,
  max_discovery_depth = 2,
  config = coalesce(config, '{}'::jsonb) || jsonb_build_object(
    'catalogSeed', 'pump_product_catalog',
    'catalogProductType', 'PUMP',
    'authenticatedBrowserSessionRequired', false,
    'trackOfficialPdfLinks', true,
    'updatedFromOfficialCatalogAt', now()
  ),
  updated_at = now()
where source_code = 'KSB_OFFICIAL'
  and source_kind = 'web';
