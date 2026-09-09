import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBusinessObjectPath } from '../src/lib/storage/businessFiles.ts';
import { isProjectBoqObjectPath } from '../src/lib/projectPricing/boqStorage.ts';
const org='11111111-1111-4111-8111-111111111111',project='22222222-2222-4222-8222-222222222222';
test('actual BOQ storage helper output is accepted by parsing scope check',()=>{const p=buildBusinessObjectPath(org,`project-pricing/${project}`,'boq.csv');assert.ok(isProjectBoqObjectPath(p,org,project));assert.match(p,/^[\x20-\x7e]+$/);});
test('documented nested BOQ paths remain valid',()=>assert.ok(isProjectBoqObjectPath(`${org}/project-pricing/${project}/source.xlsx`,org,project)));
test('reject foreign organization, foreign project and traversal',()=>{for(const p of [`other/project-pricing-${project}/boq.csv`,`${org}/project-pricing-other/boq.csv`,`${org}/project-pricing-${project}-other/boq.csv`,`${org}/project-pricing-${project}/../other/boq.csv`,`${org}/project-pricing-${project}/..`,`${org}/project-pricing-${project}/`]) assert.equal(isProjectBoqObjectPath(p,org,project),false,p)});
