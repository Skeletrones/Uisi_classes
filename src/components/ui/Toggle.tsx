import type { ReactNode } from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  icon?: ReactNode;
}

export function Toggle({ checked, onChange, label, description, icon }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className="toggle-row"
      onClick={() => onChange(!checked)}
    >
      {icon ? <span className="toggle-row__icon">{icon}</span> : null}
      <span className="toggle-row__text">
        <span className="toggle-row__label">{label}</span>
        {description ? <span className="toggle-row__description">{description}</span> : null}
      </span>
      <span className={`switch${checked ? ' is-on' : ''}`} aria-hidden="true">
        <span className="switch__thumb" />
      </span>
    </button>
  );
}
