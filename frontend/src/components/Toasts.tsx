import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { useToastStore } from '@/stores/toastStore';
import { cn } from '@/utils/cn';

const icons = {
  error: AlertCircle,
  success: CheckCircle,
  info: Info,
};

const colors = {
  error: 'border-red-500/30 bg-red-500/10 text-red-200',
  success: 'border-green-500/30 bg-green-500/10 text-green-200',
  info: 'border-primary/30 bg-primary/10 text-foreground',
};

const colorsDark = {
  error: 'dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200',
  success: 'dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-200',
  info: 'dark:border-primary/30 dark:bg-primary/10 dark:text-foreground',
};

const colorsLight = {
  error: 'border-red-200 bg-red-50 text-red-800',
  success: 'border-green-200 bg-green-50 text-green-800',
  info: 'border-border bg-card text-foreground',
};

export function Toasts() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = icons[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={cn(
                'flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg',
                colorsLight[toast.type],
                colorsDark[toast.type],
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm flex-1">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 opacity-60 hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
