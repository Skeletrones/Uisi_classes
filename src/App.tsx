import { useEffect, useRef, useState, type TouchEvent } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';
import { AppHeader } from './components/AppHeader';
import { WeekStrip } from './components/WeekStrip';
import { DayView } from './components/DayView';
import { ActionBar, BottomNav, type Tab } from './components/BottomBars';
import { CalendarSheet, CalendarView } from './components/CalendarSheet';
import { FiltersSheet } from './components/FiltersSheet';
import { ImportSheet } from './components/ImportSheet';
import { Onboarding } from './components/Onboarding';
import { SettingsScreen } from './components/SettingsScreen';
import { PersonalEventSheet } from './components/PersonalEventSheet';
import { Toast, type ToastState } from './components/Toast';
import { useMediaQuery } from './hooks/useMediaQuery';
import { usePersistentState } from './hooks/usePersistentState';
import { useTheme } from './hooks/useTheme';
import { DEFAULT_SETTINGS, DATE_KEY, EVENTS_KEY, SCHEDULE_KEY, SETTINGS_KEY } from './lib/defaults';
import { downloadScheduleJson, validateScheduleData } from './lib/import';
import {
  dayOrPlaceholder,
  pickInitialDate,
  projectTeachers,
  resolveDay,
  scheduleRange,
  shiftDay as shiftScheduleDay,
  shiftWeek as shiftScheduleWeek,
} from './lib/schedule';
import { mergeEvents, sortEvents } from './lib/events';
import { clockToMinutes, minutesNow } from './lib/times';
import { addDays, todayISO, weekday } from './lib/date';
import type {
  AccentStyle,
  CalendarSide,
  PairColors,
  PersonalEvent,
  Schedule,
  Settings,
  ThemeMode,
  WindowMode,
} from './lib/types';

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function normalizeColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && HEX_COLOR.test(value) ? value.toLowerCase() : fallback;
}

function mergeColors(stored: unknown, fallback: PairColors): PairColors {
  const value = (stored && typeof stored === 'object' ? stored : {}) as Partial<PairColors>;
  return {
    lecture: normalizeColor(value.lecture, fallback.lecture),
    practice: normalizeColor(value.practice, fallback.practice),
    lab: normalizeColor(value.lab, fallback.lab),
    project: normalizeColor(value.project, fallback.project),
    other: normalizeColor(value.other, fallback.other),
  };
}

function mergeSettings(stored: unknown, fallback: Settings): Settings {
  if (!stored || typeof stored !== 'object') return fallback;
  const value = stored as Partial<Settings>;
  const themes: ThemeMode[] = ['dark', 'light', 'system'];
  const accents: AccentStyle[] = ['both', 'tint', 'stripe', 'none'];
  const windows: WindowMode[] = ['middle', 'all', 'none'];
  const sides: CalendarSide[] = ['left', 'right'];
  const rawAdvanceMinutes = Number(value.autoAdvanceMinutes);
  const advanceMinutes = Number.isFinite(rawAdvanceMinutes)
    ? Math.min(180, Math.max(0, Math.round(rawAdvanceMinutes)))
    : fallback.autoAdvanceMinutes;
  return {
    ...fallback,
    ...value,
    theme: themes.includes(value.theme as ThemeMode) ? (value.theme as ThemeMode) : fallback.theme,
    accentStyle: accents.includes(value.accentStyle as AccentStyle)
      ? (value.accentStyle as AccentStyle)
      : fallback.accentStyle,
    subgroup: value.subgroup === 2 ? 2 : 1,
    projectTeacher:
      typeof value.projectTeacher === 'string' && value.projectTeacher.trim()
        ? value.projectTeacher
        : null,
    colors: mergeColors(value.colors, fallback.colors),
    windowMode: windows.includes(value.windowMode as WindowMode)
      ? (value.windowMode as WindowMode)
      : fallback.windowMode,
    autoPreHoliday: value.autoPreHoliday !== false,
    autoAdvance:
      typeof value.autoAdvance === 'boolean' ? value.autoAdvance : fallback.autoAdvance,
    autoAdvanceMinutes: advanceMinutes,
    showLunch: value.showLunch !== false,
    compact: Boolean(value.compact),
    highlightNow: value.highlightNow !== false,
    startWithToday: value.startWithToday !== false,
    calendarSide: sides.includes(value.calendarSide as CalendarSide)
      ? (value.calendarSide as CalendarSide)
      : fallback.calendarSide,
  };
}

function readSavedDate(): string | null {
  try {
    return localStorage.getItem(DATE_KEY);
  } catch {
    return null;
  }
}

export default function App() {
  const [schedule, setSchedule] = usePersistentState<Schedule | null>(
    SCHEDULE_KEY,
    null,
    validateScheduleData,
  );
  const [settings, setSettings] = usePersistentState<Settings>(
    SETTINGS_KEY,
    DEFAULT_SETTINGS,
    mergeSettings,
  );
  const [events, setEvents] = usePersistentState<PersonalEvent[]>(
    EVENTS_KEY,
    [],
    mergeEvents,
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(() => {
    if (!schedule) return null;
    const range = scheduleRange(schedule);
    const today = todayISO();
    if (settings.startWithToday && today >= range.start && today <= range.end) return today;
    const saved = readSavedDate();
    if (saved && saved >= range.start && saved <= range.end) return saved;
    return pickInitialDate(schedule, settings.startWithToday);
  });
  const [tab, setTab] = useState<Tab>('schedule');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [eventEditor, setEventEditor] = useState<{
    date: string;
    event: PersonalEvent | null;
  } | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const autoAdvancedFor = useRef<Set<string>>(new Set());
  const calendarDocked = useMediaQuery('(min-width: 980px) and (orientation: landscape)');

  useTheme(settings.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--lecture', settings.colors.lecture);
    root.style.setProperty('--practice', settings.colors.practice);
    root.style.setProperty('--lab', settings.colors.lab);
    root.style.setProperty('--project', settings.colors.project);
    root.style.setProperty('--other', settings.colors.other);
  }, [settings.colors]);

  useEffect(() => {
    try {
      if (selectedDate) localStorage.setItem(DATE_KEY, selectedDate);
      else localStorage.removeItem(DATE_KEY);
    } catch {
      // ignore
    }
  }, [selectedDate]);

  useEffect(() => {
    if (!schedule) return;
    const range = scheduleRange(schedule);
    if (!selectedDate || selectedDate < range.start || selectedDate > range.end) {
      setSelectedDate(pickInitialDate(schedule, settings.startWithToday));
    }
  }, [schedule, selectedDate, settings.startWithToday]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedDate, tab]);

  useEffect(() => {
    document.title = schedule
      ? `${schedule.source.group} — Расписание`
      : 'Пары — расписание';
  }, [schedule]);

  const activeDate =
    selectedDate && schedule ? selectedDate : schedule ? pickInitialDate(schedule, settings.startWithToday) : null;

  const showToast = (message: string, tone: ToastState['tone'] = 'success') => {
    setToast({ id: Date.now(), message, tone });
  };

  const updateSettings = (patch: Partial<Settings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  };

  const openCalendar = () => {
    if (calendarDocked) {
      document.querySelector('.calendar-dock')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    setCalendarOpen(true);
  };

  const openNewEvent = (date: string) => {
    setEventEditor({ date, event: null });
  };

  const openEditEvent = (event: PersonalEvent) => {
    setEventEditor({ date: event.date, event });
  };

  const saveEvent = (event: PersonalEvent) => {
    setEvents((current) =>
      sortEvents([...current.filter((item) => item.id !== event.id), event]),
    );
    showToast('Дело сохранено', 'success');
  };

  const deleteEvent = (id: string) => {
    setEvents((current) => current.filter((event) => event.id !== id));
    showToast('Дело удалено', 'info');
  };

  const toggleCalendarSide = () => {
    updateSettings({ calendarSide: settings.calendarSide === 'left' ? 'right' : 'left' });
  };

  useEffect(() => {
    if (calendarDocked) setCalendarOpen(false);
  }, [calendarDocked]);

  useEffect(() => {
    if (!schedule || !settings.autoAdvance || !activeDate || tab !== 'schedule') return;
    const today = todayISO();
    const range = scheduleRange(schedule);
    if (today < range.start || today > range.end) return;
    if (activeDate !== today) return;
    if (autoAdvancedFor.current.has(today)) return;

    const resolved = resolveDay(
      dayOrPlaceholder(schedule, today),
      settings.subgroup,
      settings,
    );
    const classes = resolved.slots.filter((slot) => slot.kind === 'class');
    let shouldAdvance = false;
    if (classes.length === 0) {
      // В воскресенье пар нет — сразу открываем понедельник.
      shouldAdvance = weekday(today) === 7;
    } else {
      const last = classes[classes.length - 1];
      const lastEnd = clockToMinutes(last.time.end);
      shouldAdvance = minutesNow(new Date()) >= lastEnd + settings.autoAdvanceMinutes;
    }
    if (!shouldAdvance) return;

    let target = addDays(today, 1);
    if (weekday(target) === 7) target = addDays(target, 1);
    if (target > range.end) return;

    autoAdvancedFor.current.add(today);
    setSelectedDate(target);
    showToast('Открыт следующий день', 'info');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule, settings, activeDate, tab]);

  useEffect(() => {
    if (!schedule || !settings.projectTeacher) return;
    if (!projectTeachers(schedule).includes(settings.projectTeacher)) {
      setSettings((current) => ({ ...current, projectTeacher: null }));
    }
  }, [schedule, settings.projectTeacher, setSettings]);

  const applySchedule = (next: Schedule) => {
    setSchedule(next);
    if (
      settings.projectTeacher &&
      !projectTeachers(next).includes(settings.projectTeacher)
    ) {
      setSettings((current) => ({ ...current, projectTeacher: null }));
    }
    setSelectedDate(pickInitialDate(next, settings.startWithToday));
    setTab('schedule');
    showToast('Расписание загружено', 'success');
  };

  const handleExport = () => {
    if (!schedule) return;
    try {
      downloadScheduleJson(schedule);
      showToast('JSON скачан', 'success');
    } catch {
      showToast('Не удалось сохранить JSON', 'error');
    }
  };

  const handleClear = () => {
    setSchedule(null);
    setSelectedDate(null);
    setTab('schedule');
    showToast('Расписание удалено', 'info');
  };

  const shiftWeek = (delta: number) => {
    if (!schedule || !activeDate) return;
    setSelectedDate(shiftScheduleWeek(schedule, activeDate, delta));
  };

  const goToDay = (delta: number) => {
    if (!schedule || !activeDate) return;
    setSelectedDate(shiftScheduleDay(schedule, activeDate, delta));
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (tab !== 'schedule' || calendarOpen || filtersOpen || importOpen) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key === 'ArrowLeft') goToDay(-1);
      if (event.key === 'ArrowRight') goToDay(1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, calendarOpen, filtersOpen, importOpen, schedule, activeDate]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const handle = NativeApp.addListener('backButton', () => {
      if (calendarOpen) {
        setCalendarOpen(false);
        return;
      }
      if (filtersOpen) {
        setFiltersOpen(false);
        return;
      }
      if (importOpen) {
        setImportOpen(false);
        return;
      }
      if (tab !== 'schedule') {
        setTab('schedule');
        return;
      }
      void NativeApp.exitApp();
    });
    return () => {
      void handle.then((listener) => listener.remove());
    };
  }, [calendarOpen, filtersOpen, importOpen, tab]);

  const onTouchStart = (event: TouchEvent) => {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const onTouchEnd = (event: TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) > 70 && Math.abs(dy) < 55) {
      goToDay(dx < 0 ? 1 : -1);
    }
  };

  return (
    <div className="app-shell">
      {!schedule ? (
        <Onboarding onImport={() => setImportOpen(true)} />
      ) : (
        <>
          {tab === 'schedule' ? (
            <AppHeader schedule={schedule} onImport={() => setImportOpen(true)} />
          ) : null}

          <main
            className={`app-main${tab === 'settings' ? ' app-main--settings' : ''}${
              calendarDocked && tab === 'schedule' ? ' app-main--docked' : ''
            }`}
          >
            {tab === 'schedule' && activeDate ? (
              <div
                className={`schedule-layout${
                  calendarDocked
                    ? ` schedule-layout--docked schedule-layout--${settings.calendarSide}`
                    : ''
                }`}
              >
                {calendarDocked ? (
                  <aside className="calendar-dock" aria-label="Календарь">
                    <CalendarView
                      inline
                      schedule={schedule}
                      selectedDate={activeDate}
                      onSelectDate={setSelectedDate}
                      projectTeacher={settings.projectTeacher}
                      events={events}
                    />
                  </aside>
                ) : null}
                <div
                  className="schedule-column"
                  onTouchStart={onTouchStart}
                  onTouchEnd={onTouchEnd}
                >
                  <WeekStrip
                    schedule={schedule}
                    selectedDate={activeDate}
                    onSelectDate={setSelectedDate}
                    onShiftWeek={shiftWeek}
                    onOpenCalendar={openCalendar}
                  />
                  <DayView
                    schedule={schedule}
                    date={activeDate}
                    settings={settings}
                    events={events}
                    onChangeSubgroup={(subgroup) => updateSettings({ subgroup })}
                    onSelectDate={setSelectedDate}
                    onOpenCalendar={openCalendar}
                    onAddEvent={openNewEvent}
                    onEditEvent={openEditEvent}
                  />
                </div>
              </div>
            ) : null}

            {tab === 'settings' ? (
              <SettingsScreen
                schedule={schedule}
                settings={settings}
                events={events}
                onChange={updateSettings}
                onImport={() => setImportOpen(true)}
                onExport={handleExport}
                onClear={handleClear}
                onAddEvent={() => openNewEvent(activeDate ?? todayISO())}
                onEditEvent={openEditEvent}
                onDeleteEvent={deleteEvent}
              />
            ) : null}
          </main>

          {tab === 'schedule' ? (
            <ActionBar
              subgroup={settings.subgroup}
              projectTeacher={settings.projectTeacher}
              calendarSide={settings.calendarSide}
              calendarDocked={calendarDocked}
              onOpenFilters={() => setFiltersOpen(true)}
              onOpenCalendar={openCalendar}
              onToggleCalendarSide={toggleCalendarSide}
            />
          ) : null}

          <BottomNav tab={tab} onChange={setTab} />
        </>
      )}

      {schedule ? (
        <FiltersSheet
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          schedule={schedule}
          settings={settings}
          onChange={updateSettings}
        />
      ) : null}

      {schedule ? (
        <CalendarSheet
          open={calendarOpen && !calendarDocked}
          onClose={() => setCalendarOpen(false)}
          schedule={schedule}
          selectedDate={activeDate ?? todayISO()}
          onSelectDate={setSelectedDate}
          projectTeacher={settings.projectTeacher}
          events={events}
        />
      ) : null}

      <ImportSheet
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onApply={applySchedule}
        hasSchedule={Boolean(schedule)}
      />

      <PersonalEventSheet
        open={Boolean(eventEditor)}
        date={eventEditor?.date ?? activeDate ?? todayISO()}
        event={eventEditor?.event ?? null}
        onClose={() => setEventEditor(null)}
        onSave={saveEvent}
        onDelete={deleteEvent}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
