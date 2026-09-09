-- Keep TALO rebar terminology deterministic while preserving the original source text.
with rebar_leads as (
  select
    id,
    replace(
      substring(
        upper(concat_ws(' ', original_name, name, original_specification, specification, original_unit))
        from 'BARRE[[:space:]]+DE[[:space:]]+([0-9]+([.,][0-9]+)?)'
      ),
      ',',
      '.'
    ) as diameter,
    position('省级均价' in coalesce(original_specification, specification, '')) > 0 as provincial_average
  from public.wpi_price_collection_leads
  where upper(concat_ws(' ', original_name, name, original_specification, specification, original_unit))
    like '%BARRE DE FER%'
)
update public.wpi_price_collection_leads as lead
set
  translated_name = '钢筋',
  translated_specification = concat(
    '钢筋 · Φ',
    rebar.diameter,
    ' mm · 按根',
    case when rebar.provincial_average then ' · 省级均价' else '' end
  ),
  translation_status = 'needs_review',
  translation_confidence = 98,
  translation_risk_level = 'medium',
  translation_review_status = 'pending_review',
  translation_provider = 'RULE_ENGINE',
  translation_model = 'material-terminology-v1',
  translation_review_note = '术语已按工程材料规则标准化；原始来源未注明单根长度和钢筋牌号，需人工复核。',
  translation_metadata = coalesce(lead.translation_metadata, '{}'::jsonb) || jsonb_build_object(
    'deterministicRule', 'talo_rebar_diameter_v1',
    'diameterMm', rebar.diameter::numeric,
    'saleUnit', 'piece',
    'lengthSpecified', false,
    'warnings', jsonb_build_array('长度及钢筋牌号未注明'),
    'requiresHumanReview', true
  ),
  updated_at = now()
from rebar_leads as rebar
where lead.id = rebar.id
  and rebar.diameter is not null;
