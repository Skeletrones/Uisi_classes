import { isPreHoliday, weekday } from './holidays';
import type { ClockRange, ResolvedTime, TimeMode } from './types';

export const TIME_PRESETS: Record<TimeMode, Record<number, ClockRange>> = {
  regular: {
    1: { start: '08:30', end: '10:00' },
    2: { start: '10:15', end: '11:45' },
    3: { start: '12:00', end: '13:30' },
    4: { start: '14:15', end: '15:45' },
    5: { start: '16:00', end: '17:30' },
    6: { start: '17:40', end: '19:05' },
    7: { start: '19:15', end: '20:40' },
  },
  saturday: {
    1: { start: '08:30', end: '10:00' },
    2: { start: '10:15', end: '11:45' },
    3: { start: '12:00', end: '13:30' },
    4: { start: '13:45', end: '15:15' },
    5: { start: '15:30', end: '17:00' },
    6: { start: '17:10', end: '18:40' },
  },
  preholiday: {
    1: { start: '08:30', end: '10:00' },
    2: { start: '10:15', end: '11:45' },
    3: { start: '12:00', end: '13:30' },
    4: { start: '13:45', end: '14:45' },
    5: { start: '15:00', end: '16:00' },
  },
};

export const LUNCH: ClockRange = { start: '13:30', end: '14:15' };

export const MODE_LABEL: Record<TimeMode, string> = {
  regular: 'Обычный день',
  saturday: 'Суббота',
  preholiday: 'Предпраздничный режим',
};

export function timeModeForDate(dateISO: string, autoPreHoliday = true): TimeMode {
  if (weekday(dateISO) === 6) return 'saturday';
  if (autoPreHoliday && isPreHoliday(dateISO)) return 'preholiday';
  return 'regular';
}

export function presetFor(mode: TimeMode, pair: number): ClockRange | undefined {
  return TIME_PRESETS[mode][pair];
}

function same(a: ClockRange, b: ClockRange): boolean {
  return a.start === b.start && a.end === b.end;
}

/**
 * Определяет время пары. Если в файле стоит стандартное время, а день
 * предпраздничный или субботний — подставляем сокращённое время.
 * Нестандартное время из файла не трогаем.
 */
export function resolveTime(
  dateISO: string,
  pair: number,
  raw: ClockRange | null,
  autoPreHoliday = true,
): ResolvedTime {
  const mode = timeModeForDate(dateISO, autoPreHoliday);
  const preset = presetFor(mode, pair);
  const regular = presetFor('regular', pair);

  if (mode === 'regular') {
    if (raw) return { ...raw, mode, source: 'file' };
    if (regular) return { ...regular, mode, source: 'preset' };
  }

  if (raw) {
    const isStandard = (regular && same(raw, regular)) || (preset && same(raw, preset));
    if (isStandard && preset) return { ...preset, mode, source: 'preset' };
    return {
      ...raw,
      mode,
      source: 'file',
      note: 'время указано в файле — оставлено как есть',
    };
  }

  if (preset) return { ...preset, mode, source: 'preset' };

  if (regular) {
    return {
      ...regular,
      mode,
      source: 'preset',
      note:
        mode === 'preholiday'
          ? 'в предпраздничный день пар больше пяти — время обычное'
          : 'в субботу пар больше шести — время обычное',
    };
  }

  return { start: '--:--', end: '--:--', mode, source: 'preset' };
}

export function lunchForDate(dateISO: string, autoPreHoliday = true): ClockRange | null {
  return timeModeForDate(dateISO, autoPreHoliday) === 'regular' ? LUNCH : null;
}

export function clockToMinutes(clock: string): number {
  const [h, m] = clock.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesNow(date = new Date()): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function formatClock(clock: string): string {
  return clock.replace('-', '–');
}

export function formatRange(range: ClockRange): string {
  return `${range.start}–${range.end}`;
}
