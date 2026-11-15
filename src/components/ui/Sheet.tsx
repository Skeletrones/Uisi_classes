import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  variant?: 'default' | 'tall';
  closeLabel?: string;
}

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  variant = 'default',
  closeLabel = 'Закрыть',
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => panelRef.current?.focus(), 40);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(timer);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="sheet-portal">
      <button className="sheet-backdrop" aria-label={closeLabel} onClick={onClose} />
      <div
        className={`sheet sheet--${variant}`}
        role="dialog"
        aria-modal="true"
        aria-label={title || closeLabel}
        tabIndex={-1}
        ref={panelRef}
      >
        <div className="sheet__handle" aria-hidden="true" />
        <header className="sheet__header">
          <div>
            {title ? <h2 className="sheet__title">{title}</h2> : null}
            {subtitle ? <p className="sheet__subtitle">{subtitle}</p> : null}
          </div>
          <button className="icon-button icon-button--ghost" onClick={onClose} aria-label={closeLabel}>
            <X size={20} />
          </button>
        </header>
        <div className="sheet__content">{children}</div>
        {footer ? <footer className="sheet__footer">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}
