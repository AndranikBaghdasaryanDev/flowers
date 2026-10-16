import { Link } from "@/i18n/client";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "@/components/ui/spinner";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "soft" | "danger" | "link";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold tracking-[0.01em] transition-[background-color,color,border-color,box-shadow,transform] duration-200 ease-out select-none disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white shadow-[0_8px_20px_-10px_rgb(120_18_65/0.6)] hover:bg-brand-hover active:bg-brand-active",
  secondary: "bg-ink text-ivory hover:bg-brand-900",
  outline: "border border-line-strong bg-transparent text-ink hover:border-brand hover:text-brand",
  ghost: "bg-transparent text-ink hover:bg-cream",
  soft: "bg-brand-50 text-brand hover:bg-brand-100",
  danger: "bg-danger text-white hover:bg-[#8c1c17]",
  link: "bg-transparent px-0 text-brand underline-offset-4 hover:underline active:scale-100",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 rounded-full px-4 text-[13px]",
  md: "h-11 rounded-full px-5 text-sm",
  lg: "h-13 rounded-full px-7 text-[15px]",
  icon: "h-11 w-11 rounded-full",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(base, variants[variant], variant === "link" ? "h-auto" : sizes[size], className);
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: string;
  icon?: ReactNode;
};

export function Button({ variant = "primary", size = "md", loading, loadingText, icon, className, children, disabled, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner className="h-4 w-4" /> : icon}
      {loading && loadingText ? loadingText : children}
    </button>
  );
}

type LinkButtonProps = ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize; icon?: ReactNode };

export function LinkButton({ variant = "primary", size = "md", icon, className, children, ...props }: LinkButtonProps) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...props}>
      {icon}
      {children}
    </Link>
  );
}
