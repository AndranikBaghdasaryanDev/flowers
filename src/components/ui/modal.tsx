"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useT } from "@/i18n/client";

/**
 * Accessible modal built on the native <dialog> element (focus trapping, Escape
 * and inert background come from the browser). `side` renders it as a drawer.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  side,
  size = "md",
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  side?: "left" | "right";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.documentElement.style.overflow = "hidden";
    }
    if (!open && dialog.open) dialog.close();
    return () => {
      // Also runs when the route is hidden by client navigation.
      if (dialog.open) dialog.close();
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) document.documentElement.style.overflow = "";
  }, [open]);

  const width = { sm: "sm:max-w-md", md: "sm:max-w-lg", lg: "sm:max-w-2xl", xl: "sm:max-w-4xl" }[size];

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-0 max-h-none max-w-none bg-transparent p-0 text-ink backdrop:bg-ink/40 backdrop:backdrop-blur-[2px] open:backdrop:animate-fade-in",
        side
          ? cn("fixed inset-y-0 h-dvh w-full sm:w-[440px]", side === "right" ? "left-auto right-0" : "left-0 right-auto")
          : "fixed inset-0 h-dvh w-full items-end justify-center open:flex sm:items-center",
      )}
    >
      {open && (
        <div
          className={cn(
            "relative flex flex-col bg-ivory shadow-2xl",
            side
              ? cn("h-full w-full", side === "right" ? "animate-slide-in-right" : "animate-slide-in-left")
              : cn("max-h-[92dvh] w-full animate-fade-up rounded-t-[1.75rem] sm:rounded-[1.75rem]", width),
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <h2 id={titleId} className="font-display text-2xl leading-tight text-ink">
                {title}
              </h2>
              {description && (
                <p id={descId} className="mt-1 text-sm text-ink-muted">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="-mr-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cream hover:text-ink"
              aria-label={t("common.close")}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">{children}</div>
          {footer && <div className="border-t border-line bg-paper/60 px-5 py-4 sm:px-6">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

/** Confirmation dialog for destructive or consequential actions. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  tone = "danger",
  loading,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  tone?: "danger" | "primary";
  loading?: boolean;
  children?: ReactNode;
}) {
  const t = useT();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="h-11 rounded-full px-5 text-sm font-semibold text-ink hover:bg-cream">
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold text-white disabled:opacity-60",
              tone === "danger" ? "bg-danger hover:bg-[#8c1c17]" : "bg-brand hover:bg-brand-hover",
            )}
          >
            {loading ? t("common.working") : (confirmLabel ?? t("common.confirm"))}
          </button>
        </div>
      }
    >
      {description && <div className="text-sm leading-relaxed text-ink-soft">{description}</div>}
      {children}
    </Modal>
  );
}
