import { Solar } from 'lunar-typescript';

// 검증된 비교 연도만 허용한다. 출생 시각이나 일주·시주를 이동시키지 않는다.
export function terms2024() {
  const table = Solar.fromYmd(2024, 6, 1).getLunar().getJieQiTable();
  return Object.entries(table).filter(([, value]) => value.getYear() === 2024)
    .map(([name, value]) => ({ name,
      instant: new Date(value.toYmdHms().replace(' ', 'T') + '+08:00').toISOString() }));
}

export function compareBoundary(instant, boundary) {
  const a = Date.parse(instant), b = Date.parse(boundary);
  if (!Number.isFinite(a) || !Number.isFinite(b)) throw new RangeError('Invalid instant');
  return a < b ? 'before' : 'at-or-after';
}
