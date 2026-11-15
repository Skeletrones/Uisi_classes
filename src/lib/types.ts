export type PairType =
  | 'lecture'
  | 'practice'
  | 'lab'
  | 'project'
  | 'consultation'
  | 'credit'
  | 'exam'
  | 'coursework'
  | 'other';

export type DayKind = 'classes' | 'holiday' | 'self-study' | 'vacation' | 'empty';

export type TimeMode = 'regular' | 'saturday' | 'preholiday';

export type Subgroup = 1 | 2;

export interface Teacher {
  position?: string;
  name: string;
  raw: string;
}

export type RoomKind = 'room' | 'hall' | 'sport' | 'other';

export interface Room {
  number?: string;
  building?: string;
  raw?: string;
  kind: RoomKind;
}

export interface Entry {
  discipline: string;
  type: PairType;
  typeLabel: string;
  rawType?: string;
  subgroup?: Subgroup;
  teacher?: Teacher;
  room?: Room;
  note?: string;
}

export interface ClockRange {
  start: string;
  end: string;
}

export interface ResolvedTime extends ClockRange {
  mode: TimeMode;
  source: 'file' | 'preset';
  note?: string;
}

export interface Slot {
  pair: number;
  /** Время, записанное в XLSX (может отсутствовать). */
  timeRaw: ClockRange | null;
  /** Время, вычисленное по умолчанию (с учётом предпраздничных дней). */
  time: ResolvedTime;
  kind: 'class' | 'self-study' | 'holiday' | 'vacation';
  entries: Entry[];
  note?: string;
}

export interface Day {
  date: string;
  weekday: number;
  name: string;
  kind: DayKind;
  note?: string;
  slots: Slot[];
}

export interface Week {
  index: number;
  startDate: string;
  endDate: string;
  academicWeek: number;
  parity: 'odd' | 'even';
  days: Day[];
}

export interface ScheduleSource {
  fileName: string;
  group: string;
  title?: string;
  faculty?: string;
  course?: string;
  specialty?: string;
  period: { start: string; end: string } | null;
  sheetName?: string;
  importedAt: string;
}

export interface ScheduleMeta {
  timePresets: Record<TimeMode, Record<number, ClockRange>>;
  weekCount: number;
  dayCount: number;
}

export interface ScheduleStats {
  weeks: number;
  days: number;
  daysWithClasses: number;
  slots: number;
  entries: number;
}

export interface Schedule {
  schemaVersion: 1;
  source: ScheduleSource;
  meta: ScheduleMeta;
  stats: ScheduleStats;
  weeks: Week[];
  warnings: string[];
}

export type WindowMode = 'middle' | 'all' | 'none';
export type AccentStyle = 'both' | 'tint' | 'stripe' | 'none';
export type ThemeMode = 'dark' | 'light' | 'system';
export type CalendarSide = 'left' | 'right';

/** Личное дело/заметка пользователя, не связанная с XLSX. */
export interface PersonalEvent {
  id: string;
  date: string;
  start: string;
  end: string;
  title: string;
  note?: string;
  createdAt: string;
}

/** Настраиваемые цвета типов пар (HEX). */
export interface PairColors {
  lecture: string;
  practice: string;
  lab: string;
  project: string;
  other: string;
}

export interface Settings {
  theme: ThemeMode;
  accentStyle: AccentStyle;
  subgroup: Subgroup;
  /** Преподаватель проекта: показываем только его пары проекта. */
  projectTeacher: string | null;
  colors: PairColors;
  windowMode: WindowMode;
  autoPreHoliday: boolean;
  /** Автоматически открывать следующий день после последней пары. */
  autoAdvance: boolean;
  /** Через сколько минут после последней пары переключать день. */
  autoAdvanceMinutes: number;
  showLunch: boolean;
  compact: boolean;
  highlightNow: boolean;
  startWithToday: boolean;
  /** С какой стороны показывать календарь на широком экране. */
  calendarSide: CalendarSide;
}
