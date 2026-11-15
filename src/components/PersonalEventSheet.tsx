import { useEffect, useState } from 'react';
import { CalendarPlus, Check, Clock3, StickyNote, Trash2 } from 'lucide-react';
import { clockToMinutes } from '../lib/times';
import { createPersonalEventId } from '../lib/events';
import type { PersonalEvent } from '../lib/types';
import { Sheet } from './ui/Sheet';

interface PersonalEventSheetProps {
  open: boolean;
  date: string;
  event: PersonalEvent | null;
  onClose: () => void;
  onSave: (event: PersonalEvent) => void;
  onDelete: (id: string) => void;
}

function defaultStart(): string {
  const now = new Date();
  if (now.getHours() >= 21) return '18:00';
  return `${String(Math.max(8, now.getHours() + 1)).padStart(2, '0')}:00`;
}

function endAfter(start: string): string {
  const minutes = Math.min(clockToMinutes(start) + 90, 23 * 60 + 59);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(
    minutes % 60,
  ).padStart(2, '0')}`;
}

export function PersonalEventSheet({
  open,
  date,
  event,
  onClose,
  onSave,
  onDelete,
}: PersonalEventSheetProps) {
  const [title, setTitle] = useState('');
  const [dateValue, setDateValue] = useState(date);
  const [start, setStart] = useState('18:00');
  const [end, setEnd] = useState('19:30');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setConfirmDelete(false);
    if (event) {
      setTitle(event.title);
      setDateValue(event.date);
      setStart(event.start);
      setEnd(event.end);
      setNote(event.note ?? '');
      return;
    }
    const initialStart = defaultStart();
    setTitle('');
    setDateValue(date);
    setStart(initialStart);
    setEnd(endAfter(initialStart));
    setNote('');
  }, [open, event, date]);

  const submit = () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('Напишите, что это за дело.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      setError('Выберите дату.');
      return;
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end)) {
      setError('Укажите время начала и конца.');
      return;
    }
    if (clockToMinutes(end) <= clockToMinutes(start)) {
      setError('Конец должен быть позже начала.');
      return;
    }
    onSave({
      id: event?.id ?? createPersonalEventId(),
      date: dateValue,
      start,
      end,
      title: cleanTitle,
      note: note.trim() || undefined,
      createdAt: event?.createdAt ?? new Date().toISOString(),
    });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={event ? 'Изменить дело' : 'Новое дело'}
      subtitle="Личные планы не меняют XLSX — они хранятся только у вас"
      footer={
        <div className="event-footer">
          {event ? (
            confirmDelete ? (
              <>
                <button
                  className="button button--danger button--sm"
                  onClick={() => {
                    onDelete(event.id);
                    onClose();
                  }}
                >
                  Удалить
                </button>
                <button
                  className="button button--ghost button--sm"
                  onClick={() => setConfirmDelete(false)}
                >
                  Отмена
                </button>
              </>
            ) : (
              <button
                className="button button--ghost button--danger-text button--sm"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={15} />
                Удалить
              </button>
            )
          ) : null}
          <button className="button button--primary" onClick={submit}>
            <Check size={17} />
            Сохранить
          </button>
        </div>
      }
    >
      <div className="event-form">
        <label className="event-field">
          <span className="event-field__label">
            <CalendarPlus size={15} />
            Что за дело
          </span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Например, вождение"
            autoFocus
            maxLength={80}
          />
        </label>

        <div className="event-field-row">
          <label className="event-field">
            <span className="event-field__label">Дата</span>
            <input
              type="date"
              value={dateValue}
              onChange={(changeEvent) => setDateValue(changeEvent.target.value)}
            />
          </label>
          <label className="event-field">
            <span className="event-field__label">
              <Clock3 size={15} />
              Начало
            </span>
            <input
              type="time"
              value={start}
              onChange={(changeEvent) => {
                const next = changeEvent.target.value;
                setStart(next);
                if (/^\d{2}:\d{2}$/.test(next) && clockToMinutes(end) <= clockToMinutes(next)) {
                  setEnd(endAfter(next));
                }
              }}
            />
          </label>
          <label className="event-field">
            <span className="event-field__label">Конец</span>
            <input
              type="time"
              value={end}
              onChange={(changeEvent) => setEnd(changeEvent.target.value)}
            />
          </label>
        </div>

        <label className="event-field">
          <span className="event-field__label">
            <StickyNote size={15} />
            Заметка
          </span>
          <textarea
            value={note}
            onChange={(changeEvent) => setNote(changeEvent.target.value)}
            placeholder="Место, адрес или что взять с собой"
            rows={3}
            maxLength={300}
          />
        </label>

        {error ? <p className="event-error">{error}</p> : null}
        <p className="event-hint">
          Дело появится в расписании дня по времени. Если оно совпадает с парой, карточка
          подсветится как «во время пары».
        </p>
      </div>
    </Sheet>
  );
}
