import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Users,
  X,
} from 'lucide-react';
import {
  dayShort,
  formatDateLong,
  formatPeriod,
  MONTHS_NOM,
  monthGrid,
  monthTitle,
  parseISO,
  todayISO,
} from '../lib/date';
import { isHoliday, isPreHoliday } from '../lib/holidays';
import { findDay, scheduleRange } from '../lib/schedule';
import { eventWord, pairWord, weekWord } from '../lib/format';
import type { Day, Entry, PairType, PersonalEvent, Schedule, Subgroup } from '../lib/types';
import { Sheet } from './ui/Sheet';

interface CalendarViewProps {
  schedule: Schedule;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onClose?: () => void;
  inline?: boolean;
  projectTeacher: string | null;
  events?: PersonalEvent[];
}

const TYPE_OPTIONS: Array<{ value: PairType; label: string }> = [
  { value: 'lecture', label: 'Лекции' },
  { value: 'practice', label: 'Практики' },
  { value: 'lab', label: 'Лабы' },
  { value: 'project', label: 'Проект' },
];

function normalizeSubject(value: string): string {
  return value.toLocaleLowerCase('ru').replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
}

export function CalendarView({
  schedule,
  selectedDate,
  onSelectDate,
  onClose,
  inline = false,
  projectTeacher,
  events = [],
}: CalendarViewProps) {
  const selected = parseISO(selectedDate);
  const [year, setYear] = useState(selected.getUTCFullYear());
  const [month, setMonth] = useState(selected.getUTCMonth());
  const [filterOpen, setFilterOpen] = useState(false);
  const [subjectQuery, setSubjectQuery] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<PairType[]>([]);
  const [subgroupFilter, setSubgroupFilter] = useState<'any' | Subgroup>('any');
  const [onlyMyProject, setOnlyMyProject] = useState(true);

  useEffect(() => {
    const date = parseISO(selectedDate);
    setYear(date.getUTCFullYear());
    setMonth(date.getUTCMonth());
  }, [selectedDate, inline]);

  const range = scheduleRange(schedule);
  const cells = useMemo(() => monthGrid(year, month), [year, month]);
  const today = todayISO();

  const subjects = useMemo(() => {
    const names = new Set<string>();
    for (const week of schedule.weeks) {
      for (const day of week.days) {
        for (const slot of day.slots) {
          for (const entry of slot.entries) {
            const name = entry.discipline?.trim();
            if (name) names.add(name);
          }
        }
      }
    }
    return [...names].sort((a, b) => a.localeCompare(b, 'ru'));
  }, [schedule]);

  const selectedSet = useMemo(() => new Set(selectedSubjects), [selectedSubjects]);
  const typeSet = useMemo(() => new Set(selectedTypes), [selectedTypes]);

  useEffect(() => {
    setSelectedSubjects((previous) => {
      const next = previous.filter((subject) => subjects.includes(subject));
      return next.length === previous.length ? previous : next;
    });
  }, [subjects]);

  const visibleSubjects = useMemo(() => {
    const query = normalizeSubject(subjectQuery);
    if (!query) return subjects;
    return subjects.filter((subject) => normalizeSubject(subject).includes(query));
  }, [subjects, subjectQuery]);

  const toggleSubject = (subject: string) => {
    setSelectedSubjects((previous) =>
      previous.includes(subject)
        ? previous.filter((item) => item !== subject)
        : [...previous, subject],
    );
  };

  const toggleType = (type: PairType) => {
    setSelectedTypes((previous) =>
      previous.includes(type)
        ? previous.filter((item) => item !== type)
        : [...previous, type],
    );
  };

  const entryMatches = (entry: Entry): boolean => {
    if (selectedSet.size > 0 && !selectedSet.has(entry.discipline)) return false;
    if (typeSet.size > 0 && !typeSet.has(entry.type)) return false;
    if (subgroupFilter !== 'any' && entry.subgroup && entry.subgroup !== subgroupFilter) {
      return false;
    }
    if (
      onlyMyProject &&
      projectTeacher &&
      entry.type === 'project' &&
      entry.teacher?.name !== projectTeacher
    ) {
      return false;
    }
    return true;
  };

  const hasSearchFilters =
    selectedSet.size > 0 || typeSet.size > 0 || subgroupFilter !== 'any';

  const dayMatches = (day: Day | undefined): boolean => {
    if (!hasSearchFilters) return true;
    if (!day) return false;
    return day.slots.some((slot) => slot.entries.some(entryMatches));
  };

  const selectedDay = findDay(schedule, selectedDate);
  const selectedEventCount = events.filter((event) => event.date === selectedDate).length;
  const selectedPairCount =
    selectedDay && selectedDay.kind === 'classes'
      ? selectedDay.slots.filter(
          (slot) =>
            slot.kind === 'class' &&
            (hasSearchFilters
              ? slot.entries.some(entryMatches)
              : slot.entries.length > 0),
        ).length
      : 0;
  const selectedInfo =
    !selectedDay || selectedDay.kind !== 'classes'
      ? 'без пар'
      : hasSearchFilters
        ? selectedPairCount > 0
          ? `${selectedPairCount} ${pairWord(selectedPairCount)} по фильтру`
          : 'нет выбранных пар'
        : `${selectedPairCount} ${pairWord(selectedPairCount)}`;

  const nextMonthDate = new Date(Date.UTC(year, month + 1, 1));
  const prevMonthDate = new Date(Date.UTC(year, month - 1, 1));
  const canPrev =
    prevMonthDate.getUTCFullYear() > parseISO(range.start).getUTCFullYear() ||
    (prevMonthDate.getUTCFullYear() === parseISO(range.start).getUTCFullYear() &&
      prevMonthDate.getUTCMonth() >= parseISO(range.start).getUTCMonth());
  const canNext =
    nextMonthDate.getUTCFullYear() < parseISO(range.end).getUTCFullYear() ||
    (nextMonthDate.getUTCFullYear() === parseISO(range.end).getUTCFullYear() &&
      nextMonthDate.getUTCMonth() <= parseISO(range.end).getUTCMonth());

  const shiftMonth = (delta: number) => {
    const date = new Date(Date.UTC(year, month + delta, 1));
    setYear(date.getUTCFullYear());
    setMonth(date.getUTCMonth());
  };

  const pickToday = () => {
    const target = today < range.start ? range.start : today > range.end ? range.end : today;
    onSelectDate(target);
    onClose?.();
  };

  const resetFilters = () => {
    setSelectedSubjects([]);
    setSelectedTypes([]);
    setSubgroupFilter('any');
    setOnlyMyProject(true);
    setSubjectQuery('');
  };

  const activeFilterCount =
    selectedSet.size + typeSet.size + (subgroupFilter === 'any' ? 0 : 1);

  const calendar = (
    <div className={`calendar${inline ? ' calendar--inline' : ''}`}>
      <div className="calendar__head">
        <button
          className="icon-button icon-button--ghost"
          onClick={() => shiftMonth(-1)}
          disabled={!canPrev}
          aria-label="Предыдущий месяц"
        >
          <ChevronLeft size={20} />
        </button>
        <h3>{monthTitle(year, month)}</h3>
        <button
          className="icon-button icon-button--ghost"
          onClick={() => shiftMonth(1)}
          disabled={!canNext}
          aria-label="Следующий месяц"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="calendar-search">
        <div className="calendar-search__bar">
          <button
            type="button"
            className={`calendar-search__toggle${filterOpen ? ' is-open' : ''}${
              activeFilterCount > 0 ? ' is-active' : ''
            }`}
            onClick={() => setFilterOpen((value) => !value)}
            aria-expanded={filterOpen}
          >
            <Search size={15} aria-hidden="true" />
            <span className="calendar-search__label">Поиск и фильтры</span>
            {activeFilterCount > 0 ? (
              <span className="calendar-search__badge">{activeFilterCount}</span>
            ) : null}
            <ChevronDown size={16} className="calendar-search__chevron" aria-hidden="true" />
          </button>
          {activeFilterCount > 0 ? (
            <button type="button" className="calendar-search__clear" onClick={resetFilters}>
              Сбросить
            </button>
          ) : null}
        </div>

        {activeFilterCount > 0 ? (
          <div className="calendar-search__selected">
            {selectedSubjects.map((subject) => (
              <button
                key={subject}
                type="button"
                className="subject-chip"
                onClick={() => toggleSubject(subject)}
                aria-label={`Убрать предмет: ${subject}`}
              >
                <span>{subject}</span>
                <X size={11} aria-hidden="true" />
              </button>
            ))}
            {selectedTypes.map((type) => (
              <button
                key={type}
                type="button"
                className="subject-chip"
                onClick={() => toggleType(type)}
                aria-label={`Убрать тип: ${TYPE_OPTIONS.find((item) => item.value === type)?.label}`}
              >
                <span>{TYPE_OPTIONS.find((item) => item.value === type)?.label}</span>
                <X size={11} aria-hidden="true" />
              </button>
            ))}
            {subgroupFilter !== 'any' ? (
              <button
                type="button"
                className="subject-chip"
                onClick={() => setSubgroupFilter('any')}
                aria-label="Убрать фильтр по подгруппе"
              >
                <span>{subgroupFilter} п/гр</span>
                <X size={11} aria-hidden="true" />
              </button>
            ) : null}
          </div>
        ) : null}

        {filterOpen ? (
          <div className="calendar-search__panel">
            <div className="calendar-search__input">
              <Search size={14} aria-hidden="true" />
              <input
                value={subjectQuery}
                onChange={(event) => setSubjectQuery(event.target.value)}
                placeholder="Название предмета"
                aria-label="Поиск предмета"
                autoFocus
              />
              {subjectQuery ? (
                <button
                  type="button"
                  onClick={() => setSubjectQuery('')}
                  aria-label="Очистить поиск"
                >
                  <X size={13} />
                </button>
              ) : null}
            </div>

            <div className="subject-options" role="group" aria-label="Предметы">
              {visibleSubjects.map((subject) => {
                const active = selectedSet.has(subject);
                return (
                  <button
                    key={subject}
                    type="button"
                    role="checkbox"
                    aria-checked={active}
                    className={`subject-option${active ? ' is-active' : ''}`}
                    onClick={() => toggleSubject(subject)}
                  >
                    <span className="subject-option__check" aria-hidden="true">
                      {active ? <Check size={13} /> : null}
                    </span>
                    <span className="subject-option__name">{subject}</span>
                  </button>
                );
              })}
              {visibleSubjects.length === 0 ? (
                <p className="subject-empty">Ничего не найдено</p>
              ) : null}
            </div>

            <div className="calendar-filter">
              <span className="calendar-filter__title">Тип занятия</span>
              <div className="calendar-filter__chips">
                {TYPE_OPTIONS.map((option) => {
                  const active = typeSet.has(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={active}
                      className={`filter-chip${active ? ' is-active' : ''}`}
                      onClick={() => toggleType(option.value)}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="calendar-filter">
              <span className="calendar-filter__title">
                <Users size={13} aria-hidden="true" />
                Подгруппа
              </span>
              <div className="calendar-filter__chips">
                {[
                  { value: 'any' as const, label: 'Любая' },
                  { value: 1 as const, label: '1 п/гр' },
                  { value: 2 as const, label: '2 п/гр' },
                ].map((option) => {
                  const active = subgroupFilter === option.value;
                  return (
                    <button
                      key={String(option.value)}
                      type="button"
                      aria-pressed={active}
                      className={`filter-chip${active ? ' is-active' : ''}`}
                      onClick={() => setSubgroupFilter(option.value)}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="calendar-filter">
              <span className="calendar-filter__title">Группа проекта</span>
              <button
                type="button"
                role="switch"
                aria-checked={onlyMyProject && Boolean(projectTeacher)}
                className={`calendar-project-toggle${
                  onlyMyProject && projectTeacher ? ' is-active' : ''
                }${!projectTeacher ? ' is-disabled' : ''}`}
                onClick={() => {
                  if (projectTeacher) setOnlyMyProject((value) => !value);
                }}
                disabled={!projectTeacher}
              >
                <span className="subject-option__check" aria-hidden="true">
                  {onlyMyProject && projectTeacher ? <Check size={13} /> : null}
                </span>
                <span className="calendar-project-toggle__text">
                  <strong>
                    {projectTeacher ? 'Учитывать мою группу проекта' : 'Группа проекта не выбрана'}
                  </strong>
                  <span>
                    {projectTeacher
                      ? projectTeacher
                      : 'Выберите преподавателя проекта в фильтрах расписания'}
                  </span>
                </span>
              </button>
            </div>

            <div className="calendar-search__actions">
              <button
                type="button"
                className="button button--ghost button--sm"
                onClick={resetFilters}
                disabled={activeFilterCount === 0 && !projectTeacher}
              >
                Сбросить всё
              </button>
              <button
                type="button"
                className="button button--soft button--sm"
                onClick={() => setFilterOpen(false)}
              >
                Свернуть
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="calendar__weekdays" aria-hidden="true">
        {[1, 2, 3, 4, 5, 6, 7].map((weekday) => (
          <span key={weekday}>{dayShort(weekday)}</span>
        ))}
      </div>

      <div className="calendar__grid" role="grid" aria-label={monthTitle(year, month)}>
        {cells.map((cell) => {
          const day = findDay(schedule, cell.date);
          const inRange = cell.date >= range.start && cell.date <= range.end;
          const hasClasses = day?.kind === 'classes';
          const matches = dayMatches(day);
          const holiday = day?.kind === 'holiday' || isHoliday(cell.date);
          const preholiday = day ? isPreHoliday(cell.date) : false;
          const isSelected = cell.date === selectedDate;
          const isToday = cell.date === today;
          const hasPersonal = events.some((event) => event.date === cell.date);
          const showDot = hasClasses
            ? matches
            : day?.kind === 'holiday' || day?.kind === 'self-study';
          const classes = hasClasses
            ? `calendar__cell--classes${
                hasSearchFilters && matches ? ' calendar__cell--match' : ''
              }`
            : day?.kind === 'self-study'
              ? 'calendar__cell--study'
              : '';
          const statusLabel = hasClasses
            ? hasSearchFilters
              ? matches
                ? ', есть выбранные пары'
                : ', нет выбранных пар'
              : ', есть пары'
            : day?.kind === 'holiday'
              ? ', праздник'
              : day?.kind === 'self-study'
                ? ', день самоподготовки'
                : '';
          return (
            <button
              key={cell.date}
              role="gridcell"
              className={[
                'calendar__cell',
                cell.inMonth ? '' : 'is-outside',
                inRange ? '' : 'is-disabled',
                isSelected ? 'is-selected' : '',
                isToday ? 'is-today' : '',
                holiday ? 'is-holiday' : '',
                preholiday ? 'is-preholiday' : '',
                classes,
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => {
                onSelectDate(cell.date);
                onClose?.();
              }}
              disabled={!inRange}
              aria-label={`${cell.day} ${MONTHS_NOM[parseISO(cell.date).getUTCMonth()]}${statusLabel}${
                hasPersonal ? ', есть мои дела' : ''
              }`}
              aria-current={isSelected ? 'date' : undefined}
            >
              <span>{cell.day}</span>
              {showDot ? (
                <i
                  className={`calendar__dot${
                    hasClasses && hasSearchFilters && matches ? ' calendar__dot--match' : ''
                  }`}
                  aria-hidden="true"
                />
              ) : null}
              {hasPersonal ? (
                <i className="calendar__dot calendar__dot--personal" aria-hidden="true" />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="calendar__legend">
        <span>
          <i
            className={`legend-dot ${
              hasSearchFilters ? 'legend-dot--match' : 'legend-dot--classes'
            }`}
          />{' '}
          {hasSearchFilters ? 'по фильтру' : 'пары'}
        </span>
        <span>
          <i className="legend-dot legend-dot--personal" /> мои дела
        </span>
        <span>
          <i className="legend-dot legend-dot--holiday" /> праздник
        </span>
        <span>
          <i className="legend-dot legend-dot--preholiday" /> сокращённый день
        </span>
      </div>

      <div className="calendar__selected">
        <span>Выбрано</span>
        <strong>{formatDateLong(selectedDate)}</strong>
        <span>
          {selectedInfo}
          {selectedEventCount > 0
            ? ` · ${selectedEventCount} ${eventWord(selectedEventCount)}`
            : ''}
        </span>
      </div>

      {inline ? (
        <div className="calendar-inline-footer">
          <button className="button button--soft button--sm" onClick={pickToday}>
            Сегодня
          </button>
        </div>
      ) : null}
    </div>
  );

  return calendar;
}

interface CalendarSheetProps {
  open: boolean;
  onClose: () => void;
  schedule: Schedule;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  projectTeacher: string | null;
  events?: PersonalEvent[];
}

export function CalendarSheet({
  open,
  onClose,
  schedule,
  selectedDate,
  onSelectDate,
  projectTeacher,
  events,
}: CalendarSheetProps) {
  if (!open) return null;
  const range = scheduleRange(schedule);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Календарь"
      subtitle={`${formatPeriod(range.start, range.end)} · ${schedule.weeks.length} ${weekWord(
        schedule.weeks.length,
      )}`}
      variant="tall"
      footer={
        <div className="calendar-footer">
          <button
            className="button button--soft"
            onClick={() => {
              const today = todayISO();
              onSelectDate(today < range.start ? range.start : today > range.end ? range.end : today);
              onClose();
            }}
          >
            Сегодня
          </button>
          <button className="button button--ghost" onClick={onClose}>
            Закрыть
          </button>
        </div>
      }
    >
      <CalendarView
        schedule={schedule}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        onClose={onClose}
        projectTeacher={projectTeacher}
        events={events}
      />
    </Sheet>
  );
}
