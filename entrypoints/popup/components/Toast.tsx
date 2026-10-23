import { AlertCircle, CheckCircle2 } from 'lucide-react';

export interface ToastState {
  id: number;
  message: string;
  tone: 'success' | 'error';
}

interface ToastProps {
  toast: ToastState;
}

export function Toast({ toast }: ToastProps) {
  const Icon = toast.tone === 'success' ? CheckCircle2 : AlertCircle;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex justify-center px-4">
      <div
        key={toast.id}
        className={`animate-rise-in flex max-w-full items-center gap-2 rounded-full px-3.5 py-2 text-[11px] font-medium text-white shadow-lg ${
          toast.tone === 'success' ? 'bg-stone-900' : 'bg-rose-600'
        }`}
        role="status"
      >
        <Icon className="h-3.5 w-3.5 shrink-0 text-brand-300" />
        <span className="truncate">{toast.message}</span>
      </div>
    </div>
  );
}
