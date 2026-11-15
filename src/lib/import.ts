import type { WorkBook } from 'xlsx';
import { parseWorkbook } from './parser';
import type { Schedule } from './types';

interface XlsxModule {
  read: (data: ArrayBuffer, options: { type: 'array'; cellDates: boolean }) => WorkBook;
}

async function loadXlsx(): Promise<XlsxModule> {
  const module = await import('xlsx');
  const candidate = (module as unknown as { default?: XlsxModule }).default ?? (module as unknown as XlsxModule);
  if (!candidate || typeof candidate.read !== 'function') {
    throw new Error('Не удалось загрузить модуль для чтения XLSX.');
  }
  return candidate;
}

export async function parseScheduleBuffer(buffer: ArrayBuffer, fileName: string): Promise<Schedule> {
  const XLSX = await loadXlsx();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
  return parseWorkbook(workbook, { fileName });
}

export function validateScheduleData(value: unknown): Schedule | null {
  if (!value || typeof value !== 'object') return null;
  const schedule = value as Partial<Schedule>;
  if (schedule.schemaVersion !== 1) return null;
  if (!Array.isArray(schedule.weeks) || schedule.weeks.length === 0) return null;
  if (!schedule.source || typeof schedule.source !== 'object') return null;
  if (typeof schedule.source.group !== 'string' || !schedule.source.group) return null;
  const weeksValid = schedule.weeks.every(
    (week) =>
      week &&
      typeof week === 'object' &&
      typeof week.startDate === 'string' &&
      typeof week.endDate === 'string' &&
      Array.isArray(week.days),
  );
  return weeksValid ? (schedule as Schedule) : null;
}

export async function parseScheduleJsonFile(file: File): Promise<Schedule> {
  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error('Не удалось прочитать JSON: файл повреждён или это не JSON.');
  }
  const schedule = validateScheduleData(data);
  if (!schedule) {
    throw new Error('Это не JSON расписания. Загрузите файл, полученный из приложения или конвертера.');
  }
  return {
    ...schedule,
    source: {
      ...schedule.source,
      fileName: schedule.source.fileName || file.name,
    },
  };
}

export async function parseScheduleFile(file: File): Promise<Schedule> {
  if (/\.json$/i.test(file.name) || file.type === 'application/json') {
    return parseScheduleJsonFile(file);
  }
  if (!/\.(xlsx|xlsm|xls)$/i.test(file.name)) {
    throw new Error('Нужен файл Excel (.xlsx, .xlsm, .xls) или JSON расписания.');
  }
  const buffer = await file.arrayBuffer();
  return parseScheduleBuffer(buffer, file.name);
}

export function scheduleJsonBlob(schedule: Schedule): Blob {
  return new Blob([JSON.stringify(schedule, null, 2)], { type: 'application/json;charset=utf-8' });
}

export function downloadScheduleJson(schedule: Schedule): void {
  const blob = scheduleJsonBlob(schedule);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeGroup = schedule.source.group.replace(/[^\wА-ЯЁа-яё-]+/g, '-');
  link.href = url;
  link.download = `${safeGroup}-schedule.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
