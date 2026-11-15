export function plural(count: number, one: string, few: string, many: string): string {
  const abs = Math.abs(count) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

export function pairWord(count: number): string {
  return plural(count, 'пара', 'пары', 'пар');
}

export function dayWord(count: number): string {
  return plural(count, 'день', 'дня', 'дней');
}

export function weekWord(count: number): string {
  return plural(count, 'неделя', 'недели', 'недель');
}

export function eventWord(count: number): string {
  return plural(count, 'дело', 'дела', 'дел');
}

export function classCountLabel(count: number): string {
  return `${count} ${pairWord(count)}`;
}
