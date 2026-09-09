-- TALO uses "BARRE DE 10" as a diameter designation. It does not state a 10 m length.
update public.wpi_price_collection_leads
set
  translated_specification = '钢筋 · Φ10 mm · 按根 · 省级均价',
  translation_review_note = '术语纠正：PIECE BARRE DE 10 表示直径 10 mm、按根计价；原始来源未注明单根长度。',
  translation_metadata = coalesce(translation_metadata, '{}'::jsonb) || jsonb_build_object(
    'terminologyCorrection', 'talo_rebar_10_is_diameter_mm',
    'diameterMm', 10,
    'saleUnit', 'piece',
    'lengthSpecified', false,
    'requiresHumanReview', true
  ),
  updated_at = now()
where upper(coalesce(nullif(original_name, ''), name)) = 'BARRE DE FER'
  and upper(coalesce(nullif(original_specification, ''), specification, original_unit, '')) like '%PIECE BARRE DE 10%';
