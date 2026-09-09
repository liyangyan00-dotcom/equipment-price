import test from 'node:test';
import assert from 'node:assert/strict';
import { materialListMetadataKeys, materialListProjection, restoreMaterialListMetadata } from '../src/lib/data/materialListProjection.ts';
import { mapMaterialPriceRow } from '../src/lib/data/priceInquiryMapper.ts';
import { materialTrend } from '../src/lib/data/materialInsights.ts';

test('list projection excludes whole metadata while preserving JSON number/boolean types', () => {
  assert.ok(!materialListProjection.includes('*'));
  assert.ok(!materialListProjection.split(',').includes('metadata'));
  assert.ok(materialListProjection.includes('list_taxIncluded:metadata->taxIncluded'));
  assert.ok(!materialListProjection.includes('->>'));
  const raw = { id:'test', list_taxIncluded:false, list_usdPrice:0, list_collectionLeadCode:'LS-TEST' };
  const result = restoreMaterialListMetadata(raw);
  assert.equal(result.metadata.taxIncluded,false); assert.equal(result.metadata.usdPrice,0);
  assert.equal(result.metadata.collectionLeadCode,'LS-TEST'); assert.equal(result.list_usdPrice,undefined);
  assert.equal(raw.list_usdPrice,0,'Input is not mutated');
});

test('mapped list fields, provenance link and trend stay equivalent without raw evidence blobs', () => {
  const metadata = { quoteDate:'2026-01-01', taxIncluded:false, usdPrice:0, supplierName:'Synthetic supplier', transportCondition:'ex works', collectionLeadCode:'LS-TEST', rawPdfText:'x'.repeat(1000000), fileBase64:'y'.repeat(1000000) };
  const row={ id:'uuid-test', legacy_id:null, price_code:'TEST', material_name:'Steel', specification:'12mm', category:'steel', unit:'piece', price:100, currency:'CDF', region:'test', source_url:null, source_type:'sample', valid_until:'2027-01-01', confidence:90, risk_level:'low', review_status:'approved', created_at:'2026-01-01', updated_at:'2026-01-01', metadata };
  const projected={...row}; delete projected.metadata;
  for(const key of materialListMetadataKeys) projected[`list_${key}`]=metadata[key]??null;
  const old=mapMaterialPriceRow(row), current=mapMaterialPriceRow(restoreMaterialListMetadata(projected));
  for(const key of ['id','databaseId','materialCode','materialName','specification','category','unit','originalPrice','currency','usdPrice','region','supplierName','quoteDate','reviewStatus','confidence','riskLevel','collectionLeadCode','taxIncluded','transportCondition']) assert.equal(current[key],old[key],key);
  assert.deepEqual(materialTrend([current],current,new Date('2026-09-06')),materialTrend([old],old,new Date('2026-09-06')));
  assert.equal(current.rawPdfText,undefined); assert.equal(current.fileBase64,undefined);
  assert.ok(JSON.stringify(restoreMaterialListMetadata(projected)).length<2000,'Synthetic multi-MB evidence must not enter list response');
});
