import { test } from 'node:test';
import assert from 'node:assert/strict';
import { terms2024, compareBoundary } from './terms.mjs';

// KASI 2024 달력자료 V1.0a, 조회 2026-11-03.
// https://astro.kasi.re.kr/kor/life/post/calendarData?search_year=2024
// 분 표기와의 차이를 60초 미만으로 비교한다. 반올림 방식/초 정확도 증명 아님.
const references = [
 ['小寒','01-06T05:49'],['大寒','01-20T23:07'],['立春','02-04T17:27'],
 ['雨水','02-19T13:13'],['惊蛰','03-05T11:23'],['春分','03-20T12:06'],
 ['清明','04-04T16:02'],['谷雨','04-19T23:00'],['立夏','05-05T09:10'],
 ['小满','05-20T22:00'],['芒种','06-05T13:10'],['夏至','06-21T05:51'],
 ['小暑','07-06T23:20'],['大暑','07-22T16:44'],['立秋','08-07T09:09'],
 ['处暑','08-22T23:55'],['白露','09-07T12:11'],['秋分','09-22T21:44'],
 ['寒露','10-08T04:00'],['霜降','10-23T07:15'],['立冬','11-07T07:20'],
 ['小雪','11-22T04:56'],['大雪','12-07T00:17'],['DONG_ZHI','12-21T18:21'],
];
const terms = terms2024();
for (const [name, expected] of references) {
  test(`KASI 2024 term ${name}: within 60 seconds`, () => {
    const term = terms.find(t => t.name === name);
    assert.ok(term);
    assert.ok(Math.abs(Date.parse(term.instant)-Date.parse(`2024-${expected}:00+09:00`)) < 60000);
  });
}
test('24 terms, December date rollover and host timezone independence', () => {
  assert.equal(terms.length,24);
  assert.equal(terms.find(t => t.name === '大雪').instant,'2024-12-06T15:17:03.000Z');
  const original = process.env.TZ;
  try {
    process.env.TZ = 'UTC'; const utc = terms2024();
    process.env.TZ = 'Asia/Seoul'; assert.deepEqual(terms2024(),utc);
  } finally {
    if (original === undefined) delete process.env.TZ; else process.env.TZ = original;
  }
});
test('12 jie boundaries: before, exact and after use explicit instants', () => {
  for (const name of ['小寒','立春','惊蛰','清明','立夏','芒种','小暑','立秋','白露','寒露','立冬','大雪']) {
    const boundary = terms.find(t => t.name === name).instant;
    const ms = Date.parse(boundary);
    assert.equal(compareBoundary(new Date(ms-1000).toISOString(),boundary),'before');
    assert.equal(compareBoundary(boundary,boundary),'at-or-after');
    assert.equal(compareBoundary(new Date(ms+1000).toISOString(),boundary),'at-or-after');
  }
});
