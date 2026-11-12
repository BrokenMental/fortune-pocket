import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pillars2024 } from './pillars.mjs';
import { terms2024 } from './terms.mjs';

const at = (month,day,hour=12,minute=0,second=0) => pillars2024({year:2024,month,day,hour,minute,second});
// 독립 일진: KASI 2024 달력자료 월초 행, 조회 2026-11-03.
// https://astro.kasi.re.kr/kor/life/post/calendarData?search_year=2024
for (const [m,d,expected] of [[2,10,'甲辰'],[3,10,'癸酉'],[4,9,'癸卯'],
 [5,8,'壬申'],[6,6,'辛丑'],[7,6,'辛未'],[8,4,'庚子'],[9,3,'庚午'],
 [10,3,'庚子'],[11,1,'己巳'],[12,1,'己亥'],[12,31,'己巳']]) {
  test(`KASI independent day pillar ${m}/${d}`,()=>assert.equal(at(m,d).day,expected));
}
test('Korean midnight preserves local day and chosen same-day hour stem rule',()=>{
  assert.equal(at(2,10,0).day,'甲辰');
  assert.equal(at(2,10,23).day,'甲辰');
  assert.equal(at(2,10,23).time,'甲子');
  assert.equal(at(2,11,0).day,'乙巳');
  assert.equal(at(2,11,0).time,'丙子');
});
test('Korean lichun: explicit year/month before and after',()=>{
  assert.equal(at(2,4,17,26).year,'癸卯');
  assert.equal(at(2,4,17,26).month,'乙丑');
  assert.equal(at(2,4,17,28).year,'甲辰');
  assert.equal(at(2,4,17,28).month,'丙寅');
});
test('12 jie switch actual month at engine boundary, not one hour earlier',()=>{
  for (const name of ['小寒','立春','惊蛰','清明','立夏','芒种','小暑','立秋','白露','寒露','立冬','大雪']) {
    const ms = Date.parse(terms2024().find(t=>t.name===name).instant);
    const read = offset => {
      const d = new Date(ms+9*3600000+offset);
      return at(d.getUTCMonth()+1,d.getUTCDate(),d.getUTCHours(),d.getUTCMinutes(),d.getUTCSeconds());
    };
    assert.notEqual(read(-1000).month,read(0).month,name);
    assert.equal(read(0).month,read(1000).month,name);
    assert.equal(read(-3600000).month,read(-1000).month,name);
  }
});
test('unknown time suppresses hour and uncertain year/month',()=>{
  const unknown = (m,d)=>pillars2024({year:2024,month:m,day:d});
  assert.deepEqual(unknown(2,4),{year:null,month:null,day:at(2,4).day,time:null,uncertain:true});
  assert.equal(unknown(3,5).month,null);
  assert.equal(unknown(6,15).uncertain,false);
  assert.equal(unknown(6,15).time,null);
});
test('validation scope and invalid inputs rejected',()=>{
  for (const input of [{year:1988,month:5,day:1},{year:2024,month:2,day:30},
    {year:2024,month:1,day:1,hour:24}]) assert.throws(()=>pillars2024(input),RangeError);
});
