import { clockToMinutes } from './times';
import type { PersonalEvent } from './types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isPersonalEvent(value: unknown): value is PersonalEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Partial<PersonalEvent>;
  return (
    typeof event.id === 'string' &&
    event.id.length > 0 &&
    typeof event.date === 'string' &&
    DATE_RE.test(event.date) &&
    typeof event.start === 'string' &&
    TIME_RE.test(event.start) &&
    typeof event.end === 'string' &&
    TIME_RE.test(event.end) &&
    clockToMinutes(event.end) > clockToMinutes(event.start) &&
    typeof event.title === 'string' &&
    event.title.trim().length > 0
  );
}

/** Приводит сохранённые дела к безопасному виду и убирает дубликаты. */
export function mergeEvents(stored: unknown): PersonalEvent[] {
  if (!Array.isArray(stored)) return [];
  const seen = new Set<string>();
  const events: PersonalEvent[] = [];
  for (const value of stored) {
    if (!isPersonalEvent(value)) continue;
    if (seen.has(value.id)) continue;
    seen.add(value.id);
    events.push({
      ...value,
      title: value.title.trim(),
      note: typeof value.note === 'string' && value.note.trim() ? value.note.trim() : undefined,
      createdAt:
        typeof value.createdAt === 'string' && value.createdAt
          ? value.createdAt
          : new Date().toISOString(),
    });
  }
  return sortEvents(events);
}

export function sortEvents(events: PersonalEvent[]): PersonalEvent[] {
  return [...events].sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    if (byDate !== 0) return byDate;
    return clockToMinutes(a.start) - clockToMinutes(b.start);
  });
}

export function eventsOnDate(events: PersonalEvent[], date: string): PersonalEvent[] {
  return events.filter((event) => event.date === date);
}

export function eventTimeLabel(event: PersonalEvent): string {
  return `${event.start}–${event.end}`;
}

export function eventStartMinutes(event: PersonalEvent): number {
  return clockToMinutes(event.start);
}

export function eventEndMinutes(event: PersonalEvent): number {
  return clockToMinutes(event.end);
}

export function eventOverlapsRange(
  event: PersonalEvent,
  start: string,
  end: string,
): boolean {
  const eventStart = eventStartMinutes(event);
  const eventEnd = eventEndMinutes(event);
  const rangeStart = clockToMinutes(start);
  const rangeEnd = clockToMinutes(end);
  return eventStart < rangeEnd && eventEnd > rangeStart;
}

export function createPersonalEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `event-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
