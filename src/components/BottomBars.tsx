import {
  CalendarDays,
  CalendarRange,
  PanelLeft,
  PanelRight,
  Settings2,
  SlidersHorizontal,
} from 'lucide-react';
import type { CalendarSide } from '../lib/types';

interface ActionBarProps {
  subgroup: number;
  projectTeacher: string | null;
  calendarSide: CalendarSide;
  calendarDocked: boolean;
  onOpenFilters: () => void;
  onOpenCalendar: () => void;
  onToggleCalendarSide: () => void;
}

export function ActionBar({
  subgroup,
  projectTeacher,
  calendarSide,
  calendarDocked,
  onOpenFilters,
  onOpenCalendar,
  onToggleCalendarSide,
}: ActionBarProps) {
  const active = Boolean(projectTeacher);
  const nextSide: CalendarSide = calendarSide === 'left' ? 'right' : 'left';
  return (
    <div className="action-bar">
      <div className="action-bar__inner">
        <button
          className={`calendar-button filter-button${active ? ' is-active' : ''}`}
          onClick={onOpenFilters}
          aria-label={`Фильтры: ${subgroup} п/гр${projectTeacher ? `, проект ${projectTeacher}` : ''}`}
        >
          <SlidersHorizontal size={18} aria-hidden="true" />
          <span className="filter-button__text">
            <span className="filter-button__title">Фильтры</span>
            <span className="filter-button__value">
              {subgroup} п/гр
              {projectTeacher ? ` · ${projectTeacher}` : ''}
            </span>
          </span>
        </button>
        {calendarDocked ? (
          <button
            className="calendar-button"
            onClick={onToggleCalendarSide}
            aria-label={`Календарь ${calendarSide === 'left' ? 'слева' : 'справа'}. Перенести ${nextSide === 'left' ? 'влево' : 'вправо'}`}
          >
            {calendarSide === 'left' ? (
              <PanelLeft size={18} aria-hidden="true" />
            ) : (
              <PanelRight size={18} aria-hidden="true" />
            )}
            {calendarSide === 'left' ? 'Слева' : 'Справа'}
          </button>
        ) : (
          <button className="calendar-button" onClick={onOpenCalendar}>
            <CalendarDays size={18} aria-hidden="true" />
            Календарь
          </button>
        )}
      </div>
    </div>
  );
}

export type Tab = 'schedule' | 'settings';

interface BottomNavProps {
  tab: Tab;
  onChange: (tab: Tab) => void;
}

export function BottomNav({ tab, onChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Основная навигация">
      <div className="bottom-nav__inner">
        <button
          className={`bottom-nav__item${tab === 'schedule' ? ' is-active' : ''}`}
          onClick={() => onChange('schedule')}
          aria-current={tab === 'schedule' ? 'page' : undefined}
        >
          <CalendarRange size={22} aria-hidden="true" />
          <span>Расписание</span>
        </button>
        <button
          className={`bottom-nav__item${tab === 'settings' ? ' is-active' : ''}`}
          onClick={() => onChange('settings')}
          aria-current={tab === 'settings' ? 'page' : undefined}
        >
          <Settings2 size={22} aria-hidden="true" />
          <span>Настройки</span>
        </button>
      </div>
    </nav>
  );
}
