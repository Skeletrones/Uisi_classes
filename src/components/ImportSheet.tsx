import { useEffect, useRef, useState, type DragEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
} from 'lucide-react';
import { formatPeriod } from '../lib/date';
import { parseScheduleFile } from '../lib/import';
import type { Schedule } from '../lib/types';
import { dayWord, pairWord, weekWord } from '../lib/format';
import { Sheet } from './ui/Sheet';

type Status = 'idle' | 'parsing' | 'preview' | 'error';

interface ImportSheetProps {
  open: boolean;
  onClose: () => void;
  onApply: (schedule: Schedule) => void;
  hasSchedule: boolean;
}

export function ImportSheet({ open, onClose, onApply, hasSchedule }: ImportSheetProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [parsed, setParsed] = useState<Schedule | null>(null);
  const [error, setError] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStatus('idle');
    setParsed(null);
    setError('');
    setDragActive(false);
  }, [open]);

  const handleFile = async (file: File) => {
    setStatus('parsing');
    setError('');
    try {
      const schedule = await parseScheduleFile(file);
      setParsed(schedule);
      setStatus('preview');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus('error');
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const apply = () => {
    if (!parsed) return;
    onApply(parsed);
    onClose();
  };

  const reset = () => {
    setStatus('idle');
    setParsed(null);
    setError('');
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Загрузить расписание"
      subtitle="XLSX или JSON → нормальный интерфейс, без таблиц"
      variant="tall"
      footer={
        status === 'preview' ? (
          <div className="import-footer">
            <button className="button button--primary" onClick={apply}>
              <CheckCircle2 size={18} />
              {hasSchedule ? 'Заменить расписание' : 'Открыть расписание'}
            </button>
            <button className="button button--ghost" onClick={reset}>
              Другой файл
            </button>
          </div>
        ) : status === 'error' ? (
          <div className="import-footer">
            <button className="button button--primary" onClick={reset}>
              Попробовать снова
            </button>
          </div>
        ) : null
      }
    >
      {status === 'idle' ? (
        <div className="import-idle">
          <div
            className={`dropzone${dragActive ? ' is-drag' : ''}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
          >
            <div className="dropzone__icon">
              <FileSpreadsheet size={36} aria-hidden="true" />
            </div>
            <h3>Перетащите .xlsx или .json сюда</h3>
            <p>
              Подойдёт таблица УрТИСИ с днями недели, парами и аудиториями — или JSON, полученный
              из конвертера. Файл читается прямо на устройстве и никуда не отправляется.
            </p>
            <button className="button button--primary" onClick={() => inputRef.current?.click()}>
              <Upload size={18} />
              Выбрать файл
            </button>
            <input
              ref={inputRef}
              className="visually-hidden"
              type="file"
              accept=".xlsx,.xlsm,.xls,.json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
                event.target.value = '';
              }}
            />
          </div>

          <p className="import-note">
            Если файл не подходит, приложение покажет, что именно не получилось распознать — без
            «молчаливых» пустых экранов.
          </p>
        </div>
      ) : null}

      {status === 'parsing' ? (
        <div className="import-status">
          <div className="import-status__spinner">
            <Loader2 size={32} className="spin" />
          </div>
          <h3>Разбираем таблицу…</h3>
          <p>Ищем даты недель, пары, подгруппы и аудитории.</p>
        </div>
      ) : null}

      {status === 'error' ? (
        <div className="import-error">
          <div className="import-error__icon">
            <AlertTriangle size={26} />
          </div>
          <h3>Не получилось распознать файл</h3>
          <p className="import-error__message">{error}</p>
          <p className="import-error__hint">
            Нужен .xlsx с таблицей, где есть строка «ПОНЕДЕЛЬНИК» и колонки с датами, или JSON
            расписания из этого приложения. Если файл защищён паролем или это скан — сначала
            откройте его в Excel.
          </p>
        </div>
      ) : null}

      {status === 'preview' && parsed ? (
        <div className="import-preview">
          <div className="preview-file">
            <div className="preview-file__icon">
              <FileSpreadsheet size={24} />
            </div>
            <div className="preview-file__text">
              <strong>{parsed.source.group}</strong>
              <span>{parsed.source.fileName}</span>
            </div>
            <span className="badge badge--success">готово</span>
          </div>

          <div className="preview-stats">
            <div>
              <strong>{parsed.stats.weeks}</strong>
              <span>{weekWord(parsed.stats.weeks)}</span>
            </div>
            <div>
              <strong>{parsed.stats.days}</strong>
              <span>{dayWord(parsed.stats.days)}</span>
            </div>
            <div>
              <strong>{parsed.stats.slots}</strong>
              <span>{pairWord(parsed.stats.slots)}</span>
            </div>
            <div>
              <strong>{parsed.stats.entries}</strong>
              <span>занятий</span>
            </div>
          </div>

          <div className="preview-meta">
            {parsed.source.period ? (
              <div>
                <span>Период</span>
                <strong>{formatPeriod(parsed.source.period.start, parsed.source.period.end)}</strong>
              </div>
            ) : null}
            {parsed.source.course ? (
              <div>
                <span>Курс</span>
                <strong>{parsed.source.course}</strong>
              </div>
            ) : null}
            {parsed.source.faculty ? (
              <div>
                <span>Факультет</span>
                <strong>{parsed.source.faculty}</strong>
              </div>
            ) : null}
            {parsed.source.specialty ? (
              <div>
                <span>Специальность</span>
                <strong>{parsed.source.specialty}</strong>
              </div>
            ) : null}
            {parsed.source.sheetName ? (
              <div>
                <span>Лист</span>
                <strong>{parsed.source.sheetName}</strong>
              </div>
            ) : null}
          </div>

          {parsed.warnings.length ? (
            <div className="preview-warnings">
              <h4>
                <AlertTriangle size={15} />
                Стоит проверить
              </h4>
              <ul>
                {parsed.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="preview-ok">
              <CheckCircle2 size={16} />
              Все дни и пары распознаны без предупреждений.
            </div>
          )}

          <p className="preview-note">
            Даты, группы, подгруппы и аудитории можно перепроверить сразу в расписании. Если
            что-то не так — просто загрузите другой файл.
          </p>
        </div>
      ) : null}
    </Sheet>
  );
}
