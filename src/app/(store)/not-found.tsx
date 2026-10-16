import { Flower2 } from "lucide-react";
import { LinkButton } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center py-24 text-center sm:py-32">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand">
        <Flower2 className="h-7 w-7" />
      </span>
      <p className="eyebrow mt-6">Page not found</p>
      <h1 className="mt-3 max-w-xl font-display text-[2.6rem] leading-tight text-ink sm:text-5xl">This page has drifted away like a petal</h1>
      <p className="mt-4 max-w-md text-ink-soft">The link may be outdated or the product is no longer available.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <LinkButton href="/shop">Shop flowers</LinkButton>
        <LinkButton href="/" variant="outline">
          Back to home
        </LinkButton>
      </div>
    </div>
  );
}
