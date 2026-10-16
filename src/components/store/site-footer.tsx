import Link from "next/link";
import { connection } from "next/server";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { FacebookIcon, InstagramIcon, TelegramIcon } from "@/components/ui/social-icons";
import { Logo } from "@/components/brand/logo";
import { NewsletterForm } from "@/components/store/newsletter-form";
import { getSettings } from "@/lib/services/settings";
import { listPublicCategories } from "@/lib/services/catalog";
import { brand } from "@/lib/brand";

export async function SiteFooter() {
  await connection();
  const [settings, collections] = await Promise.all([getSettings(), listPublicCategories("collection").catch(() => [])]);
  const { contact, social } = settings;
  const year = new Date().getFullYear();
  const hasContact = Boolean(contact.phone || contact.email || contact.address || contact.hours);
  const heading = "mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-brand-200";
  const link = "text-[14.5px] text-ivory/75 transition-colors hover:text-ivory";

  return (
    <footer className="mt-auto bg-brand-900 text-ivory">
      <div className="container-page py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div className="space-y-6">
            <Logo tone="light" size="md" />
            <p className="max-w-xs text-[14.5px] leading-relaxed text-ivory/70">
              Bouquets, compositions and indoor plants composed by hand{settings.tagline ? ` — ${settings.tagline}` : "."}
            </p>
            <div>
              <p className="mb-3 text-sm font-semibold text-ivory">Seasonal news and new compositions</p>
              <NewsletterForm tone="dark" />
              <p className="mt-2 text-xs text-ivory/50">
                We only use your email for Floriani news. See our{" "}
                <Link href="/legal/privacy" className="underline underline-offset-2 hover:text-ivory">
                  privacy policy
                </Link>
                .
              </p>
            </div>
          </div>

          <nav aria-label="Shop">
            <h2 className={heading}>Shop</h2>
            <ul className="space-y-2.5">
              <li>
                <Link href="/shop" className={link}>
                  All flowers
                </Link>
              </li>
              {collections.slice(0, 6).map((c) => (
                <li key={c.slug}>
                  <Link href={`/categories/${c.slug}`} className={link}>
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Help">
            <h2 className={heading}>Help</h2>
            <ul className="space-y-2.5">
              <li><Link href="/delivery" className={link}>Delivery information</Link></li>
              <li><Link href="/orders/track" className={link}>Track an order</Link></li>
              <li><Link href="/account" className={link}>My account</Link></li>
              <li><Link href="/contact" className={link}>Contact</Link></li>
              <li><Link href="/about" className={link}>About Floriani</Link></li>
            </ul>
          </nav>

          <div>
            <h2 className={heading}>Get in touch</h2>
            {hasContact ? (
              <ul className="space-y-3 text-[14.5px] text-ivory/80">
                {contact.phone && (
                  <li className="flex items-start gap-3">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand-200" />
                    <a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`} className="hover:text-ivory">{contact.phone}</a>
                  </li>
                )}
                {contact.email && (
                  <li className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand-200" />
                    <a href={`mailto:${contact.email}`} className="break-all hover:text-ivory">{contact.email}</a>
                  </li>
                )}
                {contact.address && (
                  <li className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-200" />
                    <span>{contact.address}</span>
                  </li>
                )}
                {contact.hours && (
                  <li className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-200" />
                    <span className="whitespace-pre-line">{contact.hours}</span>
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-[14.5px] leading-relaxed text-ivory/70">
                Message us on Instagram or use the{" "}
                <Link href="/contact" className="underline underline-offset-2 hover:text-ivory">
                  contact page
                </Link>
                .
              </p>
            )}
            <div className="mt-6 flex gap-2">
              {social.instagram && (
                <a href={social.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ivory/20 text-ivory/80 transition-colors hover:border-ivory hover:text-ivory" aria-label={`Instagram @${brand.instagramHandle} (opens in a new tab)`}>
                  <InstagramIcon className="h-4 w-4" />
                </a>
              )}
              {social.facebook && (
                <a href={social.facebook} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ivory/20 text-ivory/80 transition-colors hover:border-ivory hover:text-ivory" aria-label="Facebook (opens in a new tab)">
                  <FacebookIcon className="h-4 w-4" />
                </a>
              )}
              {social.telegram && (
                <a href={social.telegram} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ivory/20 text-ivory/80 transition-colors hover:border-ivory hover:text-ivory" aria-label="Telegram (opens in a new tab)">
                  <TelegramIcon className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-ivory/10">
        <div className="container-page flex flex-col gap-3 py-6 text-[13px] text-ivory/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {settings.storeName}. All rights reserved.</p>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/legal/privacy" className="hover:text-ivory">Privacy policy</Link>
            <Link href="/legal/terms" className="hover:text-ivory">Terms & conditions</Link>
            <Link href="/legal/returns" className="hover:text-ivory">Cancellations & returns</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

export function SiteFooterFallback() {
  return <footer className="mt-auto h-[480px] bg-brand-900" aria-hidden="true" />;
}
