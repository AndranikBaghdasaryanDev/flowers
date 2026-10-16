"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLocalizePath, useT } from "@/i18n/client";

type ToastTone = "success" | "error" | "info";
type Toast = { id: number; tone: ToastTone; title: string; description?: string; action?: { label: string; href: string } };

type ToastApi = {
  show: (t: Omit<Toast, "id">) => void;
  success: (title: string, description?: string, action?: Toast["action"]) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const tr = useT();
  const lp = useLocalizePath();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((ts) => ts.filter((t) => t.id !== id)), []);
  const show = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = nextId.current++;
      setToasts((ts) => [...ts.slice(-2), { ...t, id }]);
      window.setTimeout(() => dismiss(id), t.tone === "error" ? 7000 : 4500);
    },
    [dismiss],
  );
  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (title, description, action) => show({ tone: "success", title, description, action }),
      error: (title, description) => show({ tone: "error", title, description }),
      info: (title, description) => show({ tone: "info", title, description }),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:bottom-4 sm:items-end sm:px-6"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm animate-fade-up items-start gap-3 rounded-2xl border bg-paper p-4 shadow-lift",
              t.tone === "error" ? "border-danger/25" : "border-line",
            )}
          >
            <span className={cn("mt-0.5", t.tone === "success" ? "text-success" : t.tone === "error" ? "text-danger" : "text-info")}>
              {t.tone === "success" ? <CheckCircle2 className="h-5 w-5" /> : t.tone === "error" ? <AlertCircle className="h-5 w-5" /> : <Info className="h-5 w-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{t.title}</p>
              {t.description && <p className="mt-0.5 text-[13px] leading-relaxed text-ink-muted">{t.description}</p>}
              {t.action && (
                <a href={lp(t.action.href)} className="mt-2 inline-block text-[13px] font-semibold text-brand hover:underline">
                  {t.action.label}
                </a>
              )}
            </div>
            <button type="button" onClick={() => dismiss(t.id)} className="-m-1 rounded-full p-1 text-ink-muted hover:bg-cream hover:text-ink" aria-label={tr("common.dismiss")}>
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
