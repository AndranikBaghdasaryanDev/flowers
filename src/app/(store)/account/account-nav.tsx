"use client";

import Link from "next/link";
import { User, Package, MapPin, Heart, Bell, ShieldCheck, LogOut, LayoutDashboard } from "lucide-react";
import { WithPathname } from "@/components/route-change";
import { useSession } from "@/components/providers/session-provider";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/account", label: "Overview", icon: User },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/favorites", label: "Favourites", icon: Heart },
  { href: "/account/notifications", label: "Notifications", icon: Bell },
  { href: "/account/security", label: "Password & security", icon: ShieldCheck },
];

export function AccountNav({ isStaff }: { isStaff: boolean }) {
  const { signOut } = useSession();
  const render = (pathname: string) => (
    <nav aria-label="Account" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
      <ul className="flex gap-2 lg:flex-col lg:gap-1">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/account" ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold transition-colors lg:rounded-xl",
                  active ? "bg-brand text-white lg:bg-brand-50 lg:text-brand" : "bg-paper text-ink-soft hover:text-brand lg:bg-transparent lg:hover:bg-cream",
                )}
              >
                <Icon className="h-4 w-4" /> {label}
              </Link>
            </li>
          );
        })}
        {isStaff && (
          <li className="shrink-0">
            <Link href="/admin" className="flex items-center gap-3 whitespace-nowrap rounded-full bg-paper px-4 py-2.5 text-sm font-semibold text-ink-soft hover:text-brand lg:rounded-xl lg:bg-transparent">
              <LayoutDashboard className="h-4 w-4" /> Admin dashboard
            </Link>
          </li>
        )}
        <li className="shrink-0 lg:mt-4 lg:border-t lg:border-line lg:pt-4">
          <button type="button" onClick={() => void signOut()} className="flex w-full items-center gap-3 whitespace-nowrap rounded-full bg-paper px-4 py-2.5 text-sm font-semibold text-ink-soft hover:text-danger lg:rounded-xl lg:bg-transparent">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </li>
      </ul>
    </nav>
  );
  return <WithPathname fallback={render("")}>{render}</WithPathname>;
}
