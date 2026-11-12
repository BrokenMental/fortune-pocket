import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculatedMatch,calculateProfile } from './calculated-match.mjs';
import { convert } from '../calculation/calendar.mjs';
const a={country:'KR',calendar:'solar',year:2000,month:6,day:15,hour:9,minute:30};
const b={country:'KR',calendar:'solar',year:2000,month:2,day:4,hour:null};
test('real calendar calculation feeds evidence and product cards',()=>{
  const result=calculatedMatch(a,b);
  assert.equal(result.request.mode,'calculated');assert.equal(result.content.cards.length,3);
  assert.ok(result.content.cards[0].body.includes(result.calculations.first.pillars.day));
  assert.equal(result.calculations.second.pillars.month,null);assert.equal(result.calculations.second.pillars.time,null);
  assert.ok(result.content.cards[1].body.includes('미확정'));assert.equal(result.status,'pending-review');
});
test('equivalent lunar date yields identical calculated facts',()=>{
  const lunar=convert('solar',2000,6,15).lunar;
  const alternative={...a,calendar:'lunar',year:lunar.year,month:lunar.month,day:lunar.day,leap:lunar.intercalation};
  assert.deepEqual(calculateProfile(a),calculateProfile(alternative));
});
test('changing date changes facts and content, original snapshot preserved',()=>{
  const input=structuredClone(a),result=calculatedMatch(input,b);
  input.day=16;const changed=calculatedMatch(input,b);
  assert.notEqual(changed.calculations.first.pillars.day,result.calculations.first.pillars.day);
  assert.notEqual(changed.content.cards[0].body,result.content.cards[0].body);
  assert.equal(result.inputSnapshot.first.day,15);
});
test('unknown time never becomes an invented hour and unsupported inputs rejected',()=>{
  assert.equal(calculateProfile({...a,hour:null}).pillars.time,null);
  for(const input of [{...a,year:1990},{...a,year:2024},{...a,country:'US'},{...a,hour:24},
    {...a,calendar:'lunar'}, {...a,pillars:{day:'invented'}}]) assert.throws(()=>calculateProfile(input));
});
test('same-day branch is calculated rather than copied from a fixed sample',()=>{
  const result=calculatedMatch(a,a);assert.ok(result.content.cards[0].heading.includes('같은'));
  assert.equal(result.calculations.first.pillars.day,result.calculations.second.pillars.day);
});
