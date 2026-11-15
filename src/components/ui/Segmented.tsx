import type { ReactNode } from 'react';

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: ReactNode;
  hint?: string;
}

interface SegmentedProps<T extends string | number> {
  options: Array<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: 'sm' | 'md';
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  size = 'md',
}: SegmentedProps<T>) {
  return (
    <div className={`segmented segmented--${size}`} role="radiogroup" aria-label={ariaLabel}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={active}
            className={`segmented__item${active ? ' is-active' : ''}`}
            onClick={() => onChange(option.value)}
            title={option.hint}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
