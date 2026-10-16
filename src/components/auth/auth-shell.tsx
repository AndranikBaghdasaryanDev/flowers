import type { ReactNode } from "react";

/** Centered card layout shared by sign-in, registration and password pages. */
export function AuthShell({ title, description, children, footer }: { title: string; description?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="relative overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 top-10 h-[420px] w-[420px] rounded-full bg-brand-100/50 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 bottom-0 h-[380px] w-[380px] rounded-full bg-sage-100/60 blur-3xl" />
      <div className="container-page relative flex justify-center py-12 sm:py-20">
        <div className="w-full max-w-md">
          <div className="text-center">
            <h1 className="font-display text-[2.6rem] leading-tight text-ink">{title}</h1>
            {description && <div className="mt-2 text-[15px] text-ink-soft">{description}</div>}
          </div>
          <div className="mt-8 rounded-[1.75rem] border border-line bg-paper p-6 shadow-soft sm:p-8">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-ink-soft">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
