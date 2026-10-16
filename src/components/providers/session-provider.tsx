"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import type { Role } from "@/lib/domain/roles";

export type ClientUser = { id: string; email: string; name: string; phone: string; role: Role; isStaff: boolean; emailVerified: boolean };

type SessionState = {
  status: "loading" | "ready";
  user: ClientUser | null;
  favorites: Set<string>;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  toggleFavorite: (productId: string) => Promise<boolean | null>;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [user, setUser] = useState<ClientUser | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const router = useRouter();

  const load = useCallback(
    () =>
      api<{ user: ClientUser | null; favorites: string[] }>("/api/auth/me").then(
        (me) => {
          setUser(me.user);
          setFavorites(new Set(me.favorites));
          setStatus("ready");
        },
        () => {
          setUser(null);
          setStatus("ready");
        },
      ),
    [],
  );
  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);

  const signOut = useCallback(async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      setFavorites(new Set());
      router.push("/");
      router.refresh();
    }
  }, [router]);

  const toggleFavorite = useCallback(
    async (productId: string) => {
      if (!user) {
        // This provider also wraps the admin (outside the language provider), so derive the prefix from the URL.
        const prefix = /^\/(hy|en|ru)(?=\/|$)/.exec(window.location.pathname)?.[0] ?? "";
        router.push(`${prefix}/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return null;
      }
      const next = !favorites.has(productId);
      setFavorites((prev) => {
        const s = new Set(prev);
        if (next) s.add(productId);
        else s.delete(productId);
        return s;
      });
      try {
        const ids = await api<string[]>("/api/account/favorites", { method: "PUT", body: { productId, favorite: next } });
        setFavorites(new Set(ids));
        return next;
      } catch {
        setFavorites((prev) => {
          const s = new Set(prev);
          if (next) s.delete(productId);
          else s.add(productId);
          return s;
        });
        return null;
      }
    },
    [user, favorites, router],
  );

  const value = useMemo(() => ({ status, user, favorites, refresh, signOut, toggleFavorite }), [status, user, favorites, refresh, signOut, toggleFavorite]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
