import KoreanLunarCalendar from 'korean-lunar-calendar';

// 검증용 날짜 변환 어댑터. 사주 원국이나 제품 지원 범위를 제공하지 않는다.
export function convert(calendar, year, month, day, leap = false) {
  if (![year, month, day].every(Number.isInteger)) throw new RangeError('Invalid date');
  if (!['solar', 'lunar'].includes(calendar)) throw new RangeError('Invalid calendar');
  if (typeof leap !== 'boolean') throw new RangeError('Leap month must be explicit');
  const engine = new KoreanLunarCalendar();
  const valid = calendar === 'solar'
    ? engine.setSolarDate(year, month, day)
    : engine.setLunarDate(year, month, day, leap);
  if (!valid) throw new RangeError('Invalid or unsupported date');
  return { solar: engine.getSolarCalendar(), lunar: engine.getLunarCalendar() };
}
