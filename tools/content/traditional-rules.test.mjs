import { test } from 'node:test';
import assert from 'node:assert/strict';
import { daySymbol,elementRelation,relationPrompt } from './traditional-rules.mjs';
import { calculatedMatch } from './calculated-match.mjs';
test('ten stem classifications match independently transcribed traditional table',()=>{
  const expected={甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',己:'토',庚:'금',辛:'금',壬:'수',癸:'수'};
  for(const [stem,element] of Object.entries(expected))assert.equal(daySymbol(stem+'子').element,element);
  assert.throws(()=>daySymbol('X子'));
});
test('all five generating and controlling directions, reverses and equality',()=>{
  for(const [a,b] of [['목','화'],['화','토'],['토','금'],['금','수'],['수','목']]) {
    assert.equal(elementRelation(a,b).kind,'generates');assert.equal(elementRelation(b,a).kind,'generated-by');
  }
  for(const [a,b] of [['목','토'],['토','수'],['수','화'],['화','금'],['금','목']]) {
    assert.equal(elementRelation(a,b).kind,'controls');assert.equal(elementRelation(b,a).kind,'controlled-by');
  }
  for(const e of ['목','화','토','금','수'])assert.equal(elementRelation(e,e).kind,'same');
});
test('real calculated wood-water example links source and symbolic questions',()=>{
  const base={country:'KR',calendar:'solar',year:2000};
  const result=calculatedMatch({...base,month:6,day:15,hour:9},{...base,month:2,day:4,hour:null});
  assert.equal(result.interpretation.symbols.first.element,'목');assert.equal(result.interpretation.symbols.second.element,'수');
  assert.equal(result.interpretation.relation.label,'수생목');
  assert.ok(result.content.cards[2].body.includes('수생목'));
  assert.ok(result.content.cards[1].body.includes('미확정'));
  assert.ok(result.content.cards[0].evidenceIds.includes('RULE_STEM_ELEMENT'));
  assert.ok(result.content.questions[0].includes('키워'));assert.ok(result.content.questions[1].includes('쉬어'));
});
test('controlling relation yields boundary question rather than bad-match verdict',()=>{
  const text=relationPrompt(elementRelation('금','목'));
  assert.ok(text.includes('경계'));assert.ok(!/불행|헤어|나쁜 궁합|점수/.test(text));
});
