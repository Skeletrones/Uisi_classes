import { useEffect, useState } from 'react';
import {
  CalendarClock,
  CalendarPlus,
  Check,
  Coffee,
  Copy,
  Database,
  Eye,
  FileJson,
  Info,
  Monitor,
  Moon,
  Palette,
  PanelLeft,
  PanelRight,
  Pencil,
  RefreshCw,
  RotateCcw,
  Rows3,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Sun,
  Terminal,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import {
  dayShort,
  formatDateShort,
  formatPeriod,
  weekday,
} from '../lib/date';
import { eventTimeLabel, sortEvents } from '../lib/events';
import { dayWord, pairWord, weekWord } from '../lib/format';
import type {
  AccentStyle,
  CalendarSide,
  PairColors,
  PersonalEvent,
  Schedule,
  Settings,
  Subgroup,
  ThemeMode,
  WindowMode,
} from '../lib/types';
import { APP_VERSION, DEFAULT_COLORS } from '../lib/defaults';
import { Segmented } from './ui/Segmented';
import { Toggle } from './ui/Toggle';

interface SettingsScreenProps {
  schedule: Schedule | null;
  settings: Settings;
  events: PersonalEvent[];
  onChange: (patch: Partial<Settings>) => void;
  onImport: () => void;
  onExport: () => void;
  onClear: () => void;
  onAddEvent: () => void;
  onEditEvent: (event: PersonalEvent) => void;
  onDeleteEvent: (id: string) => void;
}

const ACCENTS: Array<{ value: AccentStyle; label: string }> = [
  { value: 'both', label: 'Полоса + фон' },
  { value: 'stripe', label: 'Полоса' },
  { value: 'tint', label: 'Фон' },
  { value: 'none', label: 'Без акцента' },
];

const COLOR_FIELDS: Array<{ key: keyof PairColors; label: string; hint: string }> = [
  { key: 'lecture', label: 'Лекции', hint: 'по умолчанию зелёный' },
  { key: 'practice', label: 'Практики', hint: 'по умолчанию синий' },
  { key: 'lab', label: 'Лабораторные', hint: 'оранжевый' },
  { key: 'project', label: 'Проект', hint: 'фиолетовый' },
  { key: 'other', label: 'Другое', hint: 'серый' },
];

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

interface ColorRowProps {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorRow({ label, hint, value, onChange }: ColorRowProps) {
  const [text, setText] = useState(value.toUpperCase());

  useEffect(() => {
    setText(value.toUpperCase());
  }, [value]);

  const commit = (raw: string) => {
    const candidate = raw.trim().startsWith('#') ? raw.trim() : `#${raw.trim()}`;
    if (HEX_COLOR.test(candidate)) {
      onChange(candidate.toLowerCase());
      setText(candidate.toUpperCase());
    } else {
      setText(value.toUpperCase());
    }
  };

  return (
    <div className="color-row">
      <span className="color-row__swatch" style={{ background: value }} aria-hidden="true" />
      <div className="color-row__meta">
        <strong>{label}</strong>
        <span>{hint}</span>
      </div>
      <div className="color-row__controls">
        <input
          className="color-row__picker"
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`Выбрать цвет: ${label}`}
        />
        <input
          className="color-row__hex"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onBlur={() => commit(text)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              commit(text);
              event.currentTarget.blur();
            }
          }}
          aria-label={`HEX-код: ${label}`}
          spellCheck={false}
          autoCapitalize="characters"
        />
      </div>
    </div>
  );
}

export function SettingsScreen({
  schedule,
  settings,
  events,
  onChange,
  onImport,
  onExport,
  onClear,
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
}: SettingsScreenProps) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmEventId, setConfirmEventId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [advanceText, setAdvanceText] = useState(String(settings.autoAdvanceMinutes));

  useEffect(() => {
    setAdvanceText(String(settings.autoAdvanceMinutes));
  }, [settings.autoAdvanceMinutes]);

  const commitAdvance = () => {
    const value = Number(advanceText);
    if (!Number.isFinite(value)) {
      setAdvanceText(String(settings.autoAdvanceMinutes));
      return;
    }
    const minutes = Math.min(180, Math.max(0, Math.round(value)));
    setAdvanceText(String(minutes));
    onChange({ autoAdvanceMinutes: minutes });
  };

  const upcomingEvents = sortEvents(events);

  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText('npm run convert -- "расписание.xlsx"');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="settings-screen">
      <header className="screen-head">
        <h1>Настройки</h1>
        <p>Подгоните расписание под себя — всё хранится на этом устройстве.</p>
      </header>

      <section className="settings-section">
        <h2 className="settings-section__title">
          <Palette size={17} />
          Внешний вид
        </h2>
        <div className="settings-card">
          <div className="setting-block">
            <div className="setting-block__head">
              <span className="setting-block__label">Тема</span>
              <span className="setting-block__hint">Тёмная — как в приложении, светлая — днём</span>
            </div>
            <Segmented<ThemeMode>
              ariaLabel="Тема"
              value={settings.theme}
              onChange={(theme) => onChange({ theme })}
              options={[
                { value: 'dark', label: <span className="segmented__with-icon"><Moon size={14} /> Тёмная</span> },
                { value: 'light', label: <span className="segmented__with-icon"><Sun size={14} /> Светлая</span> },
                { value: 'system', label: <span className="segmented__with-icon"><Monitor size={14} /> Системная</span> },
              ]}
            />
          </div>

          <div className="setting-block">
            <div className="setting-block__head">
              <span className="setting-block__label">Акцент типа пары</span>
              <span className="setting-block__hint">
                Цвет полоски и фона: лекция, практика, лабораторная
              </span>
            </div>
            <div className="accent-options" role="radiogroup" aria-label="Акцент типа пары">
              {ACCENTS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={settings.accentStyle === option.value}
                  className={`accent-option${settings.accentStyle === option.value ? ' is-active' : ''}`}
                  onClick={() => onChange({ accentStyle: option.value })}
                >
                  <span className={`accent-preview accent-preview--${option.value}`} aria-hidden="true">
                    <i />
                    <b />
                  </span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="setting-block">
            <div className="setting-block__head">
              <span className="setting-block__label">Календарь на широком экране</span>
              <span className="setting-block__hint">
                На планшете и компьютере в горизонтальной ориентации календарь всегда
                открыт сбоку. Здесь можно выбрать сторону.
              </span>
            </div>
            <Segmented<CalendarSide>
              ariaLabel="Сторона календаря"
              value={settings.calendarSide}
              onChange={(calendarSide) => onChange({ calendarSide })}
              options={[
                {
                  value: 'left',
                  label: (
                    <span className="segmented__with-icon">
                      <PanelLeft size={14} /> Слева
                    </span>
                  ),
                },
                {
                  value: 'right',
                  label: (
                    <span className="segmented__with-icon">
                      <PanelRight size={14} /> Справа
                    </span>
                  ),
                },
              ]}
            />
          </div>

          <Toggle
            checked={settings.compact}
            onChange={(compact) => onChange({ compact })}
            label="Компактные карточки"
            description="Меньше отступов — больше пар на экране"
            icon={<Rows3 size={18} />}
          />
        </div>
      </section>

      <section className="settings-section">
        <h2 className="settings-section__title">
          <Palette size={17} />
          Цвета пар
        </h2>
        <div className="settings-card">
          <div className="setting-block">
            <div className="setting-block__head">
              <span className="setting-block__label">Цвета типов занятий</span>
              <span className="setting-block__hint">
                Как в таблице: лекции зелёные, практики синие. Можно выбрать любой цвет
                или ввести HEX-код.
              </span>
            </div>
            <div className="color-list">
              {COLOR_FIELDS.map((field) => (
                <ColorRow
                  key={field.key}
                  label={field.label}
                  hint={field.hint}
                  value={settings.colors[field.key]}
                  onChange={(color) =>
                    onChange({
                      colors: { ...settings.colors, [field.key]: color },
                    })
                  }
                />
              ))}
            </div>
            <button
              type="button"
              className="button button--ghost button--sm color-reset"
              onClick={() => onChange({ colors: { ...DEFAULT_COLORS } })}
            >
              <RotateCcw size={15} />
              Сбросить цвета
            </button>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h2 className="settings-section__title">
          <SlidersHorizontal size={17} />
          Расписание
        </h2>
        <div className="settings-card">
          <div className="setting-block">
            <div className="setting-block__head">
              <span className="setting-block__label">Моя подгруппа</span>
              <span className="setting-block__hint">
                Показываем общие пары и пары выбранной подгруппы
              </span>
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
          </div>

          <div className="setting-block">
            <div className="setting-block__head">
              <span className="setting-block__label">Окна</span>
              <span className="setting-block__hint">
                «Внутри дня» — окна между парами, без пустого начала дня
              </span>
            </div>
            <Segmented<WindowMode>
              ariaLabel="Отображение окон"
              value={settings.windowMode}
              onChange={(windowMode) => onChange({ windowMode })}
              size="sm"
              options={[
                { value: 'middle', label: 'Внутри дня' },
                { value: 'all', label: 'Все' },
                { value: 'none', label: 'Скрыть' },
              ]}
            />
          </div>

          <Toggle
            checked={settings.autoPreHoliday}
            onChange={(autoPreHoliday) => onChange({ autoPreHoliday })}
            label="Сокращённые дни"
            description="Перед праздниками подставлять предпраздничное время пар"
            icon={<CalendarClock size={18} />}
          />

          <Toggle
            checked={settings.autoAdvance}
            onChange={(autoAdvance) => onChange({ autoAdvance })}
            label="Следующий день после пар"
            description="После последней пары автоматически открывать следующий день"
            icon={<CalendarClock size={18} />}
          />
          {settings.autoAdvance ? (
            <div className="advance-row">
              <div className="advance-row__line">
                <span>Через</span>
                <input
                  type="number"
                  min={0}
                  max={180}
                  step={5}
                  inputMode="numeric"
                  value={advanceText}
                  onChange={(event) => setAdvanceText(event.target.value)}
                  onBlur={commitAdvance}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      commitAdvance();
                      event.currentTarget.blur();
                    }
                  }}
                  aria-label="Минут после последней пары"
                />
                <span>минут после последней пары</span>
              </div>
              <p>В воскресенье сразу откроется понедельник.</p>
            </div>
          ) : null}
          <Toggle
            checked={settings.showLunch}
            onChange={(showLunch) => onChange({ showLunch })}
            label="Показывать обед"
            description="Разделитель 13:30–14:15 в обычные дни"
            icon={<Coffee size={18} />}
          />
          <Toggle
            checked={settings.highlightNow}
            onChange={(highlightNow) => onChange({ highlightNow })}
            label="Текущая пара"
            description="Бейджи «Сейчас» и «Далее» в сегодняшнем дне"
            icon={<Eye size={18} />}
          />
          <Toggle
            checked={settings.startWithToday}
            onChange={(startWithToday) => onChange({ startWithToday })}
            label="Открывать на сегодня"
            description="При запуске сразу показывать текущий день"
            icon={<Smartphone size={18} />}
          />
        </div>
      </section>

      <section className="settings-section">
        <h2 className="settings-section__title">
          <CalendarPlus size={17} />
          Мои дела
        </h2>
        <div className="settings-card">
          <div className="event-manage">
            <div className="event-manage__head">
              <div>
                <strong>Личные планы</strong>
                <span>
                  Вождение, секции, встречи — поверх расписания, без правки XLSX.
                </span>
              </div>
              <button className="button button--soft button--sm" onClick={onAddEvent}>
                <CalendarPlus size={15} />
                Добавить
              </button>
            </div>

            {upcomingEvents.length === 0 ? (
              <p className="event-manage__empty">
                Пока пусто. Добавьте дело — оно появится в нужном дне и подсветится, если
                попадёт на пару.
              </p>
            ) : (
              <div className="event-list">
                {upcomingEvents.map((event) => (
                  <div className="event-list__row" key={event.id}>
                    <button
                      className="event-list__main"
                      onClick={() => onEditEvent(event)}
                      aria-label={`Изменить дело: ${event.title}`}
                    >
                      <span className="event-list__date">
                        <strong>{formatDateShort(event.date)}</strong>
                        <span>{dayShort(weekday(event.date))}</span>
                      </span>
                      <span className="event-list__body">
                        <strong>{event.title}</strong>
                        <span>
                          {eventTimeLabel(event)}
                          {event.note ? ` · ${event.note}` : ''}
                        </span>
                      </span>
                      <Pencil size={14} aria-hidden="true" />
                    </button>
                    {confirmEventId === event.id ? (
                      <span className="event-list__confirm">
                        <button
                          className="button button--danger button--sm"
                          onClick={() => {
                            onDeleteEvent(event.id);
                            setConfirmEventId(null);
                          }}
                        >
                          Удалить
                        </button>
                        <button
                          className="button button--ghost button--sm"
                          onClick={() => setConfirmEventId(null)}
                        >
                          Нет
                        </button>
                      </span>
                    ) : (
                      <button
                        className="icon-button icon-button--small event-list__delete"
                        onClick={() => setConfirmEventId(event.id)}
                        aria-label={`Удалить дело: ${event.title}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h2 className="settings-section__title">
          <Database size={17} />
          Данные
        </h2>
        <div className="settings-card">
          {schedule ? (
            <div className="data-file">
              <div className="data-file__head">
                <div>
                  <strong>{schedule.source.group}</strong>
                  <span>{schedule.source.fileName}</span>
                </div>
                <span className="badge">{schedule.source.course ? `${schedule.source.course} курс` : 'XLSX'}</span>
              </div>
              <div className="data-file__stats">
                <span>{schedule.stats.weeks} {weekWord(schedule.stats.weeks)}</span>
                <span>{schedule.stats.days} {dayWord(schedule.stats.days)}</span>
                <span>{schedule.stats.slots} {pairWord(schedule.stats.slots)}</span>
              </div>
              {schedule.source.period ? (
                <p className="data-file__period">
                  {formatPeriod(schedule.source.period.start, schedule.source.period.end)}
                </p>
              ) : null}
              <p className="data-file__imported">
                Загружено {new Date(schedule.source.importedAt).toLocaleString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          ) : (
            <div className="data-empty">
              <Users size={22} />
              <div>
                <strong>Расписание не загружено</strong>
                <span>Добавьте XLSX, чтобы начать.</span>
              </div>
            </div>
          )}

          <div className="data-actions">
            <button className="button button--primary" onClick={onImport}>
              <Upload size={17} />
              {schedule ? 'Обновить файл' : 'Загрузить файл'}
            </button>
            <button className="button button--soft" onClick={onExport} disabled={!schedule}>
              <FileJson size={17} />
              Скачать JSON
            </button>
            {schedule ? (
              confirmClear ? (
                <div className="confirm-row">
                  <span>Удалить расписание?</span>
                  <button className="button button--danger button--sm" onClick={onClear}>
                    Да, удалить
                  </button>
                  <button className="button button--ghost button--sm" onClick={() => setConfirmClear(false)}>
                    Отмена
                  </button>
                </div>
              ) : (
                <button className="button button--ghost button--danger-text" onClick={() => setConfirmClear(true)}>
                  <Trash2 size={16} />
                  Удалить данные
                </button>
              )
            ) : null}
          </div>

          <div className="pc-converter">
            <div className="pc-converter__head">
              <Terminal size={16} />
              <strong>Конвертер для ПК</strong>
              <span>если нужно получить JSON отдельно</span>
            </div>
            <div className="code-row">
              <code>npm run convert -- "расписание.xlsx"</code>
              <button className="icon-button icon-button--small" onClick={copyCommand} aria-label="Скопировать команду">
                {copied ? <Check size={15} /> : <Copy size={15} />}
              </button>
            </div>
            <p>
              Результат — <code>.json</code> рядом с файлом: недели, дни, пары, подгруппы и
              аудитории. Его же можно импортировать в приложение.
            </p>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h2 className="settings-section__title">
          <Info size={17} />
          О приложении
        </h2>
        <div className="settings-card about-card">
          <div className="about-brand">
            <div className="about-brand__icon">
              <Sparkles size={18} />
            </div>
            <div>
              <strong>Пары</strong>
              <span>версия {APP_VERSION}</span>
            </div>
          </div>
          <p>
            Расписание УрТИСИ без гигантских таблиц: загрузите XLSX, выберите подгруппу и
            смотрите пары с телефона. Данные не уходят на сервер.
          </p>
          <div className="about-points">
            <span>
              <ShieldCheck size={15} />
              Локальное хранение
            </span>
            <span>
              <Upload size={15} />
              Импорт .xlsx
            </span>
            <span>
              <FileJson size={15} />
              Экспорт .json
            </span>
            <span>
              <RefreshCw size={15} />
              Работает офлайн
            </span>
          </div>
          <p className="about-footnote">
            Поддерживается формат таблиц УрТИСИ: даты по неделям, дисциплина; тип пары;
            преподаватель; подгруппа; аудитория и корпус.
          </p>
        </div>
      </section>
    </div>
  );
}
