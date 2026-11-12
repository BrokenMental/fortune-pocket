import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Solar } from 'lunar-typescript';
import { convert } from './calendar.mjs';

// KASI 달력자료 V1.0a: 공식 발표 월력요항과는 구분한다.
// https://astro.kasi.re.kr/kor/life/post/calendarData?search_year=2023
// https://astro.kasi.re.kr/kor/life/post/calendarData?search_year=2024
// 조회 2026-11-03. 각 행: 음력 연, 월, 윤달, 양력 월, 일.
const references = [
  [2023,1,false,1,22], [2023,2,false,2,20], [2023,2,true,3,22],
  [2023,3,false,4,20], [2023,4,false,5,20], [2023,5,false,6,18],
  [2023,6,false,7,18], [2023,7,false,8,16], [2023,8,false,9,15],
  [2023,9,false,10,15], [2023,10,false,11,13], [2023,11,false,12,13],
  [2024,1,false,2,10], [2024,2,false,3,10], [2024,3,false,4,9],
  [2024,4,false,5,8], [2024,5,false,6,6], [2024,6,false,7,6],
  [2024,7,false,8,4], [2024,8,false,9,3], [2024,9,false,10,3],
  [2024,10,false,11,1], [2024,11,false,12,1], [2024,12,false,12,31],
];
for (const [year, month, leap, sm, sd] of references) {
  test(`KASI ${year} lunar ${month} leap=${leap}: both directions`, () => {
    const result = convert('solar', year, sm, sd);
    assert.deepEqual(result.lunar, { year, month, day: 1, intercalation: leap });
    assert.deepEqual(convert('lunar', year, month, 1, leap).solar, result.solar);
  });
}
test('leap month end and next month: KASI small month has 29 days', () => {
  assert.equal(convert('lunar', 2023, 2, 29, true).solar.day, 19);
  assert.throws(() => convert('lunar', 2023, 2, 30, true), RangeError);
});
test('reject impossible dates, absent leap month and invalid fields', () => {
  for (const args of [ ['solar',1900,2,29], ['solar',2024,4,31],
    ['lunar',2024,2,1,true], ['solar',2051,1,1], ['solar',2024,1,1.5],
    ['other',2024,1,1], ['lunar',2023,2,1,null] ]) {
    assert.throws(() => convert(...args), RangeError);
  }
  assert.doesNotThrow(() => convert('solar',2000,2,29));
});
test('failed conversion cannot return a previous successful result', () => {
  convert('solar',2024,2,10);
  assert.throws(() => convert('solar',2024,2,30), RangeError);
});
test('candidate midnight day-pillar policy: internal consistency only', () => {
  const pillar = (day,hour,minute) => {
    const value = Solar.fromYmdHms(2024,6,day,hour,minute,0).getLunar().getEightChar();
    value.setSect(2);
    return value.getDay();
  };
  assert.equal(pillar(15,22,59),pillar(15,23,0));
  assert.equal(pillar(15,23,0),pillar(15,23,59));
  assert.notEqual(pillar(15,23,59),pillar(16,0,0));
});
