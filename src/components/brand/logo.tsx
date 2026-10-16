import Image from "next/image";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/cn";

/**
 * The single source of the Floriani brand mark. Replace the temporary wordmark with the
 * real logo by setting `brand.logo` in src/lib/brand.ts.
 */
export function Logo({
  className,
  tone = "brand",
  size = "md",
  href = "/",
}: {
  className?: string;
  tone?: "brand" | "light" | "dark";
  size?: "sm" | "md" | "lg";
  href?: string | null;
}) {
  const mark = brand.logo ? (
    <Image src={brand.logo.src} width={brand.logo.width} height={brand.logo.height} alt={brand.logo.alt} priority className="h-auto w-auto" />
  ) : (
    <Wordmark tone={tone} size={size} />
  );
  if (!href) return <span className={className ?? "inline-flex"}>{mark}</span>;
  return (
    <Link href={href} className={cn("rounded-md", className ?? "inline-flex")} aria-label={`${brand.name} — home`}>
      {mark}
    </Link>
  );
}

function Wordmark({ tone, size }: { tone: "brand" | "light" | "dark"; size: "sm" | "md" | "lg" }) {
  const color = tone === "light" ? "text-ivory" : tone === "dark" ? "text-ink" : "text-brand";
  const word = size === "lg" ? "text-[2.6rem]" : size === "sm" ? "text-[1.35rem]" : "text-[1.75rem]";
  const sub = size === "lg" ? "text-[0.7rem] tracking-[0.62em]" : size === "sm" ? "text-[0.5rem] tracking-[0.5em]" : "text-[0.56rem] tracking-[0.58em]";
  return (
    <span className={cn("flex flex-col items-center leading-none", color)} aria-hidden="true">
      <span className={cn("font-display font-medium tracking-[0.2em]", word)} style={{ marginRight: "-0.2em" }}>
        {brand.wordmark}
      </span>
      <span className={cn("mt-1 flex items-center gap-2 font-sans font-semibold uppercase opacity-80", sub)}>
        <span className="h-px w-3 bg-current opacity-50" />
        <span style={{ marginRight: "-0.55em" }}>{brand.descriptor}</span>
        <span className="h-px w-3 bg-current opacity-50" />
      </span>
    </span>
  );
}
