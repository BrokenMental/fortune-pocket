import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validationPillars } from './pillars.mjs';
import { convert } from './calendar.mjs';

// 선택한 '현지 자정 변경·당일 일간으로 시주 계산' 정책의 수기 기준표.
// 독립 사주 원국 자료의 검수값이 아니다. 배열은 子~亥 순서.
const table = [
 ['甲子','乙丑','丙寅','丁卯','戊辰','己巳','庚午','辛未','壬申','癸酉','甲戌','乙亥'],
 ['丙子','丁丑','戊寅','己卯','庚辰','辛巳','壬午','癸未','甲申','乙酉','丙戌','丁亥'],
 ['戊子','己丑','庚寅','辛卯','壬辰','癸巳','甲午','乙未','丙申','丁酉','戊戌','己亥'],
 ['庚子','辛丑','壬寅','癸卯','甲辰','乙巳','丙午','丁未','戊申','己酉','庚戌','辛亥'],
 ['壬子','癸丑','甲寅','乙卯','丙辰','丁巳','戊午','己未','庚申','辛酉','壬戌','癸亥'],
];
// 2000-01-01 戊午는 KASI 월력요항의 독립 기준. 이후는 일진 순환으로 유도.
for (let day=1;day<=10;day++) {
  test(`hour policy day ${day}: every minute and 12 branch boundaries`,()=>{
    const stemIndex = (day+3)%10;
    for (let minutes=0;minutes<1440;minutes++) {
      const hour=Math.floor(minutes/60), minute=minutes%60;
      const branch=Math.floor((minutes+60)/120)%12;
      const result=validationPillars({year:2000,month:1,day,hour,minute});
      assert.equal(result.time,table[stemIndex%5][branch],`${hour}:${minute}`);
    }
  });
}
test('adult 2005 independent holiday sample dates, without enabling whole year',()=>{
  // KASI 2005년 월력요항 발표: 설 연휴 2/8~10, 추석 연휴 9/17~19.
  // https://www.kasi.re.kr/kor/publication/post/newsMaterial/2095 (조회 2026-11-03)
  // 가운데 날을 각각 음력 1/1, 8/15로 대조한다.
  assert.deepEqual(convert('solar',2005,2,9).lunar,{year:2005,month:1,day:1,intercalation:false});
  assert.deepEqual(convert('solar',2005,9,18).lunar,{year:2005,month:8,day:15,intercalation:false});
  assert.throws(()=>validationPillars({year:2005,month:2,day:9,hour:12}),RangeError);
});
