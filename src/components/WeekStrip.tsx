import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { dayShort, formatWeekRange, isSameDay, parityLabel, todayISO, parseISO } from '../lib/date';
import { findWeek } from '../lib/schedule';
import type { Schedule } from '../lib/types';

interface WeekStripProps {
  schedule: Schedule;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onShiftWeek: (delta: number) => void;
  onOpenCalendar: () => void;
}

export function WeekStrip({
  schedule,
  selectedDate,
  onSelectDate,
  onShiftWeek,
  onOpenCalendar,
}: WeekStripProps) {
  const week = findWeek(schedule, selectedDate) ?? schedule.weeks[0];
  if (!week) return null;

  const index = schedule.weeks.indexOf(week);
  const today = todayISO();
  const days = week.days.length
    ? week.days
    : Array.from({ length: 6 }, (_, i) => ({
        date: week.startDate,
        weekday: i + 1,
        name: '',
        kind: 'empty' as const,
        slots: [],
      }));

  return (
    <section className="week-strip" aria-label="Выбор дня">
      <div className="week-strip__head">
        <button
          className="week-strip__arrow"
          onClick={() => onShiftWeek(-1)}
          disabled={index <= 0}
          aria-label="Предыдущая неделя"
        >
          <ChevronLeft size={20} />
        </button>
        <button className="week-strip__label" onClick={onOpenCalendar} aria-label="Открыть календарь">
          <span className="week-strip__range">{formatWeekRange(week.startDate, week.endDate)}</span>
          <span className="week-strip__meta">
            {parityLabel(week.parity)} неделя
            <CalendarDays size={13} aria-hidden="true" />
          </span>
        </button>
        <button
          className="week-strip__arrow"
          onClick={() => onShiftWeek(1)}
          disabled={index >= schedule.weeks.length - 1}
          aria-label="Следующая неделя"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="day-strip">
        {days.map((day) => {
          const active = isSameDay(day.date, selectedDate);
          const isToday = day.date === today;
          const date = parseISO(day.date);
          const dot =
            day.kind === 'classes'
              ? 'has-classes'
              : day.kind === 'holiday'
                ? 'is-holiday'
                : day.kind === 'self-study'
                  ? 'is-study'
                  : '';
          return (
            <button
              key={`${week.index}-${day.weekday}`}
              className={`day-chip${active ? ' is-active' : ''}${isToday ? ' is-today' : ''}`}
              onClick={() => onSelectDate(day.date)}
              aria-pressed={active}
              aria-label={`${day.name}, ${date.getUTCDate()}`}
            >
              <span className="day-chip__weekday">{dayShort(day.weekday) || '—'}</span>
              <span className="day-chip__date">{date.getUTCDate()}</span>
              <span className={`day-chip__dot ${dot}`} aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
