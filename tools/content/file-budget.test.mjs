import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,appendFileSync,readFileSync,writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { FileBudget } from './file-budget.mjs';
import { controlledCall } from './budget.mjs';
const path=()=>join(mkdtempSync(join(tmpdir(),'fortune-budget-')),'ledger.jsonl');
test('write sync failure blocks provider and further reservations',async()=>{
  const p=path(),b=new FileBudget(p,100,{sync:()=>{throw new Error('Simulated disk sync error');}});
  let calls=0;
  const result=await controlledCall({budget:b,request:{},inputTokens:10,maxOutputTokens:10,
    rates:{input:1000000,output:1000000},provider:async()=>{calls++;}});
  assert.equal(result.status,'budget-blocked');assert.equal(calls,0);
  assert.equal(b.snapshot().storageFailed,true);assert.throws(()=>b.reserve(1));b.close();
  const recovered=new FileBudget(p,100);assert.equal(recovered.snapshot().entries[0].status,'unknown');recovered.close();
});
test('persist and recover unresolved reservations, then reconcile once',()=>{
  const p=path();let b=new FileBudget(p,100);b.reserve(30);b.close();
  b=new FileBudget(p,100);
  assert.equal(b.snapshot().entries[0].status,'unknown');assert.equal(b.snapshot().committed,30);
  assert.throws(()=>b.reserve(1));b.settle(1,7);assert.throws(()=>b.settle(1,0));b.close();
  b=new FileBudget(p,100);assert.equal(b.snapshot().committed,7);b.reserve(20);b.close();
});
test('exclusive ownership and limit changes fail closed',()=>{
  const p=path(),b=new FileBudget(p,100);
  assert.throws(()=>new FileBudget(p,100));b.close();
  assert.throws(()=>new FileBudget(p,101));
  const reopened=new FileBudget(p,100);reopened.close();
});
test('truncated, malformed and invalid sequence records never auto-repair',()=>{
  for(const suffix of ['{"type":','bad\n','{"type":"halt","seq":99}\n']) {
    const p=path(),b=new FileBudget(p,100);b.close();appendFileSync(p,suffix);
    const original=readFileSync(p,'utf8');assert.throws(()=>new FileBudget(p,100));
    assert.equal(readFileSync(p,'utf8'),original);
  }
});
test('halt persists and invalid operations do not append',()=>{
  const p=path();let b=new FileBudget(p,100);const id=b.reserve(10);b.settle(id,20);
  const original=readFileSync(p,'utf8');assert.throws(()=>b.reserve(1));
  assert.equal(readFileSync(p,'utf8'),original);b.close();
  b=new FileBudget(p,100);assert.equal(b.snapshot().halted,true);b.close();
});
test('controller integrates with persisted timeout and settled success',async()=>{
  const p=path();let b=new FileBudget(p,100);
  const options={budget:b,request:{},inputTokens:10,maxOutputTokens:10,rates:{input:1000000,output:1000000}};
  const result=await controlledCall({...options,provider:async()=>({output:'ok',usage:{inputTokens:2,outputTokens:3}})});
  assert.equal(result.status,'completed');b.close();b=new FileBudget(p,100);
  assert.equal(b.snapshot().committed,5);
  const timeout=await controlledCall({...options,budget:b,timeoutMs:5,provider:async()=>new Promise(()=>{})});
  assert.equal(timeout.status,'usage-unknown');b.close();b=new FileBudget(p,100);
  assert.equal(b.snapshot().committed,25);assert.throws(()=>b.reserve(1));b.close();
});
