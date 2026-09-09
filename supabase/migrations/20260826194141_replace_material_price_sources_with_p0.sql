do $$
declare
  tenant record;
  p0_source_ids jsonb;
begin
  for tenant in
    select distinct on (organization_id)
      organization_id,
      coalesce(updated_by, created_by) as actor_id
    from public.wpi_price_collection_sources
    where config ->> 'targetType' = 'material'
    order by organization_id, updated_at desc nulls last, created_at desc
  loop
    delete from public.wpi_price_collection_sources
    where organization_id = tenant.organization_id
      and config ->> 'targetType' = 'material';

    insert into public.wpi_price_collection_sources (
      organization_id,
      source_code,
      name,
      source_kind,
      base_url,
      allowed_hosts,
      allowed_path_prefixes,
      is_active,
      robots_policy,
      rate_limit_per_minute,
      default_currency,
      default_region,
      quality_score,
      extraction_strategy,
      config,
      created_by,
      updated_by,
      discovery_enabled,
      max_discovery_depth
    ) values
      (
        tenant.organization_id,
        'DRC_TALO_OFFICIAL',
        'TALO 刚果（金）官方价格观测',
        'web',
        'https://economie.gouv.cd/talo',
        array['economie.gouv.cd'],
        array['/talo'],
        true,
        'respect',
        6,
        'CDF',
        'DRC / Kinshasa',
        92,
        'json_api',
        '{
          "targetType":"material",
          "priority":"P0",
          "adapter":"talo_public_json",
          "catalogSourceType":"government_price_observatory",
          "collectionMethod":"public_json_api",
          "country":"DRC",
          "locale":"fr-CD",
          "taloDefaultProduct":"CIMENT",
          "taloMaxBrandsPerRun":3,
          "taloMaxUnitsPerBrand":1,
          "materialCategories":["ciment","fer_a_beton","clous","corniere","tole","tube_carre"],
          "trustLevel":"A",
          "requiresHumanReview":true,
          "aiFinalDecision":false,
          "directPriceAllowed":false,
          "requiresManualConfirmation":true,
          "priceUsePolicy":"official_observation_candidate"
        }'::jsonb,
        tenant.actor_id,
        tenant.actor_id,
        false,
        0
      ),
      (
        tenant.organization_id,
        'DRC_CAID_LOKOLE',
        'CAID LOKOLE 月度地材价格',
        'web',
        'https://caid.cd/?page_id=14336',
        array['caid.cd'],
        array['/', '/lokole/'],
        true,
        'respect',
        3,
        'CDF',
        'DRC',
        90,
        'html_table',
        '{
          "targetType":"material",
          "priority":"P0",
          "adapter":"caid_lokole_reports",
          "catalogSourceType":"government_monthly_report",
          "collectionMethod":"monthly_pdf_xlsx_discovery",
          "country":"DRC",
          "locale":"fr-CD",
          "materialCategories":["ciment","fer_a_beton","sable","gravier","briques","tole","bois"],
          "trustLevel":"A",
          "requiresHumanReview":true,
          "aiFinalDecision":false,
          "directPriceAllowed":false,
          "requiresManualConfirmation":true,
          "priceUsePolicy":"official_report_candidate"
        }'::jsonb,
        tenant.actor_id,
        tenant.actor_id,
        true,
        1
      ),
      (
        tenant.organization_id,
        'DRC_KINBRIQUE_P0',
        'KinBrique 商品价格目录',
        'web',
        'https://kinbrique.com/index.php/shop/',
        array['kinbrique.com'],
        array['/index.php/shop/', '/index.php/product/', '/index.php/product-category/'],
        true,
        'respect',
        4,
        'USD',
        'DRC / Kinshasa',
        82,
        'structured_data',
        '{
          "targetType":"material",
          "priority":"P0",
          "adapter":"woocommerce_product_catalog",
          "catalogSourceType":"material_ecommerce",
          "collectionMethod":"product_page_parse",
          "country":"DRC",
          "city":"Kinshasa",
          "locale":"fr-CD",
          "materialCategories":["ciment","fer_a_beton","agregats","briques","paves","outillage"],
          "trustLevel":"B",
          "requiresHumanReview":true,
          "aiFinalDecision":false,
          "directPriceAllowed":false,
          "requiresManualConfirmation":true,
          "priceUsePolicy":"quote_candidate_only"
        }'::jsonb,
        tenant.actor_id,
        tenant.actor_id,
        true,
        2
      );

    select jsonb_agg(to_jsonb(id::text) order by quality_score desc, source_code)
    into p0_source_ids
    from public.wpi_price_collection_sources
    where organization_id = tenant.organization_id
      and config ->> 'targetType' = 'material'
      and config ->> 'priority' = 'P0';

    update public.wpi_price_collection_tasks
    set config = jsonb_set(config, '{sourceIds}', coalesce(p0_source_ids, '[]'::jsonb), true),
        updated_by = tenant.actor_id,
        updated_at = now()
    where organization_id = tenant.organization_id
      and target_type = 'material';
  end loop;
end;
$$;

;
