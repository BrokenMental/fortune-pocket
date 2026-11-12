import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { FileBudget } from './file-budget.mjs';
import { controlledCall } from './budget.mjs';
const metadata={callId:'call-1',requestId:'request-1',provider:'mock',model:'mock-v1',priceVersion:'test-v1',inputCap:10,outputCap:10,rates:{input:1000000,output:1000000}};
const response={callId:'call-1',provider:'mock',model:'mock-v1',responseId:'resp-1',usage:{inputTokens:2,outputTokens:3}};
const path=()=>join(mkdtempSync(join(tmpdir(),'fortune-reconcile-')),'ledger.jsonl');
test('controller records identity and rejects repeated logical execution before calling',async()=>{
  const b=new FileBudget(path(),100);let calls=0;
  const options={budget:b,request:{},callMetadata:metadata,inputTokens:10,maxOutputTokens:10,rates:metadata.rates,
    provider:async(_,identity)=>{calls++;assert.equal(identity.callId,'call-1:1');return {...response,output:'ok'};}};
  assert.equal((await controlledCall(options)).status,'completed');
  assert.equal((await controlledCall(options)).status,'budget-blocked');assert.equal(calls,1);b.close();
});
test('model and price snapshot survive restart; reconciliation is idempotent',()=>{
  const p=path();let b=new FileBudget(p,100);const m=structuredClone(metadata);b.reserveCall(m);m.rates.input=0;b.close();
  b=new FileBudget(p,100);assert.equal(b.snapshot().entries[0].metadata.rates.input,1000000);
  assert.equal(b.snapshot().entries[0].status,'unknown');b.reconcile(response);
  const raw=readFileSync(p,'utf8');assert.equal(b.reconcile(response).duplicate,true);assert.equal(readFileSync(p,'utf8'),raw);b.close();
  b=new FileBudget(p,100);assert.equal(b.reconcile(response).duplicate,true);assert.equal(b.snapshot().committed,5);b.close();
});
test('duplicate call, wrong identity and changed usage never release reservation',()=>{
  const b=new FileBudget(path(),100);b.reserveCall(metadata);
  assert.throws(()=>b.reserveCall(metadata));
  for(const patch of [{provider:'other'},{model:'other'},{callId:'missing'},{usage:{inputTokens:-1,outputTokens:0}}]) assert.throws(()=>b.reconcile({...response,...patch}));
  assert.equal(b.snapshot().committed,20);b.reconcile(response);
  assert.throws(()=>b.reconcile({...response,usage:{inputTokens:3,outputTokens:3}}));b.close();
});
test('provider response cannot be reused across calls and overrun halts',()=>{
  const b=new FileBudget(path(),100);b.reserveCall(metadata);b.reconcile(response);
  b.reserveCall({...metadata,callId:'call-2'});
  assert.throws(()=>b.reconcile({...response,callId:'call-2'}));
  b.reconcile({...response,callId:'call-2',responseId:'resp-2',usage:{inputTokens:50,outputTokens:0}});
  assert.equal(b.snapshot().halted,true);assert.throws(()=>b.reserve(1));b.close();
});
