import { AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Delete',
  busy = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-stone-900/30 p-5 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="animate-rise-in w-full rounded-[20px] border border-white/70 bg-[#fdfcf9] p-4 shadow-pop"
      >
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-500 ring-1 ring-rose-100">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2
              id="confirm-title"
              className="text-[13px] font-semibold text-stone-900"
            >
              {title}
            </h2>
            <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
              {description}
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className="h-9 flex-1 rounded-xl border border-stone-200 bg-white text-[11.5px] font-medium text-stone-600 transition hover:bg-stone-50"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-600 text-[11.5px] font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {busy ? 'Deleting...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
