"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
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
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Modal } from "@/components/ui/modal";
import { RouteChangeListener, WithPathname } from "@/components/route-change";
import { useSession } from "@/components/providers/session-provider";
import { hasPermission, ROLE_LABELS, type Permission, type Role } from "@/lib/domain/roles";
import { cn } from "@/lib/cn";

type NavItem = { href: string; label: string; icon: typeof Package; permission?: Permission; unavailable?: string; match?: string };

const GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Operations",
    items: [
      { href: "/admin", label: "Overview", icon: LayoutDashboard, permission: "dashboard:read" },
      { href: "/admin/orders", label: "Orders", icon: Package, permission: "orders:read" },
      { href: "/admin/delivery", label: "Delivery", icon: Truck, permission: "delivery:manage", match: "/admin/delivery$|/admin/delivery/couriers" },
    ],
  },
  {
    title: "Catalogue",
    items: [
      { href: "/admin/products", label: "Products", icon: Flower2, permission: "products:manage", match: "/admin/products(?!\\?availability)" },
      { href: "/admin/categories", label: "Categories", icon: Layers, permission: "categories:manage" },
      { href: "/admin/products?availability=low_stock", label: "Inventory", icon: Boxes, permission: "products:manage", match: "^$" },
      { href: "#", label: "Promotions", icon: Tag, unavailable: "Discount codes are not implemented yet. Product sale prices are set on each product." },
    ],
  },
  {
    title: "Customers",
    items: [
      { href: "/admin/customers", label: "Customers", icon: Users, permission: "customers:read" },
      { href: "/admin/reviews", label: "Reviews", icon: Star, permission: "reviews:manage" },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3, permission: "analytics:read" },
    ],
  },
  {
    title: "Store",
    items: [
      { href: "/admin/content", label: "Gallery & content", icon: Images, permission: "content:manage" },
      { href: "/admin/delivery/settings", label: "Delivery settings", icon: Settings2, permission: "settings:manage" },
      { href: "/admin/settings#payments", label: "Payment settings", icon: CreditCard, permission: "settings:manage", match: "^$" },
      { href: "/admin/settings", label: "Store settings", icon: Store, permission: "settings:manage" },
      { href: "/admin/staff", label: "Staff & permissions", icon: ShieldCheck, permission: "staff:manage" },
      { href: "/admin/audit", label: "Audit log", icon: ScrollText, permission: "audit:read" },
    ],
  },
];

function isActive(item: NavItem, pathname: string) {
  if (item.match) return new RegExp(item.match).test(pathname);
  if (item.href === "/admin") return pathname === "/admin";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function Sidebar({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const render = (pathname: string) => (
    <nav aria-label="Admin" className="space-y-6">
      {GROUPS.map((group) => {
        const items = group.items.filter((i) => i.unavailable || !i.permission || hasPermission(role, i.permission));
        if (items.length === 0) return null;
        return (
          <div key={group.title}>
            <p className="mb-2 px-3 text-[10.5px] font-bold uppercase tracking-[0.2em] text-ivory/45">{group.title}</p>
            <ul className="space-y-0.5">
              {items.map((item) => {
                const Icon = item.icon;
                if (item.unavailable) {
                  return (
                    <li key={item.label}>
                      <span title={item.unavailable} className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] text-ivory/35">
                        <Icon className="h-[17px] w-[17px]" /> {item.label}
                        <span className="ml-auto rounded-full border border-ivory/15 px-1.5 text-[10px]">Soon</span>
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
                      <Icon className="h-[17px] w-[17px]" /> {item.label}
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

export function AdminShell({ user, children }: { user: { name: string; email: string; role: Role }; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { signOut } = useSession();
  return (
    <div className="flex min-h-dvh bg-[#f7f4f0]">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-y-auto bg-brand-900 px-4 py-6 lg:flex">
        <div className="mb-8 px-3">
          <Logo tone="light" size="sm" href="/admin" />
          <p className="mt-2 text-center text-[10.5px] uppercase tracking-[0.3em] text-ivory/40">Admin</p>
        </div>
        <Sidebar role={user.role} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-paper/90 px-4 backdrop-blur sm:px-6">
          <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-cream lg:hidden" aria-label="Open admin menu" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <span className="lg:hidden">
            <Logo size="sm" href="/admin" />
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/" className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold text-ink-soft hover:bg-cream hover:text-brand sm:inline-flex" target="_blank">
              View store <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <div className="hidden text-right sm:block">
              <p className="text-[13px] font-semibold leading-tight text-ink">{user.name}</p>
              <p className="text-[11.5px] text-ink-muted">{ROLE_LABELS[user.role]}</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-white" aria-hidden="true">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <button type="button" onClick={() => void signOut()} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-soft hover:bg-cream hover:text-danger" aria-label="Sign out" title="Sign out">
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </div>
        </header>
        <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>

      <RouteChangeListener onChange={() => setOpen(false)} />
      <Modal open={open} onClose={() => setOpen(false)} title="Floriani admin" side="left" className="!bg-brand-900 [&_h2]:text-ivory">
        <Sidebar role={user.role} onNavigate={() => setOpen(false)} />
      </Modal>
    </div>
  );
}
