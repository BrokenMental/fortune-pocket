import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { providerPipeline } from './provider-pipeline.mjs';
import { FileBudget } from './file-budget.mjs';
import { demoInput } from './run-local.mjs';
import { samples } from './samples.mjs';
function setup() {
  const directory=mkdtempSync(join(tmpdir(),'fortune-provider-'));
  return {directory,budget:new FileBudget(join(directory,'ledger.jsonl'),1000),input:demoInput(samples[0]),
    metadata:{requestId:'r1',callId:'c1',provider:'openai',model:'mock-v1',priceVersion:'synthetic-v1',inputCap:100,outputCap:100,rates:{input:1000000,output:1000000}}};
}
function response(output=samples[0].content) {return {id:'resp_mock',model:'mock-v1',status:'completed',usage:{input_tokens:10,output_tokens:20},output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(output)}]}]};}
function mock(raw=response(),count=10) {
  const calls=[];return {calls,transport:async r=>{calls.push(r.path);return r.path.endsWith('input_tokens')?{object:'response.input_tokens',input_tokens:count}:raw;}};
}
test('all six products pass mock wire, reserve, settle and validation',async()=>{
  for(const sample of samples) {
    const o=setup(),m=mock(response(sample.content));o.input=demoInput(sample);
    const r=await providerPipeline({...o,transport:m.transport});
    assert.equal(r.status,'pending-review');assert.equal(o.budget.snapshot().committed,30);
    assert.deepEqual(m.calls,['/v1/responses/input_tokens','/v1/responses']);o.budget.close();
  }
});
test('restart reuses count and response, never invokes transport',async()=>{
  const o=setup(),m=mock();await providerPipeline({...o,transport:m.transport});o.budget.close();
  o.budget=new FileBudget(join(o.directory,'ledger.jsonl'),1000);
  const r=await providerPipeline({...o,transport:async()=>{throw new Error('No transport expected');}});
  assert.equal(r.status,'pending-review');assert.equal(o.budget.snapshot().committed,30);o.budget.close();
});
test('refusal and incomplete responses preserve settlement and fail structure',async()=>{
  for(const kind of ['refusal','incomplete']) {
    const o=setup(),raw=response();
    if(kind==='incomplete')raw.status='incomplete';else raw.output[0].content=[{type:'refusal',refusal:'cannot comply'}];
    const r=await providerPipeline({...o,transport:mock(raw).transport});
    assert.equal(r.status,'structure-rejected');assert.equal(r.execution.status,'completed');
    assert.equal(o.budget.snapshot().committed,30);o.budget.close();
  }
});
test('token cap and budget shortage prevent generation',async()=>{
  const o=setup(),m=mock(undefined,101);
  assert.equal((await providerPipeline({...o,transport:m.transport})).status,'input-cap-exceeded');
  assert.equal(m.calls.length,1);assert.equal(o.budget.snapshot().entries.length,0);o.budget.close();
  const p=setup();p.budget.close();p.budget=new FileBudget(join(p.directory,'small.jsonl'),1);const n=mock();
  const result=await providerPipeline({...p,transport:n.transport});assert.equal(result.row.status,'provider-failed');assert.equal(n.calls.length,1);p.budget.close();
});
test('interrupted saved response resumes without new wire calls',async()=>{
  const o=setup(),m=mock();
  const first=await providerPipeline({...o,transport:m.transport,afterResponseSaved:()=>{throw new Error('interrupt');}});
  assert.equal(first.status,'provider-failed');o.budget.close();o.budget=new FileBudget(join(o.directory,'ledger.jsonl'),1000);
  assert.equal((await providerPipeline({...o,transport:async()=>{throw new Error('No calls');}})).status,'pending-review');o.budget.close();
});
