"use client";

import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/form";
import { cn } from "@/lib/cn";
import { useT } from "@/i18n/client";

export function PasswordInput(props: ComponentProps<typeof Input>) {
  const t = useT();
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={cn("pr-12", props.className)} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-1.5 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted hover:bg-cream hover:text-ink"
        aria-label={visible ? t("auth.hidePassword") : t("auth.showPassword")}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
      </button>
    </div>
  );
}

/** Lightweight strength estimate for feedback only; the server enforces the actual rules. */
export function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3 | 4 } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)) score = Math.min(score, 1);
  return { score: score as 0 | 1 | 2 | 3 | 4 };
}

export function StrengthMeter({ password }: { password: string }) {
  const t = useT();
  const { score } = passwordStrength(password);
  if (!password) return <p className="text-[13px] text-ink-muted">{t("auth.passwordRule")}</p>;
  const label = t(`auth.strength.s${score}`);
  const color = score <= 1 ? "bg-danger" : score === 2 ? "bg-warning" : "bg-success";
  return (
    <div aria-live="polite">
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= score ? color : "bg-line")} />
        ))}
      </div>
      <p className="mt-1.5 text-[13px] text-ink-muted">{t("auth.strengthLabel", { label })}</p>
    </div>
  );
}
