import { Solar } from 'lunar-typescript';
import { convert } from './calendar.mjs';

const stems = '甲乙丙丁戊己庚辛壬癸';
const branches = '子丑寅卯辰巳午未申酉戌亥';

// 검증 전용: 2000·2024 한국 민간시, 자정 일주 전환. 제품 지원 범위 아님.
export function validationPillars({ year, month, day, hour = null, minute = 0, second = 0 }) {
  if (![2000,2024].includes(year)) throw new RangeError('Only independently sampled years 2000 and 2024 supported');
  convert('solar',year,month,day);
  if (hour === null) {
    const start = validationPillars({year,month,day,hour:0});
    const end = validationPillars({year,month,day,hour:23,minute:59,second:59});
    return { year: start.year === end.year ? start.year : null,
      month: start.month === end.month ? start.month : null,
      day: start.day, time: null,
      uncertain: start.year !== end.year || start.month !== end.month };
  }
  if (![hour,minute,second].every(Number.isInteger) || hour < 0 || hour > 23 ||
      minute < 0 || minute > 59 || second < 0 || second > 59) throw new RangeError('Invalid time');
  const local = Solar.fromYmdHms(year,month,day,hour,minute,second).getLunar().getEightChar();
  local.setSect(2);
  // UTC+9 현지 순간을 UTC+8 엔진에 전달하는 것은 연주·월주에만 적용.
  const instant = new Date(Date.UTC(year,month-1,day,hour-1,minute,second));
  const shifted = Solar.fromYmdHms(instant.getUTCFullYear(),instant.getUTCMonth()+1,
    instant.getUTCDate(),instant.getUTCHours(),minute,second).getLunar().getEightChar();
  const dayPillar = local.getDay();
  const branch = Math.floor((hour+1)/2)%12;
  const stem = (stems.indexOf(dayPillar[0])*2+branch)%10;
  return { year: shifted.getYear(), month: shifted.getMonth(), day: dayPillar,
    time: stems[stem]+branches[branch], uncertain: false };
}

export function pillars2024(input) {
  if (input.year !== 2024) throw new RangeError('Only validation year 2024 supported');
  return validationPillars(input);
}
