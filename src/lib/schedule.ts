import { addDays, dayName, mondayOf, todayISO, weekday } from './date';
import { lunchForDate, resolveTime } from './times';
import type {
  Day,
  Entry,
  ResolvedTime,
  Schedule,
  Settings,
  Subgroup,
  Week,
} from './types';

export function allDays(schedule: Schedule): Day[] {
  return schedule.weeks.flatMap((week) => week.days);
}

/** Преподаватели, которые ведут проект в загруженной таблице. */
export function projectTeachers(schedule: Schedule): string[] {
  const names = new Set<string>();
  for (const week of schedule.weeks) {
    for (const day of week.days) {
      for (const slot of day.slots) {
        for (const entry of slot.entries) {
          if (entry.type === 'project' && entry.teacher?.name) names.add(entry.teacher.name);
        }
      }
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b, 'ru'));
}

function matchesProjectTeacher(entry: Entry, teacher: string | null): boolean {
  if (!teacher || entry.type !== 'project') return true;
  return entry.teacher?.name === teacher;
}

export function findWeek(schedule: Schedule, dateISO: string): Week | undefined {
  const monday = mondayOf(dateISO);
  const byMonday = schedule.weeks.find((week) => week.startDate === monday);
  if (byMonday) return byMonday;
  return schedule.weeks.find((week) => dateISO >= week.startDate && dateISO <= week.endDate);
}

/** День из файла или пустой день календаря (например, воскресенье). */
export function dayOrPlaceholder(schedule: Schedule, dateISO: string): Day {
  const found = findDay(schedule, dateISO);
  if (found) return found;
  const wd = weekday(dateISO);
  return {
    date: dateISO,
    weekday: wd,
    name: dayName(wd),
    kind: 'empty',
    slots: [],
  };
}

export function findDay(schedule: Schedule, dateISO: string): Day | undefined {
  return allDays(schedule).find((day) => day.date === dateISO);
}

export function scheduleRange(schedule: Schedule): { start: string; end: string } {
  const start = schedule.weeks[0]?.startDate ?? todayISO();
  const lastWeek = schedule.weeks[schedule.weeks.length - 1];
  const end = lastWeek?.endDate ?? start;
  return { start, end };
}

export function clampToSchedule(schedule: Schedule, dateISO: string): string {
  const { start, end } = scheduleRange(schedule);
  if (dateISO < start) return start;
  if (dateISO > end) return end;
  return dateISO;
}

export function pickInitialDate(schedule: Schedule, preferToday: boolean): string {
  const { start, end } = scheduleRange(schedule);
  const today = todayISO();
  if (preferToday && today >= start && today <= end) return today;

  if (preferToday) {
    // Ближайший учебный день после сегодняшнего, иначе первый день расписания.
    const next = allDays(schedule)
      .filter((day) => day.date >= today && day.kind === 'classes')
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    if (next) return next.date;
  }

  const firstClassDay = allDays(schedule)
    .filter((day) => day.kind === 'classes')
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  return firstClassDay?.date ?? start;
}

export function nextClassDay(schedule: Schedule, fromDate: string): Day | undefined {
  return allDays(schedule)
    .filter((day) => day.date > fromDate && day.kind === 'classes')
    .sort((a, b) => a.date.localeCompare(b.date))[0];
}

export function nearestClassDay(schedule: Schedule, fromDate: string): Day | undefined {
  const all = allDays(schedule).filter((day) => day.kind === 'classes');
  const exact = all.find((day) => day.date === fromDate);
  if (exact) return exact;
  const after = all
    .filter((day) => day.date > fromDate)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  if (after) return after;
  return all.sort((a, b) => b.date.localeCompare(a.date))[0];
}

export interface ResolvedSlot {
  pair: number;
  time: ResolvedTime;
  kind: 'class' | 'window' | 'self-study';
  mine: Entry[];
  other: Entry[];
  note?: string;
}

export interface ResolvedDay {
  date: string;
  name: string;
  weekday: number;
  kind: Day['kind'];
  note?: string;
  slots: ResolvedSlot[];
  firstPair: number | null;
  lastPair: number | null;
  classCount: number;
  windowCount: number;
  otherOnly: boolean;
  otherEntries: Entry[];
  lunch: { start: string; end: string } | null;
}

export function resolveDay(day: Day, subgroup: Subgroup, settings: Settings): ResolvedDay {
  const byPair = new Map(day.slots.map((slot) => [slot.pair, slot]));
  const maxPair = Math.max(7, ...day.slots.map((slot) => slot.pair));

  const resolved: ResolvedSlot[] = [];
  const otherEntries: Entry[] = [];

  for (let pair = 1; pair <= maxPair; pair++) {
    const slot = byPair.get(pair);
    const entries = (slot?.entries ?? []).filter((entry) =>
      matchesProjectTeacher(entry, settings.projectTeacher),
    );
    const mine = entries.filter((entry) => !entry.subgroup || entry.subgroup === subgroup);
    const other = entries.filter((entry) => entry.subgroup && entry.subgroup !== subgroup);
    otherEntries.push(...other);

    const time = resolveTime(day.date, pair, slot?.timeRaw ?? null, settings.autoPreHoliday);

    if (slot?.kind === 'self-study') {
      resolved.push({
        pair,
        time,
        kind: 'self-study',
        mine: [],
        other,
        note: slot.note,
      });
      continue;
    }

    if (mine.length > 0) {
      resolved.push({ pair, time, kind: 'class', mine, other });
      continue;
    }

    if (other.length > 0) {
      resolved.push({ pair, time, kind: 'window', mine: [], other });
      continue;
    }

    if (slot) {
      resolved.push({ pair, time, kind: 'window', mine: [], other: [] });
    }
  }

  const relevant = resolved.filter((slot) => slot.kind === 'class' || slot.kind === 'self-study');
  const firstPair = relevant[0]?.pair ?? null;
  const lastPair = relevant[relevant.length - 1]?.pair ?? null;

  let visible: ResolvedSlot[] = [];
  if (firstPair != null && lastPair != null) {
    visible = resolved.filter((slot) => {
      if (slot.pair < firstPair || slot.pair > lastPair) {
        return settings.windowMode === 'all';
      }
      if (slot.kind === 'class' || slot.kind === 'self-study') return true;
      if (settings.windowMode === 'none') return false;
      return true;
    });
  }

  if (settings.windowMode === 'all' && firstPair != null && lastPair != null) {
    visible = resolved.filter((slot) => slot.pair <= lastPair);
  }

  const lunch =
    settings.showLunch && firstPair != null && lastPair != null && firstPair < 4 && lastPair >= 4
      ? lunchForDate(day.date, settings.autoPreHoliday)
      : null;

  return {
    date: day.date,
    name: day.name,
    weekday: weekday(day.date),
    kind: day.kind,
    note: day.note,
    slots: visible,
    firstPair,
    lastPair,
    classCount: resolved.filter((slot) => slot.kind === 'class').length,
    windowCount: resolved.filter((slot) => slot.kind === 'window').length,
    otherOnly: relevant.length === 0 && otherEntries.length > 0,
    otherEntries,
    lunch,
  };
}

export function nextClassDayDate(schedule: Schedule, dateISO: string): string | null {
  return nextClassDay(schedule, dateISO)?.date ?? null;
}

export function weekStartForDate(schedule: Schedule, dateISO: string): string {
  const week = findWeek(schedule, dateISO);
  return week?.startDate ?? mondayOf(dateISO);
}

export function shiftWeek(schedule: Schedule, currentDate: string, delta: number): string {
  const week = findWeek(schedule, currentDate);
  const index = week ? schedule.weeks.indexOf(week) : 0;
  const target = schedule.weeks[Math.min(Math.max(index + delta, 0), schedule.weeks.length - 1)];
  if (!target) return currentDate;
  const offset = Math.min(weekday(currentDate) - 1, 6);
  const candidate = addDays(target.startDate, offset);
  const { start, end } = scheduleRange(schedule);
  return candidate < start ? start : candidate > end ? end : candidate;
}

export function shiftDay(schedule: Schedule, currentDate: string, delta: number): string {
  if (!delta) return currentDate;
  const step = delta > 0 ? 1 : -1;
  let target = currentDate;
  for (let i = 0; i < Math.abs(delta); i++) {
    let candidate = addDays(target, step);
    // Воскресенье не входит в обычную цепочку свайпов: с субботы сразу на
    // понедельник и наоборот. Но если пользователь уже открыл воскресенье,
    // свайпы от него работают в обе стороны.
    if (weekday(target) !== 7 && weekday(candidate) === 7) {
      candidate = addDays(candidate, step);
    }
    target = candidate;
  }
  const { start, end } = scheduleRange(schedule);
  return target < start ? start : target > end ? end : target;
}

export function currentPairStatus(
  day: ResolvedDay,
  nowMinutes: number,
  nowDate: string,
): { pair: number; status: 'now' | 'next' } | null {
  if (day.date !== nowDate) return null;
  const classes = day.slots.filter((slot) => slot.kind === 'class');
  for (const slot of classes) {
    const [sh, sm] = slot.time.start.split(':').map(Number);
    const [eh, em] = slot.time.end.split(':').map(Number);
    const start = sh * 60 + sm;
    const end = eh * 60 + em;
    if (nowMinutes >= start && nowMinutes <= end) return { pair: slot.pair, status: 'now' };
  }
  const next = classes.find((slot) => {
    const [sh, sm] = slot.time.start.split(':').map(Number);
    return sh * 60 + sm > nowMinutes;
  });
  return next ? { pair: next.pair, status: 'next' } : null;
}
