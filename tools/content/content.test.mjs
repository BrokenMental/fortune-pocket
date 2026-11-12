import { test } from 'node:test';
import assert from 'node:assert/strict';
import { products,validateContent,publicCards } from './content.mjs';
import { cases } from './fixtures.mjs';

function fixture(productId='MATCH_MINI') {
  return {schemaVersion:'1.0',productId,title:'가상 검증 결과',limitations:'계산하지 않은 구조 검증용 문안입니다.',
    cards:Array.from({length:products[productId].cards},(_,i)=>({id:`C${i}`,heading:'다음 행동',body:'함께 정할 시간을 물어보세요.',evidenceIds:['F1']})),
    questions:Array.from({length:products[productId].questions},()=> '어떤 시간이 편한가요?')};
}
const context={productId:'MATCH_MINI',allowedEvidenceIds:['F1']};
test('all six product structures accepted with trusted context',()=>{
  for(const productId of Object.keys(products)) assert.deepEqual(validateContent(fixture(productId),{...context,productId,selectedEntryCount:3}),[]);
});
test('reject truncated content, wrong product, html, excess fields and untrusted evidence',()=>{
  for(const mutate of [v=>v.cards.pop(),v=>v.productId='MATCH_FULL',v=>v.cards[0].body='<script>run()</script>',
    v=>v.email='private@example.invalid',v=>v.cards[0].evidenceIds=['unselected'],v=>v.cards[1].id='C0',
    v=>v.questions=[],v=>v.title='x'.repeat(61),v=>v.cards[0].evidenceIds=[]]) {
    const v=fixture(); mutate(v); assert.ok(validateContent(v,context).length);
  }
});
test('journal requires one to seven selected entries',()=>{
  for(const selectedEntryCount of [0,8,null]) assert.ok(validateContent(fixture('JOURNAL_REVIEW'),{...context,productId:'JOURNAL_REVIEW',selectedEntryCount}).length);
});
test('public projection includes only selected cards and strips evidence',()=>{
  const output=publicCards(fixture(),['C1'],context);
  assert.deepEqual(output.cards,[{id:'C1',heading:'다음 행동',body:'함께 정할 시간을 물어보세요.'}]);
  for(const ids of [[],['missing'],['C1','C1']]) assert.throws(()=>publicCards(fixture(),ids,context));
});
test('120 pending inputs, twenty per product, no fabricated measurements',()=>{
  assert.equal(cases.length,120); assert.equal(new Set(cases.map(c=>c.id)).size,120);
  for(const productId of Object.keys(products)) assert.equal(cases.filter(c=>c.productId===productId).length,20);
  assert.ok(cases.every(c=>c.costKrw===null && c.latencyMs===null && c.expectedStatus==='pending-generation'));
  assert.ok(cases.filter(c=>c.productId==='JOURNAL_REVIEW').every(c=>c.entries.length>=1&&c.entries.length<=7));
});
