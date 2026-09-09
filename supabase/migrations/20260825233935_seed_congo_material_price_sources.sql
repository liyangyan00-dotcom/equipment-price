with actor as (
  select organization_id, created_by
  from public.wpi_price_collection_sources
  order by created_at
  limit 1
), seeds(source_code, name, base_url, host_name, region, quality_score, active, crawl_depth, config) as (
  values
    ('DRC_KINBRIQUE_MAIN', 'KinBrique 建材目录', 'https://kinbrique.com/', 'kinbrique.com', 'DRC / Kinshasa', 75, true, 2,
      '{"targetType":"material","catalogSourceType":"material_ecommerce","country":"DRC","city":"Kinshasa","materialCategories":["ciment","fer_a_beton","agregats","briques","paves","outillage"],"collectionMethod":"website_catalog_parse","trustLevel":"B","requiresHumanReview":true,"aiFinalDecision":false,"directPriceAllowed":false,"requiresManualConfirmation":true,"supportsWhatsApp":true,"supportsDeliveryInfo":true,"locale":"fr-CD","priceUsePolicy":"quote_candidate_only"}'::jsonb),
    ('DRC_KINBRIQUE_CIMENT', 'KinBrique 水泥分类', 'https://kinbrique.com/index.php/product-category/gros-oeuvre/ciment/', 'kinbrique.com', 'DRC / Kinshasa', 78, true, 2,
      '{"targetType":"material","catalogSourceType":"material_ecommerce","country":"DRC","city":"Kinshasa","materialCategories":["ciment"],"collectionMethod":"product_page_parse","trustLevel":"B","requiresHumanReview":true,"aiFinalDecision":false,"directPriceAllowed":false,"requiresManualConfirmation":true,"supportsWhatsApp":true,"supportsDeliveryInfo":true,"locale":"fr-CD","priceUsePolicy":"quote_candidate_only"}'::jsonb),
    ('DRC_JIJI_BUILDING', 'Jiji.cd 建材分类', 'https://jiji.cd/building-materials', 'jiji.cd', 'DRC / Kinshasa', 60, true, 1,
      '{"targetType":"material","catalogSourceType":"classified_marketplace","country":"DRC","city":"Kinshasa","materialCategories":["fer_a_beton","briques","blocs","peinture","outillage","bitume"],"collectionMethod":"classified_listing_parse","trustLevel":"C","requiresHumanReview":true,"aiFinalDecision":false,"directPriceAllowed":false,"requiresManualConfirmation":true,"locale":"fr-CD","priceUsePolicy":"market_lead_only"}'::jsonb),
    ('DRC_JIJI_CONSTRUCTION', 'Jiji.cd 工程与维修分类', 'https://jiji.cd/repair-and-construction', 'jiji.cd', 'DRC / Kinshasa', 60, true, 1,
      '{"targetType":"material","catalogSourceType":"classified_marketplace","country":"DRC","city":"Kinshasa","materialCategories":["materiaux_construction","electricite","plomberie","outillage"],"collectionMethod":"classified_listing_parse","trustLevel":"C","requiresHumanReview":true,"aiFinalDecision":false,"directPriceAllowed":false,"requiresManualConfirmation":true,"locale":"fr-CD","priceUsePolicy":"market_lead_only"}'::jsonb),
    ('DRC_SOKONGO_MATERIALS', 'Sokongo 建材分类', 'https://sokongo.cd/categorie/materiaux-de-construction', 'sokongo.cd', 'DRC / Kinshasa', 60, true, 1,
      '{"targetType":"material","catalogSourceType":"classified_marketplace","country":"DRC","city":"Kinshasa","materialCategories":["materiaux_construction"],"collectionMethod":"classified_listing_parse","trustLevel":"C","requiresHumanReview":true,"aiFinalDecision":false,"directPriceAllowed":false,"requiresManualConfirmation":true,"locale":"fr-CD","priceUsePolicy":"market_lead_only"}'::jsonb),
    ('DRC_ALBATROS', 'Albatros RDC 建材供应商', 'https://albatrosrdc.com/', 'albatrosrdc.com', 'DRC / Kinshasa', 75, true, 2,
      '{"targetType":"material","catalogSourceType":"supplier_site","country":"DRC","city":"Kinshasa","materialCategories":["ciment","briques","parpaings","tole","plomberie","electricite","outillage"],"collectionMethod":"supplier_profile_parse","trustLevel":"B","requiresHumanReview":true,"aiFinalDecision":false,"directPriceAllowed":false,"requiresManualConfirmation":true,"supportsDeliveryInfo":true,"locale":"fr-CD","priceUsePolicy":"supplier_lead_only"}'::jsonb),
    ('DRC_EDEN_BUSINESS', 'Eden Business 材料供应', 'https://www.edenbusiness.cd/services/', 'www.edenbusiness.cd', 'DRC / Kinshasa', 75, true, 2,
      '{"targetType":"material","catalogSourceType":"supplier_site","country":"DRC","city":"Kinshasa","materialCategories":["ciment","sable","gravier","briques","fer_a_beton","barres_de_fer","bois","coffrage"],"collectionMethod":"supplier_profile_parse","trustLevel":"B","requiresHumanReview":true,"aiFinalDecision":false,"directPriceAllowed":false,"requiresManualConfirmation":true,"supportsDeliveryInfo":true,"locale":"fr-CD","priceUsePolicy":"supplier_lead_only"}'::jsonb),
    ('DRC_CILUMARKET', 'CiluMarket 水泥产品', 'https://www.cilumarket.com/', 'www.cilumarket.com', 'DRC / Kinshasa', 85, false, 2,
      '{"targetType":"material","catalogSourceType":"manufacturer_site","country":"DRC","city":"Kinshasa","materialCategories":["ciment"],"collectionMethod":"manufacturer_product_parse","trustLevel":"A","requiresHumanReview":true,"aiFinalDecision":false,"directPriceAllowed":false,"requiresManualConfirmation":true,"locale":"fr-CD","priceUsePolicy":"product_reference_only"}'::jsonb),
    ('DRC_NEGO_CONGO', 'Nego Congo 水泥分销', 'https://negocongo.com/', 'negocongo.com', 'DRC / Kinshasa', 75, true, 2,
      '{"targetType":"material","catalogSourceType":"distributor_site","country":"DRC","city":"Kinshasa","materialCategories":["ciment","transport"],"collectionMethod":"distributor_profile_parse","trustLevel":"B","requiresHumanReview":true,"aiFinalDecision":false,"directPriceAllowed":false,"requiresManualConfirmation":true,"supportsDeliveryInfo":true,"locale":"fr-CD","priceUsePolicy":"supplier_lead_only"}'::jsonb),
    ('DRC_HAZINA_YAKILI', 'Hazina Y''Akili 水泥销售与运输', 'https://hazinayakili.com/', 'hazinayakili.com', 'DRC', 75, true, 2,
      '{"targetType":"material","catalogSourceType":"cement_supplier","country":"DRC","materialCategories":["ciment","transport"],"collectionMethod":"supplier_profile_parse","trustLevel":"B","requiresHumanReview":true,"aiFinalDecision":false,"directPriceAllowed":false,"requiresManualConfirmation":true,"supportsDeliveryInfo":true,"locale":"fr-CD","priceUsePolicy":"supplier_lead_only"}'::jsonb),
    ('DRC_APCC_SARLU', 'APCC SARLU 水泥与材料供应', 'https://apccsarlu.cloud/', 'apccsarlu.cloud', 'DRC / Bukavu / Kinshasa / Uvira', 75, false, 2,
      '{"targetType":"material","catalogSourceType":"supplier_site","country":"DRC","coverageArea":["Bukavu","Kinshasa","Uvira"],"materialCategories":["ciment","materiaux_construction","logistique"],"collectionMethod":"supplier_profile_parse","trustLevel":"B","requiresHumanReview":true,"aiFinalDecision":false,"directPriceAllowed":false,"requiresManualConfirmation":true,"locale":"fr-CD","priceUsePolicy":"supplier_lead_only"}'::jsonb),
    ('DRC_SOZAMO', 'Sozamo 建材供应', 'https://sozamo.net/', 'sozamo.net', 'DRC / Kinshasa', 75, false, 2,
      '{"targetType":"material","catalogSourceType":"supplier_site","country":"DRC","city":"Kinshasa","materialCategories":["acier","bois","beton","sable","briques","ciment","plastique"],"collectionMethod":"supplier_profile_parse","trustLevel":"B","requiresHumanReview":true,"aiFinalDecision":false,"directPriceAllowed":false,"requiresManualConfirmation":true,"locale":"fr-CD","priceUsePolicy":"supplier_lead_only"}'::jsonb),
    ('DRC_CIMKO', 'CIMKO 水泥厂家', 'https://cimko.cd/', 'cimko.cd', 'DRC / Kinshasa', 85, true, 2,
      '{"targetType":"material","catalogSourceType":"manufacturer_site","country":"DRC","city":"Kinshasa","materialCategories":["ciment"],"collectionMethod":"manufacturer_product_parse","trustLevel":"A","requiresHumanReview":true,"aiFinalDecision":false,"directPriceAllowed":false,"requiresManualConfirmation":true,"locale":"fr-CD","priceUsePolicy":"product_reference_only"}'::jsonb),
    ('DRC_CIMENKAT', 'CIMENKAT 水泥厂家', 'https://www.cimenkat.com/', 'www.cimenkat.com', 'DRC / Lubumbashi', 85, true, 2,
      '{"targetType":"material","catalogSourceType":"manufacturer_site","country":"DRC","city":"Lubumbashi","materialCategories":["ciment"],"collectionMethod":"manufacturer_product_parse","trustLevel":"A","requiresHumanReview":true,"aiFinalDecision":false,"directPriceAllowed":false,"requiresManualConfirmation":true,"locale":"fr-CD","priceUsePolicy":"product_reference_only"}'::jsonb),
    ('DRC_GOAFRICA_MATERIALS', 'GoAfricaOnline 建材企业目录', 'https://www.goafricaonline.com/cd/annuaire/materiaux-construction', 'www.goafricaonline.com', 'DRC', 60, true, 1,
      '{"targetType":"material","catalogSourceType":"supplier_directory","country":"DRC","materialCategories":["materiaux_construction"],"collectionMethod":"supplier_directory_parse","trustLevel":"C","requiresHumanReview":true,"aiFinalDecision":false,"directPriceAllowed":false,"requiresManualConfirmation":true,"locale":"fr-CD","priceUsePolicy":"directory_discovery_only"}'::jsonb)
)
insert into public.wpi_price_collection_sources (
  organization_id, source_code, name, source_kind, base_url, allowed_hosts,
  allowed_path_prefixes, is_active, robots_policy, rate_limit_per_minute,
  default_currency, default_region, quality_score, extraction_strategy, config,
  last_checked_at, last_error, created_by, updated_by, discovery_enabled, max_discovery_depth
)
select
  actor.organization_id, seeds.source_code, seeds.name, 'web', seeds.base_url,
  array[seeds.host_name], array['/'], seeds.active, 'respect',
  case when seeds.config ->> 'catalogSourceType' = 'classified_marketplace' then 2 else 4 end,
  'USD', seeds.region, seeds.quality_score, 'structured_data', seeds.config,
  case when seeds.active then now() else null end,
  case when seeds.active then null else '来源连接超时，等待重新验证' end,
  actor.created_by, actor.created_by, true, seeds.crawl_depth
from actor cross join seeds
on conflict (organization_id, source_code) do update set
  name = excluded.name,
  base_url = excluded.base_url,
  allowed_hosts = excluded.allowed_hosts,
  allowed_path_prefixes = excluded.allowed_path_prefixes,
  is_active = excluded.is_active,
  robots_policy = excluded.robots_policy,
  rate_limit_per_minute = excluded.rate_limit_per_minute,
  default_currency = excluded.default_currency,
  default_region = excluded.default_region,
  quality_score = excluded.quality_score,
  extraction_strategy = excluded.extraction_strategy,
  config = excluded.config,
  last_checked_at = excluded.last_checked_at,
  last_error = excluded.last_error,
  discovery_enabled = excluded.discovery_enabled,
  max_discovery_depth = excluded.max_discovery_depth,
  updated_by = excluded.updated_by,
  updated_at = now();

;
