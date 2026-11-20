import React from 'react';
import { useToastStore } from '../store/useToastStore';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle, X } from 'lucide-react';
import clsx from 'clsx';

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none w-full max-w-sm px-4">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            className={clsx(
              "pointer-events-auto flex items-start gap-3 px-4 py-3.5 rounded-xl shadow-2xl border backdrop-blur-md w-full",
              t.type === 'error' ? "bg-red-950/80 border-red-700/50 text-red-100" : "bg-emerald-950/80 border-emerald-700/50 text-emerald-100"
            )}
          >
            {t.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-sm font-medium leading-tight pt-0.5">{t.message}</div>
            <button onClick={() => removeToast(t.id)} className="hover:opacity-70 transition shrink-0 p-1 -mr-2 -mt-1 bg-black/20 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
