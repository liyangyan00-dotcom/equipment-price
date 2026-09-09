import test from 'node:test';
import assert from 'node:assert/strict';
import { readMaterialReviewExport } from '../src/lib/data/materialReviewExport.ts';

function transport(total = 205, transform = value => value) {
  const calls = []; let active = 0;
  const fetcher = async (request, options) => {
    assert.equal(active++, 0, 'Requests must be serial');
    const url = new URL(request, 'http://test'); calls.push(url);
    assert.equal(options.cache, 'no-store'); assert.ok(options.signal);
    const page = Number(url.searchParams.get('page'));
    await new Promise(resolve => setTimeout(resolve, 1)); active--;
    return Response.json(transform({ data: Array.from({ length: Math.max(0, Math.min(100, total - (page - 1) * 100)) }, (_, i) => ({ id: String((page - 1) * 100 + i) })), pagination: { page, pageSize: 100, total, pageCount: Math.max(1, Math.ceil(total / 100)) } }));
  };
  return { calls, fetcher };
}

test('exports all pages serially while retaining applied filters and linked scope', async () => {
  const t = transport(); const progress = [];
  const result = await readMaterialReviewExport('/api/material-prices/review-queue?page=3&queue=highRisk&materialIds=A%2CB&keyword=steel', new AbortController().signal, t.fetcher, (n, total) => progress.push([n, total]));
  assert.equal(result.length, 205); assert.equal(result.at(-1).id, '204');
  assert.deepEqual(progress, [[100,205],[200,205],[205,205]]);
  for (const url of t.calls) { assert.equal(url.searchParams.get('queue'),'highRisk'); assert.equal(url.searchParams.get('materialIds'),'A,B'); assert.equal(url.searchParams.get('keyword'),'steel'); assert.equal(url.searchParams.get('pageSize'),'100'); }
});

test('duplicate, missing, changing and oversized results never resolve a partial export', async () => {
  for (const transform of [
    p => ({ ...p, data: p.data.slice(1) }),
    p => ({ ...p, data: p.data.map(() => ({id:'duplicate'})) }),
    p => p.pagination.page === 2 ? ({...p, pagination:{...p.pagination,total:204}}) : p,
    p => ({...p,pagination:{...p.pagination,total:10001,pageCount:101}}),
    p => ({...p,pagination:{...p.pagination,page:7}}),
  ]) { await assert.rejects(readMaterialReviewExport('/api/material-prices/review-queue', new AbortController().signal, transport(205, transform).fetcher)); }
});

test('failed pages stop immediately without retries', async () => {
  for (const status of [401,403,500]) {
    let calls=0;
    await assert.rejects(readMaterialReviewExport('/api/material-prices/review-queue',new AbortController().signal,async()=>{calls++;return new Response('',{status});}));
    assert.equal(calls,1);
  }
});

test('cancellation stops subsequent pages; empty export is not fabricated', async () => {
  const controller = new AbortController(); const t = transport();
  await assert.rejects(readMaterialReviewExport('/api/material-prices/review-queue',controller.signal,t.fetcher,()=>controller.abort()));
  assert.equal(t.calls.length,1);
  assert.deepEqual(await readMaterialReviewExport('/api/material-prices/review-queue',new AbortController().signal,transport(0).fetcher),[]);
});
