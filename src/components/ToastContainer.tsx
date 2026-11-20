import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useBudget } from '../context/BudgetContext';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useBudget();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-3 inset-x-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none safe-top">
      {toasts.map((toast) => {
        const icon =
          toast.tone === 'error' ? (
            <AlertCircle className="w-4 h-4 text-[#FB7185] shrink-0" />
          ) : toast.tone === 'info' ? (
            <Info className="w-4 h-4 text-sky-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          );

        return (
          <div
            key={toast.id}
            className="animate-toast pointer-events-auto flex items-center gap-2.5 max-w-md w-full sm:w-auto px-4 py-3 rounded-full bg-[#121722]/95 dark:bg-[#182030]/95 text-white shadow-[0_12px_32px_rgba(0,0,0,0.35)] border border-white/10 backdrop-blur-2xl text-xs sm:text-sm font-semibold"
          >
            {icon}
            <span className="flex-1">{toast.text}</span>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="סגור הודעה"
              className="pressable p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
