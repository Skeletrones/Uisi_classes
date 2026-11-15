import type { PairColors, Settings } from './types';

/** Лекции в таблице зелёные, практики — синие. */
export const DEFAULT_COLORS: PairColors = {
  lecture: '#35c48f',
  practice: '#6d8cff',
  lab: '#f2a93b',
  project: '#b07cff',
  other: '#8f9bb3',
};

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  accentStyle: 'both',
  subgroup: 1,
  projectTeacher: null,
  colors: DEFAULT_COLORS,
  windowMode: 'middle',
  autoPreHoliday: true,
  autoAdvance: true,
  autoAdvanceMinutes: 30,
  showLunch: true,
  compact: false,
  highlightNow: true,
  startWithToday: true,
  calendarSide: 'right',
};

export const SETTINGS_KEY = 'pary.settings.v1';
export const SCHEDULE_KEY = 'pary.schedule.v1';
export const DATE_KEY = 'pary.date.v1';
export const EVENTS_KEY = 'pary.events.v1';
export const APP_VERSION = '0.4.0';
