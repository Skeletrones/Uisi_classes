export const DAY_NAMES = [
  'Воскресенье',
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
];

export const DAY_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
export const DAY_TINY = ['В', 'П', 'В', 'С', 'Ч', 'П', 'С'];

export const MONTHS = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

export const MONTHS_NOM = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

export const MONTHS_SHORT = [
  'янв',
  'фев',
  'мар',
  'апр',
  'мая',
  'июн',
  'июл',
  'авг',
  'сен',
  'окт',
  'ноя',
  'дек',
];

export function parseISO(dateISO: string): Date {
  const [y, m, d] = dateISO.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
}

export function addDays(dateISO: string, days: number): string {
  const date = parseISO(dateISO);
  date.setUTCDate(date.getUTCDate() + days);
  return toISO(date);
}

export function weekday(dateISO: string): number {
  const wd = parseISO(dateISO).getUTCDay();
  return wd === 0 ? 7 : wd;
}

/**
 * Название дня по номеру weekday() (1–7, где 7 — воскресенье).
 * DAY_NAMES/DAY_SHORT индексируются с 0, поэтому 7 нормализуем в 0.
 */
export function dayName(value: number): string {
  return DAY_NAMES[value % 7] ?? '';
}

export function dayShort(value: number): string {
  return DAY_SHORT[value % 7] ?? '';
}

export function mondayOf(dateISO: string): string {
  return addDays(dateISO, -(weekday(dateISO) - 1));
}

export function sundayOf(dateISO: string): string {
  return addDays(dateISO, 7 - weekday(dateISO));
}

export function isWeekend(dateISO: string): boolean {
  return weekday(dateISO) >= 6;
}

export function formatDateLong(dateISO: string): string {
  const d = parseISO(dateISO);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export function formatDateShort(dateISO: string): string {
  const d = parseISO(dateISO);
  return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`;
}

export function formatNumeric(dateISO: string): string {
  const d = parseISO(dateISO);
  return `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(
    2,
    '0',
  )}`;
}

export function formatNumericFull(dateISO: string): string {
  const d = parseISO(dateISO);
  return `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(
    2,
    '0',
  )}.${d.getUTCFullYear()}`;
}

export function formatWeekRange(startISO: string, endISO: string): string {
  return `${formatNumeric(startISO)} – ${formatNumeric(endISO)}`;
}

export function formatPeriod(startISO: string, endISO: string): string {
  return `${formatNumericFull(startISO)} – ${formatNumericFull(endISO)}`;
}

export function monthTitle(year: number, month: number): string {
  return `${MONTHS_NOM[month]} ${year}`;
}

/**
 * Начало учебного года — понедельник недели, в которую попадает 1 сентября.
 * Считаем от него, даже если файл начинается с середины семестра, — иначе
 * чётность недель «прыгает» от обрезка к обрезку.
 */
export function academicYearStartMonday(dateISO: string): string {
  const year = parseISO(dateISO).getUTCFullYear();
  const currentSeptember = mondayOf(`${year}-09-01`);
  if (dateISO >= currentSeptember) return currentSeptember;
  return mondayOf(`${year - 1}-09-01`);
}

/** Номер учебной недели: 1 — неделя, содержащая 1 сентября. */
export function academicWeekNumber(dateISO: string): number {
  const anchorMonday = academicYearStartMonday(dateISO);
  const diff = Math.round(
    (parseISO(mondayOf(dateISO)).getTime() - parseISO(anchorMonday).getTime()) / 86400000,
  );
  return Math.floor(diff / 7) + 1;
}

export function parityForWeek(weekStartISO: string): 'odd' | 'even' {
  return academicWeekNumber(weekStartISO) % 2 === 0 ? 'even' : 'odd';
}

export function parityLabel(parity: 'odd' | 'even'): string {
  return parity === 'odd' ? 'нечётная' : 'чётная';
}

export function isSameDay(a: string, b: string): boolean {
  return a === b;
}

export interface MonthCell {
  date: string;
  day: number;
  inMonth: boolean;
}

export function monthGrid(year: number, month: number): MonthCell[] {
  const first = new Date(Date.UTC(year, month, 1));
  const startOffset = (first.getUTCDay() + 6) % 7; // Monday first
  const cells: MonthCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(Date.UTC(year, month, 1 - startOffset + i));
    cells.push({
      date: d.toISOString().slice(0, 10),
      day: d.getUTCDate(),
      inMonth: d.getUTCMonth() === month,
    });
  }
  return cells;
}

export function relativeDayLabel(dateISO: string, today = todayISO()): string | null {
  if (dateISO === today) return 'Сегодня';
  if (dateISO === addDays(today, 1)) return 'Завтра';
  if (dateISO === addDays(today, -1)) return 'Вчера';
  return null;
}
