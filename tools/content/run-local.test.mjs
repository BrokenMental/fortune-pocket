import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runCase,demoInput } from './run-local.mjs';
import { samples } from './samples.mjs';

test('six editorial replays reach review pending with all measurements null',async()=>{
  for(const sample of samples) {
    const result=await runCase(demoInput(sample));
    assert.equal(result.row.status,'pending-review');
    assert.equal(result.row.checks.evidence,null);
    assert.equal(result.row.checks.privacy,null);
    assert.ok(Object.values(result.row.measurement).every(v=>v===null));
    assert.deepEqual(result.output,sample.content);
  }
});
test('bad request never invokes provider',async()=>{
  const input=demoInput(samples[0]);input.userData={email:'fake@example.invalid'};
  let called=false;
  const result=await runCase(input,async()=>{called=true;});
  assert.equal(result.row.status,'request-rejected');assert.equal(called,false);
});
test('provider errors and malformed responses become bounded failure records',async()=>{
  const input=demoInput(samples[0]);
  const failure=await runCase(input,async()=>{throw new Error('private error contents');});
  assert.equal(failure.row.status,'provider-failed');
  assert.ok(!JSON.stringify(failure).includes('private error contents'));
  for(const response of [null,{},'bad json']) {
    assert.equal((await runCase({...input,response})).row.status,'structure-rejected');
  }
});
test('leaked response blocked without writing response into report',async()=>{
  const input=demoInput(samples[0]);input.response=structuredClone(input.response);
  input.response.cards[0].body='fake@example.invalid';
  const result=await runCase(input);
  assert.equal(result.row.status,'privacy-blocked');assert.equal(result.output,undefined);
  assert.ok(!JSON.stringify(result).includes('fake@example.invalid'));
});
test('unknown evidence rejected, valid IDs do not bypass semantic review',async()=>{
  const input=demoInput(samples.at(-1));input.response=structuredClone(input.response);
  input.response.cards[0].evidenceIds=['J99'];
  assert.equal((await runCase(input)).row.status,'structure-rejected');
  input.response.cards[0].evidenceIds=['J1'];input.response.cards[0].body='질문을 하지 못했어요.';
  assert.equal((await runCase(input)).row.status,'pending-review');
});
