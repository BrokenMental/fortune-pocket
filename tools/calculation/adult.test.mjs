import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Solar } from 'lunar-typescript';
import { convert } from './calendar.mjs';
import { validationPillars } from './pillars.mjs';

// KASI 2000년 월력요항 발표, 1999-02-23, 조회 2026-11-03.
// https://www.kasi.re.kr/kor/publication/post/newsMaterial/2008
// 연구용 대조. 원문 이용 제한 고지가 있어 서비스 데이터 배포 대상에서 제외.
const days = ['戊午','己丑','戊午','己丑','己未','庚寅','庚申','辛卯','壬戌','壬辰','癸亥','癸巳'];
const lunarStarts = [[2,5],[3,6],[4,5],[5,4],[6,2],[7,2],[7,31],[8,29],[9,28],[10,27],[11,26],[12,26]];
for (let i=0;i<12;i++) {
  test(`adult 2000 month ${i+1}: independent day and lunar start`,()=>{
    assert.equal(validationPillars({year:2000,month:i+1,day:1,hour:0}).day,days[i]);
    assert.equal(validationPillars({year:2000,month:i+1,day:1,hour:23}).day,days[i]);
    const [month,day] = lunarStarts[i];
    assert.deepEqual(convert('lunar',2000,i+1,1,false).solar,{year:2000,month,day});
    assert.deepEqual(convert('solar',2000,month,day).lunar,{year:2000,month:i+1,day:1,intercalation:false});
  });
}
test('adult 2000 lichun: independently published Korean minute',()=>{
  const before = validationPillars({year:2000,month:2,day:4,hour:21,minute:39});
  const after = validationPillars({year:2000,month:2,day:4,hour:21,minute:41});
  assert.equal(before.year,'己卯'); assert.equal(after.year,'庚辰');
  assert.equal(before.month,'丁丑'); assert.equal(after.month,'戊寅');
  const term = Solar.fromYmd(2000,6,1).getLunar().getJieQiTable()['立春'];
  assert.ok(Math.abs(Date.parse(term.toYmdHms().replace(' ','T')+'+08:00')-
    Date.parse('2000-02-04T21:40:00+09:00'))<60000);
});

// IANA tzdb asia, Asia/Seoul and Rule ROK. Node bundled tzdb metadata is asserted.
// https://github.com/eggert/tz/blob/main/asia (조회 2026-11-03)
test('runtime historical offsets and 1987/1988 DST transitions match tzdb rules',()=>{
  const offset = instant => new Intl.DateTimeFormat('en',{timeZone:'Asia/Seoul',timeZoneName:'longOffset'})
    .formatToParts(new Date(instant)).find(p=>p.type==='timeZoneName').value;
  for (const [instant,expected] of [
    ['1954-03-20T14:59:59Z','GMT+09:00'],['1954-03-20T15:00:00Z','GMT+08:30'],
    ['1961-08-09T15:29:59Z','GMT+08:30'],['1961-08-09T15:30:00Z','GMT+09:00'],
    ['1987-05-09T16:59:59Z','GMT+09:00'],['1987-05-09T17:00:00Z','GMT+10:00'],
    ['1987-10-10T16:59:59Z','GMT+10:00'],['1987-10-10T17:00:00Z','GMT+09:00'],
    ['1988-05-07T16:59:59Z','GMT+09:00'],['1988-05-07T17:00:00Z','GMT+10:00'],
    ['1988-10-08T16:59:59Z','GMT+10:00'],['1988-10-08T17:00:00Z','GMT+09:00'],
  ]) assert.equal(offset(instant),expected,instant);
  assert.ok(process.versions.tz);
});
test('historical and unsampled birth years fail closed',()=>{
  for (const year of [1908,1954,1961,1987,1988,1990,1999,2001,2008]) {
    assert.throws(()=>validationPillars({year,month:6,day:15,hour:12}),RangeError);
  }
});
