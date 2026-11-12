import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileBudget } from './file-budget.mjs';
import { recoverableContent } from './recoverable-content.mjs';
import { demoInput } from './run-local.mjs';
import { samples } from './samples.mjs';
function setup() {
  const directory=mkdtempSync(join(tmpdir(),'fortune-integrated-'));
  return {directory,budget:new FileBudget(join(directory,'ledger.jsonl'),100),input:demoInput(samples[0]),
    metadata:{callId:'c1',requestId:'r1',provider:'mock',model:'mock-v1',priceVersion:'test',inputCap:10,outputCap:10,rates:{input:1000000,output:1000000}}};
}
const envelope=output=>({provider:'mock',model:'mock-v1',responseId:'resp1',usage:{inputTokens:2,outputTokens:3},output});
test('completed execution enters review pending and revalidates saved response without sending',async()=>{
  const o=setup();let calls=0;const provider=async()=>{calls++;return envelope(o.input.response);};
  const first=await recoverableContent({...o,provider});assert.equal(first.row.status,'pending-review');
  assert.equal(first.row.checks.evidence,null);o.budget.close();o.budget=new FileBudget(join(o.directory,'ledger.jsonl'),100);
  assert.equal((await recoverableContent({...o,provider})).row.status,'pending-review');assert.equal(calls,1);o.budget.close();
});
test('settled usage remains charged when output fails structure or privacy',async()=>{
  for(const kind of ['structure','privacy']) {
    const o=setup(),output=structuredClone(o.input.response);
    if(kind==='structure')output.cards=[];else output.cards[0].body='fake@example.invalid';
    const result=await recoverableContent({...o,provider:async()=>envelope(output)});
    assert.equal(result.execution.status,'completed');
    assert.equal(result.row.status,kind==='structure'?'structure-rejected':'privacy-blocked');
    assert.equal(result.output,undefined);assert.equal(o.budget.snapshot().committed,5);o.budget.close();
  }
});
test('timeout and late response preserve unresolved state and never resend',async()=>{
  const o=setup();let calls=0,aborted=false;
  const provider=async(_, {signal})=>{
    calls++;signal.addEventListener('abort',()=>{aborted=true;});
    await new Promise(r=>setTimeout(r,20));return envelope(o.input.response);
  };
  const result=await recoverableContent({...o,provider,timeoutMs:5});
  assert.equal(result.execution.status,'usage-unknown');assert.equal(result.output,undefined);
  await new Promise(r=>setTimeout(r,25));assert.equal(aborted,true);
  assert.equal(JSON.parse(readFileSync(join(o.directory,'r1.json'))).status,'started');
  o.budget.close();o.budget=new FileBudget(join(o.directory,'ledger.jsonl'),100);
  const resumed=await recoverableContent({...o,provider});assert.equal(resumed.execution.status,'usage-unknown');
  assert.equal(calls,1);assert.equal(o.budget.snapshot().committed,20);o.budget.close();
});
test('invalid input does not reserve budget or invoke provider',async()=>{
  const o=setup();o.input.userData={email:'fake@example.invalid'};let called=false;
  const result=await recoverableContent({...o,provider:async()=>{called=true;}});
  assert.equal(result.row.status,'request-rejected');assert.equal(called,false);assert.equal(o.budget.snapshot().committed,0);o.budget.close();
});
