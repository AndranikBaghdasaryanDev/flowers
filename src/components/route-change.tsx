"use client";

import { usePathname } from "next/navigation";
import { Suspense, useEffect, useEffectEvent, useRef, type ReactNode } from "react";

function Listener({ onChange }: { onChange: (pathname: string) => void }) {
  const pathname = usePathname();
  const first = useRef(true);
  const notify = useEffectEvent((p: string) => onChange(p));
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    notify(pathname);
  }, [pathname]);
  return null;
}

/**
 * Calls `onChange` after client-side navigation. The pathname read is isolated in its
 * own Suspense boundary so it never blocks the prerendered shell (Cache Components).
 */
export function RouteChangeListener({ onChange }: { onChange: (pathname: string) => void }) {
  return (
    <Suspense fallback={null}>
      <Listener onChange={onChange} />
    </Suspense>
  );
}

function PathAware({ children }: { children: (pathname: string) => ReactNode }) {
  return <>{children(usePathname())}</>;
}

/** Renders pathname-dependent UI with a pathname-independent fallback. */
export function WithPathname({ children, fallback }: { children: (pathname: string) => ReactNode; fallback: ReactNode }) {
  return (
    <Suspense fallback={fallback}>
      <PathAware>{children}</PathAware>
    </Suspense>
  );
}
