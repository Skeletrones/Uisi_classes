/**
 * Нерабочие праздничные дни РФ. Нужны только для автоматического определения
 * предпраздничных (сокращённых) дней — сами пары берутся из XLSX.
 *
 * Фиксированные праздники + перенос выходного на понедельник, если праздник
 * пришёлся на выходные. Этого достаточно для расписаний ближайших лет; список
 * легко дополнить при появлении официальных переносов.
 */

const FIXED: Array<[number, number]> = [
  [1, 1],
  [1, 2],
  [1, 3],
  [1, 4],
  [1, 5],
  [1, 6],
  [1, 7],
  [1, 8],
  [2, 23],
  [3, 8],
  [5, 1],
  [5, 9],
  [6, 12],
  [11, 4],
];

const HOLIDAY_NAMES: Record<string, string> = {
  '01-01': 'Новый год',
  '01-02': 'Новогодние каникулы',
  '01-03': 'Новогодние каникулы',
  '01-04': 'Новогодние каникулы',
  '01-05': 'Новогодние каникулы',
  '01-06': 'Новогодние каникулы',
  '01-07': 'Рождество Христово',
  '01-08': 'Новогодние каникулы',
  '02-23': 'День защитника Отечества',
  '03-08': 'Международный женский день',
  '05-01': 'Праздник весны и труда',
  '05-09': 'День Победы',
  '06-12': 'День России',
  '11-04': 'День народного единства',
};

function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

function weekday(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
}

function buildHolidays(): Set<string> {
  const set = new Set<string>();
  for (let year = 2024; year <= 2029; year++) {
    for (const [month, day] of FIXED) {
      const date = iso(year, month, day);
      set.add(date);
      const wd = weekday(date);
      // Перенос выходного: суббота → понедельник, воскресенье → понедельник.
      if (wd === 6) set.add(addDays(date, 2));
      if (wd === 0) set.add(addDays(date, 1));
    }
  }
  return set;
}

const HOLIDAYS = buildHolidays();

export function isHoliday(dateISO: string): boolean {
  return HOLIDAYS.has(dateISO);
}

export function holidayName(dateISO: string): string | undefined {
  return HOLIDAY_NAMES[dateISO.slice(5)];
}

function isWeekend(dateISO: string): boolean {
  const wd = weekday(dateISO);
  return wd === 0 || wd === 6;
}

/** Последний рабочий день перед праздником (в том числе пятница перед понедельником). */
export function isPreHoliday(dateISO: string): boolean {
  if (isWeekend(dateISO) || isHoliday(dateISO)) return false;
  let next = addDays(dateISO, 1);
  for (let i = 0; i < 7 && isWeekend(next); i++) {
    next = addDays(next, 1);
  }
  return isHoliday(next);
}

export { addDays, weekday };
