#!/usr/bin/env node
/**
 * Конвертер XLSX → JSON для ПК.
 *
 *   npm run convert -- "путь/к/расписанию.xlsx"
 *   npm run convert -- input.xlsx -o output.json
 *   npm run convert -- input.xlsx --pretty=false
 */
import { existsSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import XLSX from 'xlsx';
import { parseWorkbook } from '../src/lib/parser.ts';

interface CliOptions {
  input?: string;
  output?: string;
  pretty: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { pretty: true };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-o' || arg === '--output') {
      options.output = argv[++i];
    } else if (arg.startsWith('--output=')) {
      options.output = arg.slice('--output='.length);
    } else if (arg === '--pretty=false') {
      options.pretty = false;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (!arg.startsWith('-') && !options.input) {
      options.input = arg;
    }
  }
  return options;
}

function printHelp(): void {
  console.log(`
Конвертер расписания УрТИСИ: XLSX → JSON

Использование:
  npm run convert -- "Расписание.xlsx"
  npm run convert -- "Расписание.xlsx" -o schedule.json
  npm run convert -- "Расписание.xlsx" --pretty=false

Без -o файл сохраняется рядом с исходником и называется <имя>.json.
`.trim());
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  if (!options.input) {
    printHelp();
    process.exitCode = 1;
    return;
  }

  const input = resolve(options.input);
  if (!existsSync(input) || !statSync(input).isFile()) {
    throw new Error(`Файл не найден: ${input}`);
  }
  if (!['.xlsx', '.xlsm', '.xls'].includes(extname(input).toLowerCase())) {
    throw new Error('Поддерживаются только файлы .xlsx, .xlsm и .xls');
  }

  const output = options.output
    ? resolve(options.output)
    : join(dirname(input), `${basename(input, extname(input))}.json`);

  const workbook = XLSX.readFile(input, { cellDates: false });
  const schedule = parseWorkbook(workbook, { fileName: basename(input) });
  const json = options.pretty ? JSON.stringify(schedule, null, 2) : JSON.stringify(schedule);
  writeFileSync(output, json, 'utf8');

  console.log('');
  console.log(`Готово: ${output}`);
  console.log(`Группа: ${schedule.source.group}`);
  if (schedule.source.period) {
    console.log(`Период: ${schedule.source.period.start} — ${schedule.source.period.end}`);
  }
  console.log(
    `Недель: ${schedule.stats.weeks}, дней: ${schedule.stats.days}, пар: ${schedule.stats.slots}, занятий: ${schedule.stats.entries}`,
  );
  if (schedule.warnings.length) {
    console.log('');
    console.log('Предупреждения:');
    for (const warning of schedule.warnings) console.log(`  • ${warning}`);
  }
  console.log('');
}

try {
  main();
} catch (error) {
  console.error('');
  console.error(`Ошибка: ${error instanceof Error ? error.message : String(error)}`);
  console.error('');
  process.exitCode = 1;
}
