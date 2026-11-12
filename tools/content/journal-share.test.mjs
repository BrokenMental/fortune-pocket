import { test } from 'node:test';
import assert from 'node:assert/strict';
import { journalShare,journalPublicCopy } from './journal-share.mjs';
import { samples } from './samples.mjs';
import { publicCards } from './content.mjs';

test('owner journal cannot be shared by ordinary projection',()=>{
  const s=samples.find(s=>s.content.productId==='JOURNAL_REVIEW');
  assert.throws(()=>publicCards(s.content,['C1'],s.context));
  assert.ok(s.content.cards[0].body.includes('월요일'));
});
test('separate copy requires confirmation and contains only generic selected cards',()=>{
  assert.throws(()=>journalShare(['C1']));
  for(const ids of [[],['missing'],['C1','C1']]) assert.throws(()=>journalShare(ids,{confirmed:true}));
  const copy=journalShare(['C2'],{confirmed:true});
  assert.equal(copy.cards.length,1);
  assert.ok(!/J1|회의|퇴근|친구|월요일/.test(JSON.stringify(copy)));
  copy.cards[0].body='changed';assert.notEqual(journalPublicCopy.cards[1].body,'changed');
});
test('gift generated output omits nickname, display metadata retains it',()=>{
  const s=samples.find(s=>s.content.productId==='GIFT_BOOK');
  assert.equal(s.display.recipientNickname,'솔');
  assert.ok(!JSON.stringify(s.content).includes('솔'));
});
