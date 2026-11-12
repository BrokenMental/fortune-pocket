import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,readFileSync,writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileBudget } from './file-budget.mjs';
import { requestHash,recoverableCall } from './recoverable-call.mjs';
const metadata={requestId:'request-1',callId:'call-1',provider:'mock',model:'mock-v1',priceVersion:'test-v1',inputCap:10,outputCap:10,rates:{input:1000000,output:1000000}};
const response={provider:'mock',model:'mock-v1',responseId:'response-1',usage:{inputTokens:2,outputTokens:3},output:{text:'합성 응답'}};
function setup(){const directory=mkdtempSync(join(tmpdir(),'fortune-execution-'));return {directory,budget:new FileBudget(join(directory,'ledger.jsonl'),100),metadata,request:{b:2,a:1}};}
test('canonical hashes stable for object order and reject unsupported data',()=>{
  assert.equal(requestHash({a:1,b:2}),requestHash({b:2,a:1}));
  assert.notEqual(requestHash([1,2]),requestHash([2,1]));assert.throws(()=>requestHash({x:undefined}));
});
test('completed response reused after reopening without provider call',async()=>{
  const o=setup();let calls=0;const provider=async()=>{calls++;return response;};
  assert.equal((await recoverableCall({...o,provider})).status,'completed');o.budget.close();
  o.budget=new FileBudget(join(o.directory,'ledger.jsonl'),100);
  assert.deepEqual((await recoverableCall({...o,provider})).output,response.output);
  assert.equal(calls,1);assert.equal(o.budget.snapshot().committed,5);o.budget.close();
});
test('saved response reconciles after simulated interruption',async()=>{
  const o=setup();let calls=0;const provider=async()=>{calls++;return response;};
  await assert.rejects(()=>recoverableCall({...o,provider,afterResponseSaved:()=>{throw new Error('interrupt');}}));o.budget.close();
  o.budget=new FileBudget(join(o.directory,'ledger.jsonl'),100);
  assert.equal(o.budget.snapshot().entries[0].status,'unknown');
  assert.equal((await recoverableCall({...o,provider})).status,'completed');assert.equal(calls,1);o.budget.close();
});
test('failed provider remains unresolved and changed request never resends',async()=>{
  const o=setup();let calls=0;const provider=async()=>{calls++;throw new Error('private');};
  assert.equal((await recoverableCall({...o,provider})).status,'usage-unknown');
  assert.equal((await recoverableCall({...o,provider})).status,'usage-unknown');
  await assert.rejects(()=>recoverableCall({...o,provider,request:{a:2}}));assert.equal(calls,1);o.budget.close();
});
test('tampered stored response is rejected without provider call',async()=>{
  const o=setup();await recoverableCall({...o,provider:async()=>response});
  const p=join(o.directory,'request-1.json'),state=JSON.parse(readFileSync(p));state.response.output.text='changed';writeFileSync(p,JSON.stringify(state));
  await assert.rejects(()=>recoverableCall({...o,provider:async()=>{throw new Error('must not call');}}));o.budget.close();
});
