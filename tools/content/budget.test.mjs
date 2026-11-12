import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Budget,tokenCost,controlledCall } from './budget.mjs';
import { runCase,demoInput } from './run-local.mjs';
import { samples } from './samples.mjs';
const rates={input:1000000,output:1000000}; // 테스트 전용, 각 토큰 1 micro-USD
const options=budget=>({budget,request:{},inputTokens:10,maxOutputTokens:10,rates});
test('reservation capacity, settlement, duplicate rejection and isolated snapshots',()=>{
  const b=new Budget(20),id=b.reserve(20);
  assert.throws(()=>b.reserve(1));b.settle(id,5);assert.equal(b.snapshot().committed,5);
  assert.throws(()=>b.settle(id,0));b.snapshot().entries[0].actual=0;assert.equal(b.snapshot().committed,5);
  assert.equal(tokenCost(1,0,{input:1,output:1}),1);
});
test('unknown usage blocks further calls until explicit reconciliation',async()=>{
  const b=new Budget(100);
  const r=await controlledCall({...options(b),provider:async()=>{throw new Error('private');}});
  assert.equal(r.status,'usage-unknown');assert.equal(b.snapshot().committed,20);
  assert.throws(()=>b.reserve(1));b.settle(1,7);assert.equal(b.reserve(20),2);
});
test('timeout aborts, late result never releases held reservation',async()=>{
  const b=new Budget(100);let aborted=false;
  const result=await controlledCall({...options(b),timeoutMs:5,provider:async(_, {signal})=>{
    signal.addEventListener('abort',()=>{aborted=true;});
    await new Promise(resolve=>setTimeout(resolve,20));
    return {output:{},usage:{inputTokens:1,outputTokens:1}};
  }});
  await new Promise(resolve=>setTimeout(resolve,25));
  assert.equal(result.status,'usage-unknown');assert.equal(aborted,true);
  assert.equal(b.snapshot().entries[0].status,'unknown');
});
test('invalid output retries once with separate settled costs',async()=>{
  const b=new Budget(100);let count=0;
  const r=await controlledCall({...options(b),provider:async()=>({output:++count,usage:{inputTokens:5,outputTokens:5}}),accept:v=>v===2});
  assert.equal(r.status,'completed');assert.equal(r.attempts.length,2);assert.equal(b.snapshot().committed,20);
});
test('overrun halts ledger and missing usage holds reservation',async()=>{
  const b=new Budget(100);
  assert.equal((await controlledCall({...options(b),provider:async()=>({usage:{inputTokens:100,outputTokens:100}})})).status,'bounds-exceeded');
  assert.throws(()=>b.reserve(1));
  const c=new Budget(100);
  assert.equal((await controlledCall({...options(c),provider:async()=>({output:'no usage'})})).status,'usage-unknown');
});
test('simultaneous calls cannot oversubscribe and local validation remains pending',async()=>{
  const b=new Budget(20);let calls=0;
  const provider=async()=>{calls++;await new Promise(r=>setTimeout(r,5));return {output:'ok',usage:{inputTokens:1,outputTokens:1}};};
  const results=await Promise.all([controlledCall({...options(b),provider}),controlledCall({...options(b),provider})]);
  assert.equal(calls,1);assert.ok(results.some(r=>r.status==='budget-blocked'));
  const input=demoInput(samples[0]);const ledger=new Budget(100);
  const row=await runCase(input,async request=>{
    const result=await controlledCall({...options(ledger),request,provider:async()=>({output:input.response,usage:{inputTokens:2,outputTokens:3}})});
    if(result.status!=='completed') throw new Error('Controlled failure');return result.output;
  });
  assert.equal(row.row.status,'pending-review');assert.equal(ledger.snapshot().committed,5);
});
