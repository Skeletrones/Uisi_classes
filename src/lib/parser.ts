import type { CellObject, Range, WorkBook, WorkSheet } from 'xlsx';
import { academicWeekNumber, mondayOf, parityForWeek, weekday } from './date';
import { TIME_PRESETS, resolveTime } from './times';
import type {
  ClockRange,
  Day,
  DayKind,
  Entry,
  PairType,
  Room,
  Schedule,
  Slot,
  Subgroup,
  Teacher,
  Week,
} from './types';

export class ScheduleParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScheduleParseError';
  }
}

interface DateCell {
  r: number;
  c: number;
  date: string;
  value: string;
}

interface DayBlock {
  startRow: number;
  endRow: number;
  name: string;
  weekday: number;
}

interface MergeLookup {
  get(r: number, c: number): { r: number; c: number } | null;
}

const DAY_NAMES: Array<{ re: RegExp; name: string; weekday: number }> = [
  { re: /^ПОНЕДЕЛЬНИК|^ПН\b/i, name: 'Понедельник', weekday: 1 },
  { re: /^ВТОРНИК|^ВТ\b/i, name: 'Вторник', weekday: 2 },
  { re: /^СРЕДА|^СР\b/i, name: 'Среда', weekday: 3 },
  { re: /^ЧЕТВЕРГ|^ЧТ\b/i, name: 'Четверг', weekday: 4 },
  { re: /^ПЯТНИЦА|^ПТ\b/i, name: 'Пятница', weekday: 5 },
  { re: /^СУББОТА|^СБ\b/i, name: 'Суббота', weekday: 6 },
  { re: /^ВОСКРЕСЕНЬЕ|^ВС\b/i, name: 'Воскресенье', weekday: 7 },
];

const TYPE_LABELS: Record<PairType, string> = {
  lecture: 'Лекция',
  practice: 'Практика',
  lab: 'Лабораторная',
  project: 'Проект',
  consultation: 'Консультация',
  credit: 'Зачёт',
  exam: 'Экзамен',
  coursework: 'Курсовая',
  other: 'Другое',
};

const POSITIONS = [
  'ст. преподаватель',
  'ст.преподаватель',
  'старший преподаватель',
  'заведующий кафедрой',
  'зав. кафедрой',
  'зав.кафедрой',
  'профессор',
  'доцент',
  'преподаватель',
  'ассистент',
  'академик',
  'декан',
];

function decodeCol(letters: string): number {
  let n = 0;
  for (const ch of letters.toUpperCase()) {
    n = n * 26 + (ch.charCodeAt(0) - 64);
  }
  return n - 1;
}

function encodeCol(index: number): string {
  let n = index + 1;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function decodeRange(ref: string): Range {
  const [start, end = start] = ref.split(':');
  const m1 = start.match(/^([A-Z]+)(\d+)$/i);
  const m2 = end.match(/^([A-Z]+)(\d+)$/i);
  if (!m1 || !m2) throw new ScheduleParseError('Не удалось прочитать диапазон листа.');
  return {
    s: { r: Number(m1[2]) - 1, c: decodeCol(m1[1]) },
    e: { r: Number(m2[2]) - 1, c: decodeCol(m2[1]) },
  };
}

function cellAt(ws: WorkSheet, r: number, c: number): CellObject | undefined {
  return ws[`${encodeCol(c)}${r + 1}`] as CellObject | undefined;
}

function buildMergeLookup(ws: WorkSheet): MergeLookup {
  const map = new Map<string, { r: number; c: number }>();
  for (const merge of ws['!merges'] ?? []) {
    for (let r = merge.s.r; r <= merge.e.r; r++) {
      for (let c = merge.s.c; c <= merge.e.c; c++) {
        map.set(`${r}:${c}`, { r: merge.s.r, c: merge.s.c });
      }
    }
  }
  return {
    get(r, c) {
      return map.get(`${r}:${c}`) ?? null;
    },
  };
}

function cellText(cell: CellObject | undefined): string {
  if (!cell) return '';
  const v = cell.v;
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(cell.w ?? v);
  if (v instanceof Date) return '';
  return String(v);
}

function mergedText(ws: WorkSheet, r: number, c: number, merges: MergeLookup): string {
  const top = merges.get(r, c);
  if (top) return cellText(cellAt(ws, top.r, top.c));
  return cellText(cellAt(ws, r, c));
}

function isValidDateParts(y: number, m: number, d: number): boolean {
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const RU_MONTHS = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

function parseDateString(raw: string): string | null {
  const text = raw.trim().replace(/\u00a0/g, ' ');
  if (!text) return null;

  let m = text.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (m) {
    const [, y, mo, d] = m;
    return isValidDateParts(Number(y), Number(mo), Number(d))
      ? iso(Number(y), Number(mo), Number(d))
      : null;
  }

  m = text.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})/);
  if (m) {
    let [, d, mo, y] = m;
    const year = y.length === 2 ? 2000 + Number(y) : Number(y);
    return isValidDateParts(year, Number(mo), Number(d))
      ? iso(year, Number(mo), Number(d))
      : null;
  }

  m = text.match(/^(\d{1,2})\s+([а-яё]+)\s+(\d{4})/i);
  if (m) {
    const monthIndex = RU_MONTHS.indexOf(m[2].toLowerCase());
    if (monthIndex >= 0) {
      return isValidDateParts(Number(m[3]), monthIndex + 1, Number(m[1]))
        ? iso(Number(m[3]), monthIndex + 1, Number(m[1]))
        : null;
    }
  }

  return null;
}

function excelSerialToISO(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 20000 || serial > 80000) return null;
  const ms = Date.UTC(1899, 11, 30) + Math.floor(serial) * 86400000;
  const d = new Date(ms);
  return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

function cellDate(cell: CellObject | undefined): string | null {
  if (!cell || cell.v == null) return null;
  const v = cell.v;
  if (v instanceof Date) {
    return iso(v.getFullYear(), v.getMonth() + 1, v.getDate());
  }
  if (typeof v === 'number') return excelSerialToISO(v);
  if (typeof v === 'string') return parseDateString(v);
  return null;
}

function normalizeDayName(raw: string): { name: string; weekday: number } | null {
  const text = raw
    .replace(/\u00a0/g, ' ')
    .replace(/[.,:;]/g, '')
    .trim()
    .toUpperCase();
  if (!text || text.length > 20) return null;
  for (const day of DAY_NAMES) {
    if (day.re.test(text)) return { name: day.name, weekday: day.weekday };
  }
  return null;
}

function normalize(text: string): string {
  return text
    .replace(/\u00a0/g, ' ')
    .replace(/ё/gi, 'е')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function splitCellEntries(text: string): string[] {
  const normalized = text.replace(/\r/g, '').replace(/\u00a0/g, ' ').trim();
  if (!normalized) return [];

  if (/\/\s*\n/.test(normalized)) {
    return normalized
      .split(/\/\s*\n/)
      .map((part) => part.trim())
      .filter(Boolean);
  }

  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length > 1) {
    if (lines.every((line) => line.includes(';'))) return lines;
    return [lines.join(' ')];
  }

  const slashParts = normalized.split(/\s+\/\s+(?=[^;]+;)/);
  if (slashParts.length > 1 && slashParts.every((part) => part.includes(';'))) {
    return slashParts.map((part) => part.trim());
  }

  return [normalized];
}

function splitRooms(text: string): string[] {
  const normalized = text.replace(/\r/g, '').replace(/\u00a0/g, ' ').trim();
  if (!normalized) return [];
  if (/\/\s*\n/.test(normalized)) {
    return normalized
      .split(/\/\s*\n/)
      .map((part) => part.trim())
      .filter(Boolean);
  }
  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length > 1 ? lines : [normalized];
}

function parseSubgroup(text: string): Subgroup | undefined {
  const m = text.match(/([12])\s*п\s*\/?\s*гр/i) || text.match(/подгруппа\s*([12])/i);
  if (!m) return undefined;
  return Number(m[1]) === 1 ? 1 : 2;
}

function canonicalPosition(raw: string): string {
  const lower = raw.toLowerCase().replace(/\s+/g, ' ').trim();
  if (lower.startsWith('ст')) return 'ст. преподаватель';
  if (lower.startsWith('старший')) return 'старший преподаватель';
  if (lower.startsWith('зав')) return 'зав. кафедрой';
  if (lower.startsWith('профессор')) return 'профессор';
  if (lower.startsWith('доцент')) return 'доцент';
  if (lower.startsWith('преподаватель')) return 'преподаватель';
  if (lower.startsWith('ассистент')) return 'ассистент';
  if (lower.startsWith('академик')) return 'академик';
  if (lower.startsWith('декан')) return 'декан';
  return raw.trim();
}

function normalizeTeacherName(name: string): string {
  return name
    .replace(/([а-яё])([А-ЯЁ]\.)/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,])/g, '$1')
    .trim();
}

function looksLikeTeacher(text: string): boolean {
  const lower = text.toLowerCase();
  if (POSITIONS.some((position) => lower.startsWith(position))) return true;
  return /^[А-ЯЁ][а-яё-]+\s*[А-ЯЁ]\.?\s*[А-ЯЁ]?\.?$/.test(text.trim());
}

function parseTeacher(raw: string): Teacher | undefined {
  let text = raw.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return undefined;
  text = text.replace(/^[:\-–—\s]+/, '');

  let position: string | undefined;
  const sorted = [...POSITIONS].sort((a, b) => b.length - a.length);
  for (const candidate of sorted) {
    const re = new RegExp(
      `^${candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`,
      'i',
    );
    if (re.test(text)) {
      position = canonicalPosition(candidate);
      text = text.replace(re, '').trim();
      break;
    }
  }

  const name = normalizeTeacherName(text);
  if (!name && !position) return undefined;
  return {
    position,
    name: name || position || '',
    raw: raw.trim(),
  };
}

function typeFromLabel(label: string, discipline: string): { type: PairType; label: string } {
  const value = normalize(label);
  if (!value) {
    if (/проектн/.test(normalize(discipline))) return { type: 'project', label: TYPE_LABELS.project };
    return { type: 'other', label: TYPE_LABELS.other };
  }
  if (/^лекц|^лек/.test(value)) return { type: 'lecture', label: TYPE_LABELS.lecture };
  if (/^практ|^семин/.test(value)) return { type: 'practice', label: TYPE_LABELS.practice };
  if (/^лаб/.test(value)) return { type: 'lab', label: TYPE_LABELS.lab };
  if (/^консульт/.test(value)) return { type: 'consultation', label: TYPE_LABELS.consultation };
  if (/^зач/.test(value)) return { type: 'credit', label: TYPE_LABELS.credit };
  if (/^экзам/.test(value)) return { type: 'exam', label: TYPE_LABELS.exam };
  if (/^курс/.test(value)) return { type: 'coursework', label: TYPE_LABELS.coursework };
  if (/^проект/.test(value)) return { type: 'project', label: TYPE_LABELS.project };
  return { type: 'other', label: label.trim() || TYPE_LABELS.other };
}

function parseRoom(raw: string): Room | undefined {
  const text = raw.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return undefined;

  const uk = text.match(/^(.*?)\s*УК\s*№?\s*(\d+)\s*$/i);
  if (uk) {
    const number = uk[1].trim();
    return {
      number: number || undefined,
      building: uk[2],
      raw: text,
      kind: 'room',
    };
  }

  if (/^(I|II|III|IV|V|VI|VII|VIII|IX|X)$/i.test(text)) {
    return { number: text, raw: text, kind: 'hall' };
  }

  if (/с\/з|т\/з|спорт|зал/i.test(text)) {
    return { number: text, raw: text, kind: 'sport' };
  }

  return { number: text, raw: text, kind: 'room' };
}

function parseEntry(line: string, roomRaw: string | undefined): Entry {
  const normalized = line.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  const parts = normalized.split(';');
  const discipline = (parts[0] ?? '').replace(/\s+/g, ' ').trim();
  const rest = parts.slice(1).join(';').trim();

  let typePart = '';
  let teacherPart = '';

  if (rest) {
    const colon = rest.indexOf(':');
    if (colon >= 0) {
      typePart = rest.slice(0, colon).trim();
      teacherPart = rest.slice(colon + 1).trim();
    } else if (looksLikeTeacher(rest)) {
      teacherPart = rest;
    } else {
      typePart = rest;
    }
  }

  const subgroup = parseSubgroup(typePart) ?? parseSubgroup(normalized);
  const typeLabelRaw = typePart.replace(/([12])\s*п\s*\/?\s*гр/gi, '').replace(/\s+/g, ' ').trim();
  const typeInfo = typeFromLabel(typeLabelRaw, discipline);

  return {
    discipline: discipline || 'Без названия',
    type: typeInfo.type,
    typeLabel: typeInfo.label,
    rawType: typeLabelRaw || undefined,
    subgroup,
    teacher: parseTeacher(teacherPart),
    room: roomRaw ? parseRoom(roomRaw) : undefined,
  };
}

function parseEntries(classText: string, roomText: string): Entry[] {
  const lines = splitCellEntries(classText);
  const rooms = splitRooms(roomText);
  return lines.map((line, index) => {
    const room = rooms.length === lines.length ? rooms[index] : rooms[index] ?? rooms[0];
    return parseEntry(line, room);
  });
}

function parsePairRow(
  ws: WorkSheet,
  r: number,
  merges: MergeLookup,
): { pair: number; rawTime: ClockRange | null } | null {
  let text = cellText(cellAt(ws, r, 1));
  if (!text.trim()) {
    const top = merges.get(r, 1);
    if (top && top.r !== r) text = cellText(cellAt(ws, top.r, 1));
  }
  text = text.replace(/\u00a0/g, ' ').trim();
  if (!text) return null;

  const numberMatch = text.match(/^(\d{1,2})\b/);
  if (!numberMatch) return null;
  const pair = Number(numberMatch[1]);
  if (pair < 1 || pair > 9) return null;

  const timeMatch = text.match(/(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})/);
  const rawTime = timeMatch
    ? {
        start: `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`,
        end: `${timeMatch[3].padStart(2, '0')}:${timeMatch[4]}`,
      }
    : null;

  return { pair, rawTime };
}

function findGroup(ws: WorkSheet, maxRow: number, maxCol: number): string {
  for (let r = 0; r <= Math.min(maxRow, 20); r++) {
    for (let c = 0; c <= maxCol; c++) {
      const text = cellText(cellAt(ws, r, c));
      if (!text) continue;
      const m = text.match(/ГРУППА\s+([А-ЯЁA-Z0-9][А-ЯЁA-Z0-9\-–/]*)/i);
      if (m) return m[1].replace(/[.,;]+$/, '').trim();
    }
  }
  return '';
}

function findTitle(ws: WorkSheet, maxRow: number, maxCol: number): string | undefined {
  for (let r = 0; r <= Math.min(maxRow, 20); r++) {
    for (let c = 0; c <= maxCol; c++) {
      const text = cellText(cellAt(ws, r, c)).trim();
      if (text && /расписание\s+занятий/i.test(text)) return text;
    }
  }
  return undefined;
}

function parseSheet(ws: WorkSheet, sheetName: string, fileName: string): Schedule {
  if (!ws['!ref']) throw new ScheduleParseError('Лист пустой.');
  const range = decodeRange(ws['!ref']);
  const maxRow = Math.min(range.e.r, 3000);
  const maxCol = Math.min(range.e.c, 60);
  const merges = buildMergeLookup(ws);

  const dateCells: DateCell[] = [];
  for (let r = 0; r <= Math.min(maxRow, 60); r++) {
    for (let c = 0; c <= maxCol; c++) {
      const date = cellDate(cellAt(ws, r, c));
      if (date) dateCells.push({ r, c, date, value: cellText(cellAt(ws, r, c)) });
    }
  }

  if (dateCells.length === 0) {
    throw new ScheduleParseError('В таблице не найдены даты занятий.');
  }

  const countByCol = new Map<number, number>();
  for (const item of dateCells) countByCol.set(item.c, (countByCol.get(item.c) ?? 0) + 1);
  let dateCols = [...countByCol.entries()]
    .filter(([, count]) => count >= 2)
    .map(([c]) => c)
    .sort((a, b) => a - b);
  if (dateCols.length < 2) {
    dateCols = [...countByCol.keys()].sort((a, b) => a - b);
  }
  if (dateCols.length === 0) {
    throw new ScheduleParseError('Не удалось определить колонки с датами.');
  }

  const rowCounts = new Map<number, number>();
  for (const item of dateCells) rowCounts.set(item.r, (rowCounts.get(item.r) ?? 0) + 1);
  const globalHeaderRow = [...rowCounts.entries()]
    .filter(([, count]) => count >= Math.min(3, dateCols.length))
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0];
  if (globalHeaderRow == null) {
    throw new ScheduleParseError('Не найдена строка с датами недель.');
  }

  const dateAt = (r: number, c: number): string | null => {
    const found = dateCells.find((item) => item.r === r && item.c === c);
    return found?.date ?? null;
  };

  const dayBlocks: DayBlock[] = [];
  for (let r = 0; r <= maxRow; r++) {
    const raw = cellText(cellAt(ws, r, 0));
    if (!raw.trim()) continue;
    const day = normalizeDayName(raw);
    if (!day) continue;
    const previous = dayBlocks[dayBlocks.length - 1];
    if (previous && previous.name === day.name && r < previous.startRow + 10) continue;
    dayBlocks.push({ startRow: r, endRow: maxRow, name: day.name, weekday: day.weekday });
  }

  if (dayBlocks.length === 0) {
    throw new ScheduleParseError('В таблице не найдены дни недели (понедельник, вторник…).');
  }

  for (let i = 0; i < dayBlocks.length; i++) {
    dayBlocks[i].endRow = i + 1 < dayBlocks.length ? dayBlocks[i + 1].startRow - 1 : maxRow;
  }

  const warnings = new Set<string>();
  const weeksMap = new Map<string, Map<string, Day>>();
  let totalSlots = 0;
  let totalEntries = 0;
  let daysWithClasses = 0;

  const dateColSet = new Set(dateCols);

  /**
   * У каждого дня своя строка с датами. Обычно она совпадает со строкой названия
   * дня, но в старом формате ИТ-52б даты стоят на строку выше. Ищем её рядом
   * с блоком, чтобы не подставлять даты соседнего дня.
   */
  const findBlockHeaderRow = (block: DayBlock): number => {
    const candidates = [
      block.startRow,
      block.startRow - 1,
      block.startRow - 2,
      block.startRow + 1,
      block.startRow + 2,
    ];
    let bestRow: number | null = null;
    let bestCount = 0;
    for (const r of candidates) {
      if (r < 0) continue;
      const count = dateCells.filter((item) => item.r === r && dateColSet.has(item.c)).length;
      if (count > bestCount) {
        bestCount = count;
        bestRow = r;
      }
    }
    return bestRow ?? globalHeaderRow;
  };

  for (const block of dayBlocks) {
    const headerRow = findBlockHeaderRow(block);

    const pairRows: Array<{ row: number; pair: number; rawTime: ClockRange | null }> = [];
    for (let r = block.startRow; r <= block.endRow; r++) {
      const parsed = parsePairRow(ws, r, merges);
      if (parsed) pairRows.push({ row: r, ...parsed });
      if (pairRows.length > 12) break;
    }

    for (const col of dateCols) {
      const date = dateAt(headerRow, col);
      if (!date) continue;

      const dayKey = mondayOf(date);
      if (!weeksMap.has(dayKey)) weeksMap.set(dayKey, new Map());

      let holiday = false;
      let vacation = false;
      let holidayNote = '';
      const slots: Slot[] = [];

      for (const pairRow of pairRows) {
        const classText = mergedText(ws, pairRow.row, col, merges).trim();
        const roomText = mergedText(ws, pairRow.row, col + 1, merges).trim();
        if (!classText) {
          if (roomText) warnings.add(`Аудитория без пары: ${sheetName}, ${date}, ${pairRow.pair} пара.`);
          continue;
        }

        const lower = normalize(classText);
        if (/праздничн/.test(lower)) {
          holiday = true;
          holidayNote = classText.trim();
          continue;
        }
        if (/каникул/.test(lower)) {
          vacation = true;
          holidayNote = classText.trim();
          continue;
        }
        if (/самоподготовк/.test(lower)) {
          const time = resolveTime(date, pairRow.pair, pairRow.rawTime, true);
          slots.push({
            pair: pairRow.pair,
            timeRaw: pairRow.rawTime,
            time,
            kind: 'self-study',
            entries: [],
            note: classText.trim(),
          });
          continue;
        }

        const entries = parseEntries(classText, roomText);
        if (entries.some((entry) => !entry.room)) {
          warnings.add(`Не указана аудитория: ${date}, ${pairRow.pair} пара.`);
        }
        const time = resolveTime(date, pairRow.pair, pairRow.rawTime, true);
        slots.push({
          pair: pairRow.pair,
          timeRaw: pairRow.rawTime,
          time,
          kind: 'class',
          entries,
        });
      }

      slots.sort((a, b) => a.pair - b.pair);

      let kind: DayKind = 'empty';
      if (holiday) kind = 'holiday';
      else if (vacation) kind = 'vacation';
      else if (slots.some((slot) => slot.kind === 'class')) kind = 'classes';
      else if (slots.some((slot) => slot.kind === 'self-study')) kind = 'self-study';

      const day: Day = {
        date,
        weekday: weekday(date),
        name: block.name,
        kind,
        note: holidayNote || undefined,
        slots,
      };

      if (kind === 'classes') {
        daysWithClasses++;
        totalSlots += slots.filter((slot) => slot.kind === 'class').length;
        totalEntries += slots.reduce((sum, slot) => sum + slot.entries.length, 0);
      }

      weeksMap.get(dayKey)!.set(date, day);
    }
  }

  if (weeksMap.size === 0) {
    throw new ScheduleParseError('Не удалось собрать ни одной недели расписания.');
  }

  const weeks: Week[] = [...weeksMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([startDate, daysMap], index) => {
      const days = [...daysMap.values()].sort((a, b) => a.date.localeCompare(b.date));
      const endDate = days[days.length - 1]?.date ?? startDate;
      const academicWeek = academicWeekNumber(startDate);
      return {
        index: index + 1,
        startDate,
        endDate,
        academicWeek,
        parity: parityForWeek(startDate),
        days,
      };
    });

  const allDates = weeks.flatMap((week) => week.days.map((day) => day.date));
  const period = allDates.length
    ? { start: allDates[0], end: allDates[allDates.length - 1] }
    : null;

  const title = findTitle(ws, maxRow, maxCol);
  let group = findGroup(ws, maxRow, maxCol);
  if (!group) {
    const fileMatch = fileName.match(/([А-ЯЁA-Z]{2,5}[-–]\d{2}[а-яa-z]?)/i);
    if (fileMatch) group = fileMatch[1];
  }
  if (!group) {
    group = 'Группа';
    warnings.add('Не удалось определить номер группы — проверьте название файла.');
  }

  const courseMatch = title?.match(/группы\s+(\d)\s*курса/i);
  const facultyMatch = title?.match(/курса\s+([А-ЯЁа-яё]+)\s+на\s+/);
  const specialtyMatch = title?.match(/по\s+специальности\s+([\d.]+)\s+"([^"]+)"/i);

  if (weeks.length < 2) {
    warnings.add('В файле найдена только одна неделя — проверьте, что это не обрезанная таблица.');
  }
  if (weeks.some((week) => week.days.length < 5)) {
    warnings.add('В некоторых неделях меньше пяти учебных дней — возможно, часть таблицы пустая.');
  }

  return {
    schemaVersion: 1,
    source: {
      fileName,
      group,
      title,
      faculty: facultyMatch?.[1],
      course: courseMatch?.[1],
      specialty: specialtyMatch ? `${specialtyMatch[1]} «${specialtyMatch[2]}»` : undefined,
      period,
      sheetName,
      importedAt: new Date().toISOString(),
    },
    meta: {
      timePresets: TIME_PRESETS,
      weekCount: weeks.length,
      dayCount: weeks.reduce((sum, week) => sum + week.days.length, 0),
    },
    stats: {
      weeks: weeks.length,
      days: weeks.reduce((sum, week) => sum + week.days.length, 0),
      daysWithClasses,
      slots: totalSlots,
      entries: totalEntries,
    },
    weeks,
    warnings: [...warnings].slice(0, 25),
  };
}

export interface ParseOptions {
  fileName?: string;
}

/**
 * Превращает книгу XLSX в нормализованное расписание.
 * Если на листе несколько расписаний, выбирается лист с наибольшим числом дней.
 */
export function parseWorkbook(wb: WorkBook, options: ParseOptions = {}): Schedule {
  const fileName = options.fileName || 'schedule.xlsx';
  const errors: string[] = [];
  let best: Schedule | null = null;

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws || !ws['!ref']) continue;
    try {
      const schedule = parseSheet(ws, sheetName, fileName);
      if (
        !best ||
        schedule.stats.days > best.stats.days ||
        (schedule.stats.days === best.stats.days && schedule.stats.entries > best.stats.entries)
      ) {
        best = schedule;
      }
    } catch (error) {
      errors.push(`${sheetName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (!best) {
    throw new ScheduleParseError(
      `Не удалось распознать расписание. Проверьте, что это XLSX с таблицей пар. ${
        errors.length ? `\n${errors.join('\n')}` : ''
      }`,
    );
  }

  if (wb.SheetNames.length > 1) {
    best.warnings.push(`В файле ${wb.SheetNames.length} листов — выбран «${best.source.sheetName}».`);
  }

  return best;
}
