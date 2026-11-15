import { Armchair, Coffee } from 'lucide-react';
import type { ResolvedSlot } from '../lib/schedule';
import type { Entry } from '../lib/types';

function compactRoom(entry: Entry): string | null {
  const room = entry.room;
  if (!room) return null;
  if (room.kind === 'sport') return 'спортзал';
  if (room.kind === 'hall') return `ауд. ${room.number}`;
  if (room.building) return `${room.number ?? ''} · УК №${room.building}`.trim();
  return room.raw ?? room.number ?? null;
}

export function WindowCard({ slot }: { slot: ResolvedSlot }) {
  const otherSubgroup = slot.other[0]?.subgroup;
  const hasOther = slot.other.length > 0;

  return (
    <article className="window-card" aria-label={`Окно, ${slot.pair} пара`}>
      <div className="window-card__hatch" aria-hidden="true" />
      <div className="window-card__body">
        <div className="window-card__top">
          <span className="window-card__label">
            <Armchair size={14} aria-hidden="true" />
            Окно · {slot.pair} пара
          </span>
          <time className="window-card__time">
            {slot.time.start}–{slot.time.end}
          </time>
        </div>

        {hasOther ? (
          <>
            <p className="window-card__hint">
              {otherSubgroup ? `В это время занятия у ${otherSubgroup} п/гр` : 'В это время идёт другая пара'}
            </p>
            <ul className="window-card__list">
              {slot.other.map((entry, index) => {
                const room = compactRoom(entry);
                return (
                  <li key={`${entry.discipline}-${index}`}>
                    <span className={`window-card__dot type-bg--${entry.type}`} aria-hidden="true" />
                    <span className="window-card__entry">
                      <span className="window-card__discipline">{entry.discipline}</span>
                      <span className="window-card__detail">
                        {[entry.typeLabel, entry.teacher?.name, room].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="window-card__free">
            <Coffee size={14} aria-hidden="true" />
            Свободно — можно отдохнуть
          </p>
        )}
      </div>
    </article>
  );
}
