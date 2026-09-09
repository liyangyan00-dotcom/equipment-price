import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { materialDate, materialDateInRange, recentlyUpdated, materialFacets, materialInsights, materialTrend } from '../src/lib/data/materialInsights.ts';
import { mapMaterialPriceRow } from '../src/lib/data/priceInquiryMapper.ts';

const row = (patch = {}) => ({ id:'one',materialName:'Steel',specification:'12mm',unit:'piece',currency:'CDF',region:'A',source:'CAID',supplierName:'Supplier A',transportCondition:'pickup',taxIncluded:false,originalPrice:100,quoteDate:'2026-01-01',reviewStatus:'confirmed',riskLevel:'low',category:'steel', ...patch });

test('material mapping retains actual confidence instead of fabricating percentages or unknown FX', () => {
  const raw={id:'one',legacy_id:null,price_code:'TEST',material_name:'Steel',unit:'piece',price:100,currency:'CDF',review_status:'pending_review',updated_at:'2026-09-06',metadata:{}};
  for(const confidence of [null,undefined,NaN,Infinity,-1,101,'93',false]) {
    const mapped=mapMaterialPriceRow({...raw,confidence});
    assert.equal(mapped.confidence,null);assert.equal(mapped.confidenceScore,null);assert.equal(mapped.usdPrice,null);
    assert.equal(mapped.trend,'未评估');assert.match(mapped.aiSuggestion,/暂无/);
  }
  for(const confidence of [0,72.5,93,100]) assert.equal(mapMaterialPriceRow({...raw,confidence}).confidenceScore,confidence);
  assert.equal(mapMaterialPriceRow({...raw,confidence:0}).confidence,'E');
  for(const usdPrice of [null,'',false,{},-1,'bad',Infinity]) assert.equal(mapMaterialPriceRow({...raw,metadata:{usdPrice}}).usdPrice,null);
  assert.equal(mapMaterialPriceRow({...raw,metadata:{usdPrice:0}}).usdPrice,0);
  assert.equal(mapMaterialPriceRow({...raw,metadata:{usdPrice:'0.04'}}).usdPrice,0.04);
  assert.equal(mapMaterialPriceRow({...raw,currency:'USD',metadata:{usdPrice:999}}).usdPrice,100,'Original USD needs no exchange conversion');
  assert.equal(mapMaterialPriceRow({...raw,metadata:{needsInformation:true}}).reviewStatus,'need_info');
  assert.equal(mapMaterialPriceRow({...raw,review_status:'approved',metadata:{needsInformation:true}}).reviewStatus,'confirmed','Historical flag cannot override persisted terminal state');
});

test('date ranges exclude unknown dates for either boundary and validate calendar dates', () => {
  for (const quoteDate of ['', undefined, '2026-02-30', '2026-02-01T00:00:00Z']) {
    assert.equal(materialDateInRange(quoteDate, '', '2026-09-06'), false);
    assert.equal(materialDateInRange(quoteDate, '2026-01-01', ''), false);
    assert.equal(materialDateInRange(quoteDate, '', ''), true, 'Unfiltered list retains anomalies for correction');
  }
  assert.equal(materialDateInRange('2026-01-01', '2026-01-01', '2026-01-01'), true);
  assert.equal(materialDateInRange('2026-01-01', '', '2025-12-31'), false);
  assert.equal(materialDateInRange('2026-01-01', '2026-02-01', '2026-01-01'), false);
  assert.equal(materialDateInRange('2026-01-01', '', 'invalid'), false);
  assert.equal(materialDateInRange('2026-03-01', '2026-02-30', ''), false);
});

test('future quotes stay inspectable but do not contribute to historical trends', () => {
  const now = new Date('2026-09-06T12:00:00Z');
  const future = row({id:'future',quoteDate:'2026-09-07',originalPrice:99999});
  const records = [row(), row({id:'today',quoteDate:'2026-09-06',originalPrice:110}), future];
  assert.equal(materialTrend(records,records[0],now).length,2);
  assert.deepEqual(materialTrend(records,future,now),[]);
  const insights = materialInsights(records,now);
  assert.equal(insights.futureDate,1);
  assert.equal(insights.unknownDate,0);
  assert.equal(insights.sources[0].count,3,'Future record is not silently deleted');
  assert.ok(insights.issues.find(item=>item.row.id==='future').issues.includes('未来报价日期待复核'));
});

test('quote cutoff uses Beijing calendar date on both sides of midnight', () => {
  const records = [row(),row({id:'next-day',quoteDate:'2026-09-07'})];
  const before = new Date('2026-09-06T15:59:59Z');
  const after = new Date('2026-09-06T16:00:00Z');
  assert.equal(materialTrend(records,records[0],before).length,1);
  assert.equal(materialInsights(records,before).futureDate,1);
  assert.equal(materialTrend(records,records[0],after).length,2);
  assert.equal(materialInsights(records,after).futureDate,0);
});

test('validates dates rather than manufacturing a date from persistence time', () => {
  for (const value of ['', null, '2026-02-30','2026-1-01','invalid']) assert.equal(materialDate(value), '');
  assert.equal(materialDate('2024-02-29'), '2024-02-29');
  const mapped = mapMaterialPriceRow({id:'real',price_code:'real',price:12,currency:'CDF',unit:'piece',material_name:'Steel',metadata:{},updated_at:'2026-09-06T00:00:00Z',review_status:'approved',risk_level:'low'});
  assert.equal(mapped.quoteDate, '');
  assert.equal(mapped.updatedAt, '2026-09-06T00:00:00Z');
  assert.equal(mapped.usdPrice, null); // No unverified FX conversion or fabricated zero.
});

test('recent updates use a moving window and exclude future or invalid timestamps', () => {
  const now = new Date('2026-09-06T12:00:00Z');
  assert.equal(recentlyUpdated('2026-09-06T11:00:00Z',now), true);
  assert.equal(recentlyUpdated('2026-08-07T12:00:00Z',now), true);
  assert.equal(recentlyUpdated('2026-08-07T11:59:59Z',now), false);
  assert.equal(recentlyUpdated('2026-09-07T00:00:00Z',now), false);
  assert.equal(recentlyUpdated('',now), false);
});

test('facets and distributions derive only from provided records', () => {
  const records = [row(),row({id:'two',region:'B'}),row({id:'three',region:'',source:''})];
  assert.deepEqual(materialFacets(records,'region'),['A','B']);
  const result = materialInsights(records);
  assert.equal(result.sources.reduce((sum,item)=>sum+item.count,0),3);
  assert.ok(result.regions.some(item=>item.label==='未提供'));
  assert.equal(materialInsights([]).issues.length,0);
});

test('trend requires at least distinct dates for change and uses date medians', () => {
  const records = [row(),row({id:'two',quoteDate:'2026-02-01',originalPrice:120}),row({id:'three',quoteDate:'2026-02-01',originalPrice:140})];
  assert.deepEqual(materialTrend(records,records[0]),[
    {date:'2026-01-01',price:100,count:1},{date:'2026-02-01',price:130,count:2},
  ]);
  assert.equal(materialTrend([row(),row()],row()).length,1);
});

test('trend does not mix currencies, units, regions, specifications, suppliers, transport or tax', () => {
  for (const patch of [{currency:'USD'},{unit:'ton'},{region:'B'},{specification:'8mm'}, {supplierName:'Supplier B'},{transportCondition:'delivered'},{taxIncluded:true},{source:'Other'}, {reviewStatus:'pending'},{quoteDate:''},{originalPrice:NaN}]) {
    assert.equal(materialTrend([row(),row({quoteDate:'2026-02-01',...patch})],row()).length,1,JSON.stringify(patch));
  }
  for (const patch of [{taxIncluded:undefined},{transportCondition:'待补充'},{supplierName:''}]) {
    assert.deepEqual(materialTrend([row(patch)],row(patch)),[]);
  }
});

test('missing fields and real risk counts are inspectable, not canned AI scores', () => {
  const result=materialInsights([row({quoteDate:'',riskLevel:'high'}),row({reviewStatus:'pending'})]);
  assert.equal(result.unknownDate,1);
  assert.equal(result.highRisk,1);
  assert.equal(result.issues.length,2);
  assert.ok(result.issues[0].issues.includes('报价日期缺失或异常'));
});

test('material page no longer imports canned records or static analytics', () => {
  const page=readFileSync(new URL('../src/app/material-prices/page.tsx',import.meta.url),'utf8');
  assert.doesNotMatch(page,/materialPriceRecords|collectionPieData|regionCompareData|collectionSuggestions|gapWarnings|92\.6%|2026-05-18/);
  assert.match(page,/materialFacets\(records/);
  assert.match(page,/MaterialPriceInsights records=\{filteredRecords\}/);
  assert.match(page,/materialLeadSummary[^\n]+"--"/);
});
