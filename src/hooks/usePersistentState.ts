import { useCallback, useEffect, useRef, useState } from 'react';

export function usePersistentState<T>(
  key: string,
  initial: T,
  merge?: (stored: unknown, fallback: T) => T,
): [T, (value: T | ((current: T) => T)) => void] {
  const initialRef = useRef(initial);

  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        return merge ? merge(parsed, initialRef.current) : (parsed as T);
      }
    } catch {
      // повреждённые данные не должны ломать приложение
    }
    return initialRef.current;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // приватный режим / переполнение — приложение продолжает работать в памяти
    }
  }, [key, value]);

  const update = useCallback((next: T | ((current: T) => T)) => {
    setValue((current) => (typeof next === 'function' ? (next as (value: T) => T)(current) : next));
  }, []);

  return [value, update];
}
