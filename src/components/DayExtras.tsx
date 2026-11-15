import {
  ArrowRight,
  BookOpen,
  CalendarX2,
  Coffee,
  MoonStar,
  PartyPopper,
  Pencil,
  Sun,
  Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { dayName, formatDateLong } from '../lib/date';
import { holidayName } from '../lib/holidays';
import { eventTimeLabel } from '../lib/events';
import type { Day, PersonalEvent, Subgroup } from '../lib/types';
import { pairWord } from '../lib/format';

export function LunchDivider({ start, end }: { start: string; end: string }) {
  return (
    <div className="lunch-divider" role="separator">
      <Coffee size={14} aria-hidden="true" />
      <span>Обед</span>
      <time>
        {start}–{end}
      </time>
    </div>
  );
}

export function PersonalEventCard({
  event,
  overlap,
  onEdit,
}: {
  event: PersonalEvent;
  overlap?: boolean;
  onEdit: (event: PersonalEvent) => void;
}) {
  return (
    <button
      type="button"
      className={`personal-event-card${overlap ? ' is-overlap' : ''}`}
      onClick={() => onEdit(event)}
      aria-label={`Изменить личное дело: ${event.title}`}
    >
      <span className="personal-event-card__time">{eventTimeLabel(event)}</span>
      <span className="personal-event-card__body">
        <span className="personal-event-card__title">
          {event.title}
          {overlap ? <span className="personal-event-card__badge">во время пары</span> : null}
        </span>
        {event.note ? <span className="personal-event-card__note">{event.note}</span> : null}
      </span>
      <Pencil size={14} className="personal-event-card__edit" aria-hidden="true" />
    </button>
  );
}

export function SelfStudyCard({
  pair,
  start,
  end,
  note,
}: {
  pair: number;
  start: string;
  end: string;
  note?: string;
}) {
  return (
    <article className="self-study-card">
      <div className="self-study-card__top">
        <span className="pair-number">{pair} пара</span>
        <time>
          {start}–{end}
        </time>
      </div>
      <div className="self-study-card__body">
        <BookOpen size={20} aria-hidden="true" />
        <div>
          <h3>{note || 'День самоподготовки'}</h3>
          <p>Пары нет — время можно потратить на себя</p>
        </div>
      </div>
    </article>
  );
}

export function HolidayDay({ day }: { day: Day }) {
  const name = holidayName(day.date);
  return (
    <section className="day-state day-state--holiday">
      <div className="day-state__icon">
        <PartyPopper size={28} aria-hidden="true" />
      </div>
      <h2>Праздничный день</h2>
      <p>{name ? `${name}. Пар нет.` : 'Пар нет — отдыхаем.'}</p>
      {day.note && day.note.toLowerCase() !== 'праздничный день' ? (
        <span className="day-state__note">{day.note}</span>
      ) : null}
    </section>
  );
}

export function VacationDay({ day }: { day: Day }) {
  return (
    <section className="day-state day-state--vacation">
      <div className="day-state__icon">
        <Sun size={28} aria-hidden="true" />
      </div>
      <h2>Каникулы</h2>
      <p>{day.note || 'Пар нет — впереди свободное время.'}</p>
    </section>
  );
}

export function OtherSubgroupDay({
  day,
  subgroup,
  onSwitch,
}: {
  day: Day;
  subgroup: Subgroup;
  onSwitch: (subgroup: Subgroup) => void;
}) {
  const other: Subgroup = subgroup === 1 ? 2 : 1;
  return (
    <section className="day-state day-state--other">
      <div className="day-state__icon">
        <Users size={26} aria-hidden="true" />
      </div>
      <h2>Пары только у {other} п/гр</h2>
      <p>
        {dayName(day.weekday)}, {formatDateLong(day.date)} — у вашей подгруппы занятий нет.
      </p>
      <button className="button button--soft" onClick={() => onSwitch(other)}>
        Показать {other} п/гр
        <ArrowRight size={16} />
      </button>
    </section>
  );
}

export function EmptyDay({
  day,
  nextDate,
  onNext,
}: {
  day?: Day;
  nextDate: string | null;
  onNext: (date: string) => void;
}) {
  const sunday = day?.weekday === 7;
  return (
    <section className="day-state day-state--empty">
      <div className="day-state__icon">
        {day?.kind === 'self-study' ? <BookOpen size={28} /> : <MoonStar size={28} />}
      </div>
      <h2>
        {sunday
          ? 'Воскресенье'
          : day?.kind === 'self-study'
            ? 'День самоподготовки'
            : 'Пар нет'}
      </h2>
      <p>
        {sunday
          ? 'Выходной: пар нет. Можно полистать соседние дни свайпом или вернуться к сегодняшнему дню.'
          : day?.kind === 'self-study'
            ? 'Занятий по расписанию нет — время на самостоятельную работу.'
            : 'Можно выдохнуть: на этот день занятий не поставили.'}
      </p>
      {nextDate ? (
        <button className="button button--soft" onClick={() => onNext(nextDate)}>
          Следующий учебный день
          <ArrowRight size={16} />
        </button>
      ) : null}
    </section>
  );
}

export function NoScheduleState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <section className="day-state day-state--empty">
      <div className="day-state__icon">
        <CalendarX2 size={28} aria-hidden="true" />
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </section>
  );
}

export function DaySummary({ count, windows }: { count: number; windows: number }) {
  return (
    <p className="day-summary">
      {count} {pairWord(count)}
      {windows > 0 ? <span> · {windows} окон</span> : null}
    </p>
  );
}
