import { useMemo } from 'react';
import { Check, RotateCcw, SlidersHorizontal, UserRound, Users } from 'lucide-react';
import { projectTeachers } from '../lib/schedule';
import type { Schedule, Settings, Subgroup } from '../lib/types';
import { Segmented } from './ui/Segmented';
import { Sheet } from './ui/Sheet';

interface FiltersSheetProps {
  open: boolean;
  onClose: () => void;
  schedule: Schedule;
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}

export function FiltersSheet({
  open,
  onClose,
  schedule,
  settings,
  onChange,
}: FiltersSheetProps) {
  const teachers = useMemo(() => projectTeachers(schedule), [schedule]);
  const hasTeacherFilter = Boolean(settings.projectTeacher);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Фильтры"
      subtitle="Подгруппа и преподаватель проекта"
      footer={
        <div className="filters-footer">
          {hasTeacherFilter ? (
            <button
              className="button button--ghost"
              onClick={() => onChange({ projectTeacher: null })}
            >
              <RotateCcw size={16} />
              Сбросить
            </button>
          ) : null}
          <button className="button button--primary" onClick={onClose}>
            <Check size={17} />
            Готово
          </button>
        </div>
      }
    >
      <div className="filters">
        <section className="filter-block">
          <div className="filter-block__head">
            <span className="filter-block__icon" aria-hidden="true">
              <Users size={17} />
            </span>
            <div>
              <strong>Подгруппа</strong>
              <span>Общие пары видны всегда, пары другой подгруппы скрываются</span>
            </div>
          </div>
          <Segmented<Subgroup>
            ariaLabel="Подгруппа"
            value={settings.subgroup}
            onChange={(subgroup) => onChange({ subgroup })}
            options={[
              { value: 1, label: '1 п/гр' },
              { value: 2, label: '2 п/гр' },
            ]}
          />
        </section>

        <section className="filter-block">
          <div className="filter-block__head">
            <span className="filter-block__icon" aria-hidden="true">
              <UserRound size={17} />
            </span>
            <div>
              <strong>Преподаватель проекта</strong>
              <span>Оставьте только свои пары проекта — чужие преподаватели скроются</span>
            </div>
          </div>

          {teachers.length === 0 ? (
            <p className="filter-empty">
              В этом расписании нет пар с пометкой «Проект» — фильтр не понадобится.
            </p>
          ) : (
            <div className="filter-teachers" role="radiogroup" aria-label="Преподаватель проекта">
              <button
                type="button"
                role="radio"
                aria-checked={!hasTeacherFilter}
                className={`filter-teacher${!hasTeacherFilter ? ' is-active' : ''}`}
                onClick={() => onChange({ projectTeacher: null })}
              >
                <span className="filter-teacher__name">
                  <SlidersHorizontal size={14} aria-hidden="true" />
                  Все преподаватели
                </span>
                {!hasTeacherFilter ? <Check size={16} aria-hidden="true" /> : null}
              </button>
              {teachers.map((teacher) => {
                const active = settings.projectTeacher === teacher;
                return (
                  <button
                    key={teacher}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={`filter-teacher${active ? ' is-active' : ''}`}
                    onClick={() => onChange({ projectTeacher: teacher })}
                  >
                    <span className="filter-teacher__name">{teacher}</span>
                    {active ? <Check size={16} aria-hidden="true" /> : null}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </Sheet>
  );
}
