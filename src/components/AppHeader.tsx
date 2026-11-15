import { FileSpreadsheet, Upload } from 'lucide-react';
import type { Schedule } from '../lib/types';
import { Logo } from './Logo';

interface AppHeaderProps {
  schedule: Schedule | null;
  onImport: () => void;
}

export function AppHeader({ schedule, onImport }: AppHeaderProps) {
  return (
    <header className="topbar">
      <div className="topbar__brand">
        <Logo size={36} />
      </div>
      <div className="topbar__center">
        <h1 className="topbar__title">Расписание</h1>
        {schedule ? (
          <p className="topbar__subtitle" title={schedule.source.fileName}>
            <FileSpreadsheet size={13} aria-hidden="true" />
            <span className="topbar__file">{schedule.source.fileName}</span>
            <span className="topbar__dot" aria-hidden="true" />
            <span className="topbar__group">{schedule.source.group}</span>
          </p>
        ) : (
          <p className="topbar__subtitle">пары без таблиц</p>
        )}
      </div>
      <button className="icon-button topbar__action" onClick={onImport} aria-label="Загрузить XLSX">
        <Upload size={20} />
      </button>
    </header>
  );
}
