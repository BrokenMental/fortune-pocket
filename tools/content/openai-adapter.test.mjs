import { test } from 'node:test';
import assert from 'node:assert/strict';
import { responsePayload,decodeResponse,createAdapter } from './openai-adapter.mjs';
import { buildRequest } from './request.mjs';
import { demoInput } from './run-local.mjs';
import { samples } from './samples.mjs';
const s=samples[0],input=demoInput(s),request=buildRequest(input.trusted,input.userData);
const payload=()=>responsePayload(request,{model:'mock-snapshot',maxOutputTokens:3000});
const raw=()=>({id:'resp_mock',model:'mock-snapshot',status:'completed',usage:{input_tokens:100,output_tokens:200},
  output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify(s.content)}]}]});
test('payload separates instructions and user data, schema matches all products',()=>{
  for(const sample of samples) {
    const i=demoInput(sample),r=buildRequest(i.trusted,i.userData),p=responsePayload(r,{model:'mock',maxOutputTokens:3000});
    assert.equal(p.store,false);assert.equal(p.text.format.strict,true);
    assert.equal(p.text.format.schema.properties.cards.maxItems,sample.content.cards.length);
    assert.ok(!p.instructions.includes(JSON.stringify(r.data)));
  }
});
test('mock count and generation share payload hash and preserve reported usage',async()=>{
  const paths=[],a=createAdapter({transport:async v=>{paths.push(v.path);return v.path.endsWith('input_tokens')?{object:'response.input_tokens',input_tokens:100}:raw();}});
  const p=payload(),count=await a.count(p),r=await a.generate(p,count,{inputCap:4000});
  assert.deepEqual(paths,['/v1/responses/input_tokens','/v1/responses']);
  assert.deepEqual(r.output,s.content);assert.equal(r.usage.outputTokens,200);
});
test('changed or oversized input never reaches generation transport',async()=>{
  let generates=0;const a=createAdapter({transport:async v=>{if(v.path.endsWith('input_tokens'))return {object:'response.input_tokens',input_tokens:100};generates++;return raw();}});
  const p=payload(),count=await a.count(p);p.instructions+=' changed';
  await assert.rejects(()=>a.generate(p,count,{inputCap:4000}));
  await assert.rejects(()=>a.generate(payload(),count,{inputCap:99}));assert.equal(generates,0);
});
test('refusal, incomplete and invalid json retain usage but no content',()=>{
  for(const change of [r=>r.status='incomplete',r=>r.output[0].content=[{type:'refusal',refusal:'no'}],r=>r.output[0].content[0].text='broken']) {
    const r=raw();change(r);const decoded=decodeResponse(r);assert.equal(decoded.output,null);assert.equal(decoded.usage.outputTokens,200);
  }
  const r=raw();delete r.usage;assert.throws(()=>decodeResponse(r));
});
