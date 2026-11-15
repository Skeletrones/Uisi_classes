import {
  BookOpen,
  CircleHelp,
  FlaskConical,
  MapPin,
  NotebookPen,
  Sparkles,
  UserRound,
} from 'lucide-react';
import type { AccentStyle, Entry, PairType, Room } from '../lib/types';
import type { ResolvedSlot } from '../lib/schedule';

const TYPE_ICONS: Record<PairType, typeof BookOpen> = {
  lecture: BookOpen,
  practice: NotebookPen,
  lab: FlaskConical,
  project: Sparkles,
  consultation: CircleHelp,
  credit: CircleHelp,
  exam: CircleHelp,
  coursework: CircleHelp,
  other: CircleHelp,
};

function roomLabel(room?: Room): string | null {
  if (!room) return null;
  if (room.kind === 'sport') return 'Спортзал / тренажёрный зал';
  if (room.kind === 'hall') return `Аудитория ${room.number ?? ''}`.trim();
  if (room.building) return room.number ?? null;
  return room.raw ?? room.number ?? null;
}

function EntryView({ entry, compact }: { entry: Entry; compact: boolean }) {
  const Icon = TYPE_ICONS[entry.type] ?? CircleHelp;
  const room = roomLabel(entry.room);

  return (
    <div className="pair-entry">
      <h3 className="pair-entry__discipline">{entry.discipline}</h3>

      <div className="pair-entry__tags">
        <span className={`type-chip type-chip--${entry.type}`}>
          <Icon size={13} strokeWidth={2} aria-hidden="true" />
          {entry.typeLabel}
        </span>
        <span className={`subgroup-chip${entry.subgroup ? '' : ' subgroup-chip--common'}`}>
          {entry.subgroup ? `${entry.subgroup} п/гр` : 'общая'}
        </span>
      </div>

      {entry.teacher ? (
        <div className="meta-row meta-row--teacher">
          <UserRound size={15} className="meta-row__icon" aria-hidden="true" />
          <span className="meta-row__text">
            {!compact && entry.teacher.position ? (
              <span className="meta-row__position">{entry.teacher.position}</span>
            ) : null}
            <span className="meta-row__name">{entry.teacher.name}</span>
          </span>
        </div>
      ) : null}

      {room ? (
        <div className="meta-row meta-row--room" title={entry.room?.raw}>
          <MapPin size={15} className="meta-row__icon" aria-hidden="true" />
          <span className="meta-row__text">
            <span className="meta-row__room">{room}</span>
            {entry.room?.building && entry.room.kind === 'room' ? (
              <span className="meta-row__building">УК №{entry.room.building}</span>
            ) : null}
          </span>
        </div>
      ) : null}
    </div>
  );
}

interface PairCardProps {
  slot: ResolvedSlot;
  accentStyle: AccentStyle;
  compact: boolean;
  status?: 'now' | 'next';
}

export function PairCard({ slot, accentStyle, compact, status }: PairCardProps) {
  const entries = slot.mine.length ? slot.mine : [];
  const type = entries[0]?.type ?? 'other';

  return (
    <article
      className={`pair-card pair-card--${slot.kind === 'self-study' ? 'self-study' : 'class'}${compact ? ' is-compact' : ''}`}
      data-type={type}
      data-accent={accentStyle}
      aria-label={`${slot.pair} пара`}
    >
      <span className="pair-card__stripe" aria-hidden="true" />
      <div className="pair-card__body">
        <div className="pair-card__top">
          <div className="pair-card__time">
            <span>{slot.time.start}</span>
            <span className="pair-card__dash">–</span>
            <span>{slot.time.end}</span>
          </div>
          <div className="pair-card__badges">
            {status === 'now' ? (
              <span className="status-pill status-pill--now">
                <span className="status-pill__dot" /> Сейчас
              </span>
            ) : null}
            {status === 'next' ? <span className="status-pill status-pill--next">Далее</span> : null}
            <span className="pair-number">{slot.pair} пара</span>
          </div>
        </div>

        {entries.length ? (
          <div className="pair-card__entries">
            {entries.map((entry, index) => (
              <div key={`${entry.discipline}-${index}`} className={index > 0 ? 'pair-entry-wrap' : ''}>
                {index > 0 ? <div className="pair-entry__divider" /> : null}
                <EntryView entry={entry} compact={compact} />
              </div>
            ))}
          </div>
        ) : null}

        {slot.time.note ? <p className="pair-card__time-note">{slot.time.note}</p> : null}
      </div>
    </article>
  );
}
