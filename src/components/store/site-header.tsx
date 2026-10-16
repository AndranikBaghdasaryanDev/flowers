"use client";

import { Link, useT } from "@/i18n/client";
import { stripLocale } from "@/i18n/config";
import { LanguageList, LanguageSwitcher } from "@/components/store/language-switcher";
import Image from "next/image";
import { RouteChangeListener, WithPathname } from "@/components/route-change";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Heart, Menu, Search, ShoppingBag, User, LayoutDashboard } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Modal } from "@/components/ui/modal";
import { useCart } from "@/components/providers/cart-provider";
import { useSession } from "@/components/providers/session-provider";
import { SearchDialog } from "@/components/store/search-dialog";
import { cn } from "@/lib/cn";
import type { ImageDTO } from "@/lib/types";

export type NavCategory = { name: string; slug: string; image: ImageDTO | null };
export type NavData = { collections: NavCategory[]; occasions: NavCategory[]; announcement: string };

export const EMPTY_NAV: NavData = { collections: [], occasions: [], announcement: "" };

export function SiteHeader({ nav }: { nav: NavData }) {
  const t = useT();
  const { count, openDrawer, ready } = useCart();
  const { user } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const iconBtn = "relative h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full text-ink transition-colors hover:bg-cream hover:text-brand";

  return (
    <>
      {nav.announcement && (
        <div className="bg-brand px-4 py-2 text-center text-[12.5px] font-medium tracking-wide text-ivory">{nav.announcement}</div>
      )}
      <header
        className={cn(
          "sticky top-0 z-40 border-b transition-[background-color,box-shadow,border-color] duration-300",
          scrolled ? "border-line bg-ivory/90 shadow-[0_8px_30px_-20px_rgb(43_30_35/0.35)] backdrop-blur-md" : "border-transparent bg-ivory",
        )}
      >
        <div className="container-page grid h-[72px] grid-cols-[1fr_auto_1fr] items-center gap-2 lg:h-20">
          {/* Left: mobile menu / desktop nav */}
          <div className="flex items-center gap-1">
            <button type="button" className={cn(iconBtn, "inline-flex lg:hidden")} aria-label={t("nav.openMenu")} onClick={() => setMenuOpen(true)}>
              <Menu className="h-[22px] w-[22px]" />
            </button>
            <button type="button" className={cn(iconBtn, "inline-flex lg:hidden")} aria-label={t("nav.search")} onClick={() => setSearchOpen(true)}>
              <Search className="h-5 w-5" />
            </button>
            <nav aria-label={t("nav.main")} className="hidden items-center gap-1 lg:flex">
              <NavLink href="/shop">{t("nav.shop")}</NavLink>
              <MegaMenu label={t("nav.collections")} items={nav.collections} allHref="/categories" allLabel={t("nav.allCollections")} withImages />
              <MegaMenu label={t("nav.occasions")} items={nav.occasions} allHref="/categories#occasions" allLabel={t("nav.allOccasions")} />
              <NavLink href="/about">{t("nav.about")}</NavLink>
              <NavLink href="/contact">{t("nav.contact")}</NavLink>
            </nav>
          </div>

          <Logo size="sm" className="inline-flex justify-self-center sm:hidden" />
          <Logo size="md" className="hidden justify-self-center sm:inline-flex" />

          {/* Right: actions */}
          <div className="flex items-center justify-end gap-0.5">
            <span className="hidden sm:inline-flex">
              <LanguageSwitcher />
            </span>
            <button type="button" className={cn(iconBtn, "hidden lg:inline-flex")} aria-label={t("nav.search")} onClick={() => setSearchOpen(true)}>
              <Search className="h-5 w-5" />
            </button>
            {user?.isStaff && (
              <Link href="/admin" className={cn(iconBtn, "hidden sm:inline-flex")} aria-label={t("nav.adminDashboard")} title={t("nav.adminDashboard")}>
                <LayoutDashboard className="h-5 w-5" />
              </Link>
            )}
            <Link href="/account/favorites" className={cn(iconBtn, "hidden sm:inline-flex")} aria-label={t("nav.favorites")} title={t("nav.favorites")}>
              <Heart className="h-5 w-5" />
            </Link>
            <Link href={user ? "/account" : "/login"} className={cn(iconBtn, "inline-flex")} aria-label={user ? t("nav.myAccount") : t("nav.signIn")} title={user ? t("nav.myAccount") : t("nav.signIn")}>
              <User className="h-5 w-5" />
              {user && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-sage ring-2 ring-ivory" aria-hidden="true" />}
            </Link>
            <button type="button" className={cn(iconBtn, "inline-flex")} onClick={openDrawer} aria-label={t("nav.bag", { count })}>
              <ShoppingBag className="h-5 w-5" />
              {ready && count > 0 && (
                <span
                  key={count}
                  className="absolute right-1 top-1 flex h-[18px] min-w-[18px] animate-fade-in items-center justify-center rounded-full bg-brand px-1 text-[10.5px] font-bold text-white tabular"
                  aria-hidden="true"
                >
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <RouteChangeListener
        onChange={() => {
          setMenuOpen(false);
          setSearchOpen(false);
        }}
      />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} nav={nav} signedIn={Boolean(user)} isStaff={Boolean(user?.isStaff)} />
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <WithPathname fallback={<NavLinkInner href={href}>{children}</NavLinkInner>}>
      {(pathname) => (
        <NavLinkInner href={href} active={stripLocale(pathname) === href}>
          {children}
        </NavLinkInner>
      )}
    </WithPathname>
  );
}

function NavLinkInner({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative rounded-full px-3.5 py-2 text-[13.5px] font-semibold tracking-wide text-ink transition-colors hover:text-brand",
        "after:absolute after:inset-x-3.5 after:bottom-1 after:h-px after:origin-left after:scale-x-0 after:bg-brand after:transition-transform after:duration-300 hover:after:scale-x-100",
        active && "text-brand after:scale-x-100",
      )}
    >
      {children}
    </Link>
  );
}

function MegaMenu({
  label,
  items,
  allHref,
  allLabel,
  withImages,
}: {
  label: string;
  items: NavCategory[];
  allHref: string;
  allLabel: string;
  withImages?: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const featured = withImages ? items.filter((i) => i.image).slice(0, 2) : [];

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => {
        window.clearTimeout(closeTimer.current);
        setOpen(true);
      }}
      onMouseLeave={() => {
        closeTimer.current = window.setTimeout(() => setOpen(false), 140);
      }}
    >
      <RouteChangeListener onChange={() => setOpen(false)} />
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-[13.5px] font-semibold tracking-wide text-ink transition-colors hover:text-brand"
      >
        {label}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", open && "rotate-180")} />
      </button>
      <div
        className={cn(
          "absolute left-0 top-full z-50 pt-3 transition-all duration-200",
          open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0",
        )}
      >
        <div className={cn("flex gap-6 rounded-3xl border border-line bg-paper p-6 shadow-lift", withImages ? "w-[620px]" : "w-[300px]")}>
          <ul className="min-w-[180px] flex-1 space-y-0.5">
            {items.length === 0 && <li className="px-3 py-2 text-sm text-ink-muted">{t("common.loading")}</li>}
            {items.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/categories/${item.slug}`}
                  className="block rounded-xl px-3 py-2 text-[15px] text-ink transition-colors hover:bg-brand-50 hover:text-brand"
                >
                  {item.name}
                </Link>
              </li>
            ))}
            <li className="pt-2">
              <Link href={allHref} className="block px-3 py-1.5 text-[13px] font-semibold text-brand hover:underline">
                {allLabel} →
              </Link>
            </li>
          </ul>
          {featured.length > 0 && (
            <div className="grid flex-[1.4] grid-cols-2 gap-3">
              {featured.map((f) => (
                <Link key={f.slug} href={`/categories/${f.slug}`} className="group relative block overflow-hidden rounded-2xl">
                  <Image
                    src={f.image!.src}
                    alt={f.image!.alt}
                    width={260}
                    height={320}
                    sizes="200px"
                    className="aspect-[4/5] h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent p-3 font-display text-lg text-ivory">{f.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MobileMenu({ open, onClose, nav, signedIn, isStaff }: { open: boolean; onClose: () => void; nav: NavData; signedIn: boolean; isStaff: boolean }) {
  const t = useT();
  const [section, setSection] = useState<"collections" | "occasions" | null>("collections");
  const link = "flex items-center justify-between rounded-xl px-3 py-3 text-[17px] text-ink transition-colors hover:bg-cream";
  return (
    <Modal open={open} onClose={onClose} title={t("nav.menu")} side="left">
      <nav aria-label={t("nav.mobile")} className="-mx-2 space-y-1">
        <Link href="/" className={link}>
          {t("nav.home")}
        </Link>
        <Link href="/shop" className={link}>
          {t("nav.shopAll")}
        </Link>
        {(["collections", "occasions"] as const).map((key) => (
          <div key={key}>
            <button type="button" className={cn(link, "w-full")} aria-expanded={section === key} onClick={() => setSection(section === key ? null : key)}>
              <span>{key === "collections" ? t("nav.collections") : t("nav.occasions")}</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", section === key && "rotate-180")} />
            </button>
            <div className={cn("grid transition-[grid-template-rows] duration-300", section === key ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
              <ul className="overflow-hidden pl-3">
                {nav[key].map((c) => (
                  <li key={c.slug}>
                    <Link href={`/categories/${c.slug}`} className="block rounded-lg px-3 py-2.5 text-[15px] text-ink-soft hover:bg-cream hover:text-brand">
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
        <Link href="/about" className={link}>
          {t("nav.aboutBrand")}
        </Link>
        <Link href="/delivery" className={link}>
          {t("nav.delivery")}
        </Link>
        <Link href="/contact" className={link}>
          {t("nav.contact")}
        </Link>
        <Link href="/orders/track" className={link}>
          {t("nav.trackOrder")}
        </Link>
        <div className="my-3 border-t border-line" />
        <Link href={signedIn ? "/account" : "/login"} className={link}>
          {signedIn ? t("nav.myAccount") : t("nav.signInRegister")}
        </Link>
        <Link href="/account/favorites" className={link}>
          {t("nav.favorites")}
        </Link>
        {isStaff && (
          <Link href="/admin" className={link}>
            {t("nav.adminDashboard")}
          </Link>
        )}
        <div className="mt-6 border-t border-line px-2 pt-5">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-muted">{t("nav.languageHeading")}</p>
          <LanguageList />
        </div>
      </nav>
    </Modal>
  );
}
