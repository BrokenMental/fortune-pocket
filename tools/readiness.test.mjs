import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessReadiness,localReadiness } from './readiness.mjs';
import { cases } from './content/fixtures.mjs';
import { evaluationRow } from './content/evaluation.mjs';
const input={config:{enabled:false,model:'mock',budgetMicroUsd:5000000,budgetAuthorizationReference:'test-only',inputTokenCap:4000,outputTokenCap:3000},cases,evaluations:cases.map(evaluationRow),keyPresent:true};
test('missing actual implementations cannot be bypassed by config',()=>{
  const result=assessReadiness(input);assert.equal(result.executionAllowed,false);
  assert.deepEqual(result.blocked,['provider-adapter-implemented','provider-token-counter-implemented']);
});
test('corrupted input index and duplicate evaluation rows block readiness',()=>{
  const r=assessReadiness({...input,cases:cases.slice(1),evaluations:[input.evaluations[0],input.evaluations[0]]});
  assert.ok(r.blocked.includes('synthetic-inputs'));assert.ok(r.blocked.includes('evaluation-index'));
});
test('no credential or configuration values exposed in report',()=>{
  const result=assessReadiness({...input,config:{...input.config,model:'PRIVATE-SENTINEL',budgetAuthorizationReference:'SECRET-SENTINEL'}});
  assert.ok(!JSON.stringify(result).includes('SENTINEL'));
});
test('repository readiness is read-only and execution remains disabled',()=>{
  const r=localReadiness();assert.equal(r.networkUsed,false);assert.equal(r.executionAllowed,false);
  assert.ok(r.checks.some(c=>c.id==='synthetic-inputs'&&c.status==='ready'));
});
