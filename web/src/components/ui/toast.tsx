"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from "lucide-react";

export type ToastVariant = "success" | "warning" | "error" | "info";

export interface ToastProps {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  onDismiss: (id: string) => void;
}

const variantConfig: Record<ToastVariant, { icon: typeof Info; color: string; border: string }> = {
  success: { icon: CheckCircle, color: "var(--color-success)", border: "var(--color-success)" },
  warning: { icon: AlertTriangle, color: "var(--color-warning)", border: "var(--color-warning)" },
  error: { icon: AlertCircle, color: "var(--color-error)", border: "var(--color-error)" },
  info: { icon: Info, color: "var(--color-info)", border: "var(--color-info)" },
};

export function Toast({ id, title, description, variant = "info", duration = 5000, onDismiss }: ToastProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;
  const [progress, setProgress] = React.useState(100);

  React.useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onDismiss(id);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [id, duration, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.96 }}
      transition={{ duration: 0.24, ease: [0, 0, 0.2, 1] }}
      className={[
        "relative w-[360px] max-w-[92vw] rounded-[var(--radius-lg)]",
        "bg-[var(--color-bg-elevated)] shadow-[var(--shadow-elevated)]",
        "border border-[var(--color-border)] overflow-hidden",
        "flex items-start gap-3 p-4",
      ].join(" ")}
      style={{ borderLeftWidth: "3px", borderLeftColor: config.border }}
    >
      <Icon className="w-5 h-5 shrink-0 mt-0.5" style={{ color: config.color }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">{title}</p>
        {description && (
          <p className="text-xs text-[var(--color-text-secondary)] mt-1 leading-relaxed">{description}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(id)}
        className="shrink-0 p-1 rounded-[var(--radius-sm)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)] transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--color-border-subtle)]">
        <motion.div
          className="h-full"
          style={{ backgroundColor: config.color }}
          initial={{ width: "100%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.05, ease: "linear" }}
        />
      </div>
    </motion.div>
  );
}

// Toast container and context
interface ToastContextValue {
  addToast: (toast: Omit<ToastProps, "id" | "onDismiss">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Array<ToastProps & { id: string }>>([]);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = React.useCallback((toast: Omit<ToastProps, "id" | "onDismiss">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id, onDismiss: removeToast }]);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
        <AnimatePresence>
          {toasts.map((toast) => (
            <Toast key={toast.id} {...toast} onDismiss={removeToast} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
