import { useMemo, type ReactNode } from 'react';
import { CalendarClock, Clock3, Plus } from 'lucide-react';
import {
  dayName,
  formatDateLong,
  isSameDay,
  parityLabel,
  relativeDayLabel,
  todayISO,
} from '../lib/date';
import { useNow } from '../hooks/useNow';
import { clockToMinutes, minutesNow, MODE_LABEL, timeModeForDate } from '../lib/times';
import {
  dayOrPlaceholder,
  findDay,
  findWeek,
  nextClassDayDate,
  resolveDay,
  currentPairStatus,
  type ResolvedSlot,
} from '../lib/schedule';
import {
  eventOverlapsRange,
  eventStartMinutes,
  eventsOnDate,
} from '../lib/events';
import type { PersonalEvent, Schedule, Settings, Subgroup } from '../lib/types';
import { eventWord, pairWord } from '../lib/format';
import { PairCard } from './PairCard';
import { WindowCard } from './WindowCard';
import {
  EmptyDay,
  HolidayDay,
  LunchDivider,
  OtherSubgroupDay,
  PersonalEventCard,
  SelfStudyCard,
  VacationDay,
} from './DayExtras';

interface DayViewProps {
  schedule: Schedule;
  date: string;
  settings: Settings;
  events: PersonalEvent[];
  onChangeSubgroup: (subgroup: Subgroup) => void;
  onSelectDate: (date: string) => void;
  onOpenCalendar: () => void;
  onAddEvent: (date: string) => void;
  onEditEvent: (event: PersonalEvent) => void;
}

type TimelineItem =
  | { kind: 'slot'; slot: ResolvedSlot }
  | { kind: 'event'; event: PersonalEvent };

export function DayView({
  schedule,
  date,
  settings,
  events,
  onChangeSubgroup,
  onSelectDate,
  onOpenCalendar,
  onAddEvent,
  onEditEvent,
}: DayViewProps) {
  const now = useNow();
  const today = todayISO();
  const realDay = findDay(schedule, date);
  const day = realDay ?? dayOrPlaceholder(schedule, date);
  const week = findWeek(schedule, date);
  const dayEvents = useMemo(() => eventsOnDate(events, date), [events, date]);

  const resolved = useMemo(
    () => resolveDay(day, settings.subgroup, settings),
    [day, settings],
  );

  const status = useMemo(() => {
    if (!resolved || !settings.highlightNow) return null;
    return currentPairStatus(resolved, minutesNow(now), today);
    // now обновляется раз в 30 секунд — этого достаточно для бейджа «сейчас»
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved, settings.highlightNow, today, Math.floor(now.getTime() / 30_000)]);

  const mode = timeModeForDate(day.date, settings.autoPreHoliday);
  const relative = relativeDayLabel(day.date, today);
  const nextDate = nextClassDayDate(schedule, day.date);
  const todayInSchedule =
    today >= (schedule.weeks[0]?.startDate ?? today) &&
    today <= (schedule.weeks[schedule.weeks.length - 1]?.endDate ?? today);

  const overlapsPair = (event: PersonalEvent) =>
    resolved.slots.some(
      (slot) =>
        slot.kind === 'class' &&
        eventOverlapsRange(event, slot.time.start, slot.time.end),
    );

  const renderTimeline = () => {
    const timeline: TimelineItem[] = [
      ...resolved.slots.map<TimelineItem>((slot) => ({ kind: 'slot', slot })),
      ...dayEvents.map<TimelineItem>((event) => ({ kind: 'event', event })),
    ];
    timeline.sort((a, b) => {
      const aStart =
        a.kind === 'slot' ? clockToMinutes(a.slot.time.start) : eventStartMinutes(a.event);
      const bStart =
        b.kind === 'slot' ? clockToMinutes(b.slot.time.start) : eventStartMinutes(b.event);
      if (aStart !== bStart) return aStart - bStart;
      // при совпадении времени личное дело показываем «поверх» пары
      return (a.kind === 'event' ? 0 : 1) - (b.kind === 'event' ? 0 : 1);
    });

    const elements: ReactNode[] = [];
    let lunchInserted = false;

    for (const item of timeline) {
      if (
        item.kind === 'slot' &&
        resolved.lunch &&
        !lunchInserted &&
        item.slot.pair >= 4 &&
        elements.length > 0
      ) {
        elements.push(
          <LunchDivider key="lunch" start={resolved.lunch.start} end={resolved.lunch.end} />,
        );
        lunchInserted = true;
      }

      if (item.kind === 'event') {
        elements.push(
          <PersonalEventCard
            key={`event-${item.event.id}`}
            event={item.event}
            overlap={overlapsPair(item.event)}
            onEdit={onEditEvent}
          />,
        );
        continue;
      }

      const slot = item.slot;
      if (slot.kind === 'class') {
        elements.push(
          <PairCard
            key={`pair-${slot.pair}`}
            slot={slot}
            accentStyle={settings.accentStyle}
            compact={settings.compact}
            status={status?.pair === slot.pair ? status.status : undefined}
          />,
        );
      } else if (slot.kind === 'self-study') {
        elements.push(
          <SelfStudyCard
            key={`self-${slot.pair}`}
            pair={slot.pair}
            start={slot.time.start}
            end={slot.time.end}
            note={slot.note}
          />,
        );
      } else {
        elements.push(<WindowCard key={`window-${slot.pair}`} slot={slot} />);
      }
    }

    return elements;
  };

  const hasPairList =
    day.kind !== 'holiday' &&
    day.kind !== 'vacation' &&
    !resolved.otherOnly &&
    resolved.slots.length > 0;

  return (
    <div className={`day-view${settings.compact ? ' is-compact' : ''}`}>
      <div className="day-head">
        <div className="day-head__main">
          <div className="day-head__title-row">
            <h2 className="day-head__title">{dayName(day.weekday)}</h2>
            {relative ? <span className="today-chip">{relative}</span> : null}
          </div>
          <p className="day-head__date">
            {formatDateLong(day.date)}
            {week ? (
              <>
                <span className="day-head__dot" aria-hidden="true" />
                {parityLabel(week.parity)} неделя
              </>
            ) : null}
          </p>
        </div>
        <div className="day-head__aside">
          {settings.subgroup ? (
            <span className="day-head__subgroup">{settings.subgroup} п/гр</span>
          ) : null}
          <span className="day-head__count">
            {resolved.classCount} {pairWord(resolved.classCount)}
            {dayEvents.length > 0 ? ` · ${dayEvents.length} ${eventWord(dayEvents.length)}` : ''}
          </span>
        </div>
      </div>

      <div className="day-quick">
        {todayInSchedule && !isSameDay(day.date, today) ? (
          <button className="quick-button" onClick={() => onSelectDate(today)}>
            <CalendarClock size={15} />
            К сегодняшнему дню
          </button>
        ) : null}
        <button className="quick-button" onClick={() => onAddEvent(day.date)}>
          <Plus size={15} />
          Добавить дело
        </button>
        <button className="quick-button quick-button--ghost" onClick={onOpenCalendar}>
          Календарь
        </button>
      </div>

      {mode === 'preholiday' ? (
        <div className="mode-banner mode-banner--preholiday">
          <Clock3 size={17} aria-hidden="true" />
          <div>
            <strong>{MODE_LABEL.preholiday}</strong>
            <span>Пары сокращены — время подставлено автоматически.</span>
          </div>
        </div>
      ) : null}

      {day.kind === 'holiday' ? (
        <HolidayDay day={day} />
      ) : day.kind === 'vacation' ? (
        <VacationDay day={day} />
      ) : resolved.otherOnly ? (
        <OtherSubgroupDay day={day} subgroup={settings.subgroup} onSwitch={onChangeSubgroup} />
      ) : resolved.slots.length === 0 ? (
        <EmptyDay day={day} nextDate={nextDate} onNext={onSelectDate} />
      ) : (
        <div className="pair-list">{renderTimeline()}</div>
      )}

      {!hasPairList && dayEvents.length > 0 ? (
        <div className="personal-events-block">
          <div className="personal-events-block__head">
            <span>Мои дела на этот день</span>
            <button className="quick-button" onClick={() => onAddEvent(day.date)}>
              <Plus size={14} />
              Добавить
            </button>
          </div>
          <div className="pair-list">
            {dayEvents.map((event) => (
              <PersonalEventCard
                key={event.id}
                event={event}
                overlap={overlapsPair(event)}
                onEdit={onEditEvent}
              />
            ))}
          </div>
        </div>
      ) : null}

      {nextDate && resolved.slots.length > 0 ? (
        <button className="next-day-button" onClick={() => onSelectDate(nextDate)}>
          Следующий учебный день
        </button>
      ) : null}
    </div>
  );
}
