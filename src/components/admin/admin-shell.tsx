"use client";

import { Link, useLocale, useT } from "@/i18n/client";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import {
  LayoutDashboard,
  Package,
  Truck,
  Flower2,
  Layers,
  Boxes,
  Users,
  BarChart3,
  Tag,
  Star,
  Images,
  Settings2,
  CreditCard,
  Store,
  ShieldCheck,
  ScrollText,
  Menu,
  ExternalLink,
  LogOut,
  Languages,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Modal } from "@/components/ui/modal";
import { RouteChangeListener, WithPathname } from "@/components/route-change";
import { useSession } from "@/components/providers/session-provider";
import { hasPermission, type Permission, type Role } from "@/lib/domain/roles";
import { LOCALES, LOCALE_COOKIE, LOCALE_NAMES, type Locale } from "@/i18n/config";
import type { MessageKey } from "@/i18n/translate";
import type { Messages } from "@/i18n/messages";
import { cn } from "@/lib/cn";

type Key = MessageKey<Messages>;
type NavItem = { href: string; label: Key; icon: typeof Package; permission?: Permission; unavailable?: Key; match?: string };

const GROUPS: { title: Key; items: NavItem[] }[] = [
  {
    title: "admin.nav.operations",
    items: [
      { href: "/admin", label: "admin.nav.overview", icon: LayoutDashboard, permission: "dashboard:read" },
      { href: "/admin/orders", label: "admin.nav.orders", icon: Package, permission: "orders:read" },
      { href: "/admin/delivery", label: "admin.nav.delivery", icon: Truck, permission: "delivery:manage", match: "/admin/delivery$|/admin/delivery/couriers" },
    ],
  },
  {
    title: "admin.nav.catalogue",
    items: [
      { href: "/admin/products", label: "admin.nav.products", icon: Flower2, permission: "products:manage", match: "/admin/products(?!\\?availability)" },
      { href: "/admin/categories", label: "admin.nav.categories", icon: Layers, permission: "categories:manage" },
      { href: "/admin/products?availability=low_stock", label: "admin.nav.inventory", icon: Boxes, permission: "products:manage", match: "^$" },
      { href: "#", label: "admin.nav.promotions", icon: Tag, unavailable: "admin.nav.promotionsUnavailable" },
    ],
  },
  {
    title: "admin.nav.customersGroup",
    items: [
      { href: "/admin/customers", label: "admin.nav.customers", icon: Users, permission: "customers:read" },
      { href: "/admin/reviews", label: "admin.nav.reviews", icon: Star, permission: "reviews:manage" },
      { href: "/admin/analytics", label: "admin.nav.analytics", icon: BarChart3, permission: "analytics:read" },
    ],
  },
  {
    title: "admin.nav.store",
    items: [
      { href: "/admin/content", label: "admin.nav.content", icon: Images, permission: "content:manage" },
      { href: "/admin/delivery/settings", label: "admin.nav.deliverySettings", icon: Settings2, permission: "settings:manage" },
      { href: "/admin/settings#payments", label: "admin.nav.paymentSettings", icon: CreditCard, permission: "settings:manage", match: "^$" },
      { href: "/admin/settings", label: "admin.nav.storeSettings", icon: Store, permission: "settings:manage" },
      { href: "/admin/staff", label: "admin.nav.staff", icon: ShieldCheck, permission: "staff:manage" },
      { href: "/admin/audit", label: "admin.nav.audit", icon: ScrollText, permission: "audit:read" },
    ],
  },
];

function isActive(item: NavItem, pathname: string) {
  if (item.match) return new RegExp(item.match).test(pathname);
  if (item.href === "/admin") return pathname === "/admin";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function Sidebar({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const t = useT();
  const render = (pathname: string) => (
    <nav aria-label={t("admin.nav.ariaLabel")} className="space-y-6">
      {GROUPS.map((group) => {
        const items = group.items.filter((i) => i.unavailable || !i.permission || hasPermission(role, i.permission));
        if (items.length === 0) return null;
        return (
          <div key={group.title}>
            <p className="mb-2 px-3 text-[10.5px] font-bold uppercase tracking-[0.2em] text-ivory/45">{t(group.title)}</p>
            <ul className="space-y-0.5">
              {items.map((item) => {
                const Icon = item.icon;
                if (item.unavailable) {
                  return (
                    <li key={item.label}>
                      <span title={t(item.unavailable)} className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] text-ivory/35">
                        <Icon className="h-[17px] w-[17px]" /> {t(item.label)}
                        <span className="ml-auto rounded-full border border-ivory/15 px-1.5 text-[10px]">{t("admin.nav.soon")}</span>
                      </span>
                    </li>
                  );
                }
                const active = isActive(item, pathname);
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-medium transition-colors",
                        active ? "bg-ivory text-brand-900" : "text-ivory/75 hover:bg-ivory/10 hover:text-ivory",
                      )}
                    >
                      <Icon className="h-[17px] w-[17px]" /> {t(item.label)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
  return <WithPathname fallback={render("")}>{render}</WithPathname>;
}

/** Admin language picker: saves the choice in the shared locale cookie and re-renders server components. */
function LanguageSwitcher() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  const change = (next: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`;
    start(() => router.refresh());
  };
  return (
    <label className="relative inline-flex items-center text-ink-soft">
      <span className="sr-only">{t("admin.nav.language")}</span>
      <Languages className="pointer-events-none absolute left-2.5 h-4 w-4" aria-hidden="true" />
      <select
        value={locale}
        disabled={pending}
        onChange={(e) => change(e.target.value as Locale)}
        className="h-9 appearance-none rounded-full border border-line bg-paper pl-8 pr-3 text-[12.5px] font-semibold text-ink hover:border-brand focus:border-brand focus:outline-none disabled:opacity-60"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l} lang={l}>
            {LOCALE_NAMES[l]}
          </option>
        ))}
      </select>
    </label>
  );
}

export function AdminShell({ user, children }: { user: { name: string; email: string; role: Role }; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { signOut } = useSession();
  const t = useT();
  return (
    <div className="flex min-h-dvh bg-[#f7f4f0]">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-y-auto bg-brand-900 px-4 py-6 lg:flex">
        <div className="mb-8 px-3">
          <Logo tone="light" size="sm" href="/admin" />
          <p className="mt-2 text-center text-[10.5px] uppercase tracking-[0.3em] text-ivory/40">{t("admin.nav.admin")}</p>
        </div>
        <Sidebar role={user.role} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-paper/90 px-4 backdrop-blur sm:px-6">
          <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-cream lg:hidden" aria-label={t("admin.nav.openMenu")} onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <span className="lg:hidden">
            <Logo size="sm" href="/admin" />
          </span>
          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher />
            <Link href="/" className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold text-ink-soft hover:bg-cream hover:text-brand sm:inline-flex" target="_blank">
              {t("admin.nav.viewStore")} <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <div className="hidden text-right sm:block">
              <p className="text-[13px] font-semibold leading-tight text-ink">{user.name}</p>
              <p className="text-[11.5px] text-ink-muted">{t(`admin.common.roles.${user.role}`)}</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-white" aria-hidden="true">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <button type="button" onClick={() => void signOut()} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-soft hover:bg-cream hover:text-danger" aria-label={t("admin.nav.signOut")} title={t("admin.nav.signOut")}>
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </div>
        </header>
        <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>

      <RouteChangeListener onChange={() => setOpen(false)} />
      <Modal open={open} onClose={() => setOpen(false)} title={t("admin.common.metaTitle")} side="left" className="!bg-brand-900 [&_h2]:text-ivory">
        <Sidebar role={user.role} onNavigate={() => setOpen(false)} />
      </Modal>
    </div>
  );
}
