"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { api } from "@/lib/client/api";
import { useSession } from "@/components/providers/session-provider";
import type { ImageDTO, QuoteDTO } from "@/lib/types";

/**
 * Cart state.
 * - Guests: persisted in localStorage.
 * - Signed-in customers: persisted on the server; on sign-in the guest cart is merged
 *   (the server keeps the larger quantity per product, so merging is idempotent).
 * - Prices and availability shown in the cart always come from the server quote.
 */

export type CartLine = { productId: string; quantity: number };
export type CartSnapshot = { name: string; slug: string; image: ImageDTO | null; unitPrice: number; maxQuantity?: number; /** Price when the item was added; used to tell the customer about price changes. */ addedPrice?: number };

type StoredCart = { items: CartLine[]; giftMessage: string; snapshots: Record<string, CartSnapshot> };

const STORAGE_KEY = "ff_cart_v1";
const noopSubscribe = () => () => {};
const EMPTY: StoredCart = { items: [], giftMessage: "", snapshots: {} };

function readStorage(): StoredCart {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as StoredCart;
    return {
      items: Array.isArray(parsed.items)
        ? parsed.items.filter((i) => typeof i.productId === "string" && Number.isInteger(i.quantity) && i.quantity > 0).slice(0, 50)
        : [],
      giftMessage: typeof parsed.giftMessage === "string" ? parsed.giftMessage.slice(0, 500) : "",
      snapshots: parsed.snapshots && typeof parsed.snapshots === "object" ? parsed.snapshots : {},
    };
  } catch {
    return EMPTY;
  }
}

function writeStorage(cart: StoredCart) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // storage unavailable (private mode / quota) — cart still works in memory
  }
}

type CartState = {
  ready: boolean;
  items: CartLine[];
  count: number;
  giftMessage: string;
  snapshots: Record<string, CartSnapshot>;
  quote: QuoteDTO | null;
  quoteLoading: boolean;
  quoteError: boolean;
  drawerOpen: boolean;
  add: (productId: string, quantity: number, snapshot?: CartSnapshot) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  setGiftMessage: (message: string) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  refreshQuote: () => void;
  acknowledgePrices: () => void;
};

const CartContext = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { status, user } = useSession();
  // `ready` is false during SSR and hydration, true afterwards (localStorage is client-only).
  const ready = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [stored, setStored] = useState<StoredCart | null>(null);
  const cart: StoredCart = stored ?? (ready ? readStorage() : EMPTY);
  const setCart = useCallback(
    (next: StoredCart | ((c: StoredCart) => StoredCart)) =>
      setStored((prev) => {
        const base = prev ?? readStorage();
        return typeof next === "function" ? next(base) : next;
      }),
    [],
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [quote, setQuote] = useState<QuoteDTO | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState(false);
  const [quoteNonce, setQuoteNonce] = useState(0);
  const syncedUser = useRef<string | null | undefined>(undefined);
  const skipNextServerSave = useRef(false);

  // React to sign-in / sign-out.
  useEffect(() => {
    if (!ready || status !== "ready") return;
    const uid = user?.id ?? null;
    if (syncedUser.current === uid) return;
    const previous = syncedUser.current;
    syncedUser.current = uid;
    if (uid) {
      const local = readStorage();
      api<{ items: CartLine[]; giftMessage: string }>("/api/cart", {
        method: "PUT",
        body: { items: local.items, giftMessage: local.giftMessage, mode: "merge" },
      })
        .then((server) => {
          skipNextServerSave.current = true;
          setCart((c) => ({ ...c, items: server.items, giftMessage: server.giftMessage }));
        })
        .catch(() => undefined);
    } else if (previous) {
      // Signed out: do not leave the previous customer's cart on a shared device.
      skipNextServerSave.current = true;
      setCart(EMPTY);
    }
  }, [ready, status, user, setCart]);

  // Persist locally on every change, and to the server (debounced) when signed in.
  useEffect(() => {
    if (!ready || !stored) return;
    writeStorage(stored);
    if (!user || syncedUser.current !== user.id) return;
    if (skipNextServerSave.current) {
      skipNextServerSave.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      api("/api/cart", { method: "PUT", body: { items: cart.items, giftMessage: cart.giftMessage, mode: "replace" } }).catch(() => undefined);
    }, 600);
    return () => window.clearTimeout(t);
  }, [cart, stored, ready, user]);

  // Server quote (authoritative prices/availability).
  const itemsKey = JSON.stringify(cart.items);
  useEffect(() => {
    if (!ready) return;
    if (cart.items.length === 0) return;
    const controller = new AbortController();
    const t = window.setTimeout(() => {
      setQuoteLoading(true);
      api<QuoteDTO>("/api/cart/quote", { body: { items: cart.items }, signal: controller.signal })
        .then((q) => {
          setQuote(q);
          setQuoteError(false);
          setCart((c) => {
            const snapshots = { ...c.snapshots };
            for (const line of q.lines) {
              if (line.status !== "not_found") {
                const prev = snapshots[line.productId];
                snapshots[line.productId] = {
                  name: line.name,
                  slug: line.slug,
                  image: line.image,
                  unitPrice: line.unitPrice,
                  maxQuantity: line.maxQuantity,
                  addedPrice: prev?.addedPrice ?? prev?.unitPrice ?? line.unitPrice,
                };
              }
            }
            return { ...c, snapshots };
          });
        })
        .catch((e) => {
          if ((e as Error).name !== "AbortError") setQuoteError(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setQuoteLoading(false);
        });
    }, 180);
    return () => {
      controller.abort();
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on serialised items
  }, [itemsKey, ready, quoteNonce]);

  const add = useCallback((productId: string, quantity: number, snapshot?: CartSnapshot) => {
    setCart((c) => {
      const existing = c.items.find((i) => i.productId === productId);
      const max = snapshot?.maxQuantity ?? c.snapshots[productId]?.maxQuantity ?? 99;
      const nextQty = Math.max(1, Math.min(max || 99, (existing?.quantity ?? 0) + quantity));
      const items = existing
        ? c.items.map((i) => (i.productId === productId ? { ...i, quantity: nextQty } : i))
        : [...c.items, { productId, quantity: nextQty }];
      return {
        ...c,
        items,
        snapshots: snapshot ? { ...c.snapshots, [productId]: { ...snapshot, addedPrice: c.snapshots[productId]?.addedPrice ?? snapshot.unitPrice } } : c.snapshots,
      };
    });
  }, [setCart]);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setCart((c) => ({
      ...c,
      items:
        quantity <= 0
          ? c.items.filter((i) => i.productId !== productId)
          : c.items.map((i) => (i.productId === productId ? { ...i, quantity: Math.min(99, Math.floor(quantity)) } : i)),
    }));
  }, [setCart]);

  const remove = useCallback((productId: string) => setCart((c) => ({ ...c, items: c.items.filter((i) => i.productId !== productId) })), [setCart]);
  const clear = useCallback(() => setCart((c) => ({ ...c, items: [], giftMessage: "" })), [setCart]);
  const setGiftMessage = useCallback((message: string) => setCart((c) => ({ ...c, giftMessage: message.slice(0, 500) })), [setCart]);
  const refreshQuote = useCallback(() => setQuoteNonce((n) => n + 1), []);
  const acknowledgePrices = useCallback(
    () =>
      setCart((c) => ({
        ...c,
        snapshots: Object.fromEntries(Object.entries(c.snapshots).map(([id, s]) => [id, { ...s, addedPrice: s.unitPrice }])),
      })),
    [setCart],
  );

  const value = useMemo<CartState>(
    () => ({
      ready,
      items: cart.items,
      count: cart.items.reduce((n, i) => n + i.quantity, 0),
      giftMessage: cart.giftMessage,
      snapshots: cart.snapshots,
      quote: cart.items.length ? quote : null,
      quoteLoading: cart.items.length ? quoteLoading : false,
      quoteError,
      drawerOpen,
      add,
      setQuantity,
      remove,
      clear,
      setGiftMessage,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      refreshQuote,
      acknowledgePrices,
    }),
    [ready, cart, quote, quoteLoading, quoteError, drawerOpen, add, setQuantity, remove, clear, setGiftMessage, refreshQuote, acknowledgePrices],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
