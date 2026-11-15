import { useEffect, useState } from 'react';
import type { ThemeMode } from '../lib/types';

function resolveTheme(mode: ThemeMode): 'dark' | 'light' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return mode;
}

export function useTheme(mode: ThemeMode): 'dark' | 'light' {
  const [resolved, setResolved] = useState<'dark' | 'light'>(() => resolveTheme(mode));

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const apply = () => {
      const next = resolveTheme(mode);
      setResolved(next);
      document.documentElement.dataset.theme = next;
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', next === 'dark' ? '#0f1115' : '#f3f5fa');
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [mode]);

  return resolved;
}
