import { useEffect } from 'react';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export interface ToastState {
  id: number;
  message: string;
  tone?: 'success' | 'info' | 'error';
}

const ICONS = {
  success: CheckCircle2,
  info: Info,
  error: AlertTriangle,
};

export function Toast({ toast, onClose }: { toast: ToastState | null; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(onClose, 3800);
    return () => window.clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;
  const Icon = ICONS[toast.tone ?? 'info'];

  return (
    <div className={`toast toast--${toast.tone ?? 'info'}`} role="status" aria-live="polite" key={toast.id}>
      <Icon size={18} />
      <span className="toast__message">{toast.message}</span>
      <button className="toast__close" onClick={onClose} aria-label="Скрыть уведомление">
        <X size={15} />
      </button>
    </div>
  );
}
