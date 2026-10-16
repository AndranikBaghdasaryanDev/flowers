import { Link } from "@/i18n/client";
import { connection } from "next/server";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { FacebookIcon, InstagramIcon, TelegramIcon } from "@/components/ui/social-icons";
import { Logo } from "@/components/brand/logo";
import { NewsletterForm } from "@/components/store/newsletter-form";
import { getSettings } from "@/lib/services/settings";
import { listPublicCategories } from "@/lib/services/catalog";
import { brand } from "@/lib/brand";
import { getStoreI18n } from "@/i18n/server";
import { LanguageSwitcher } from "@/components/store/language-switcher";

export async function SiteFooter() {
  await connection();
  const { locale, t } = await getStoreI18n();
  const [settings, collections] = await Promise.all([getSettings(locale), listPublicCategories("collection", locale).catch(() => [])]);
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
              {t("footer.tagline")}
              {settings.tagline ? ` — ${settings.tagline}` : ""}
            </p>
            <div>
              <p className="mb-3 text-sm font-semibold text-ivory">{t("footer.newsletterTitle")}</p>
              <NewsletterForm tone="dark" />
              <p className="mt-2 text-xs text-ivory/50">
                {t.rich("footer.newsletterNote", {
                  link: (chunk) => (
                    <Link href="/legal/privacy" className="underline underline-offset-2 hover:text-ivory">
                      {chunk}
                    </Link>
                  ),
                })}
              </p>
            </div>
          </div>

          <nav aria-label="Shop">
            <h2 className={heading}>{t("footer.shop")}</h2>
            <ul className="space-y-2.5">
              <li>
                <Link href="/shop" className={link}>
                  {t("footer.allFlowers")}
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
            <h2 className={heading}>{t("footer.help")}</h2>
            <ul className="space-y-2.5">
              <li><Link href="/delivery" className={link}>{t("footer.deliveryInfo")}</Link></li>
              <li><Link href="/orders/track" className={link}>{t("nav.trackOrder")}</Link></li>
              <li><Link href="/account" className={link}>{t("nav.myAccount")}</Link></li>
              <li><Link href="/contact" className={link}>{t("nav.contact")}</Link></li>
              <li><Link href="/about" className={link}>{t("nav.aboutBrand")}</Link></li>
            </ul>
          </nav>

          <div>
            <h2 className={heading}>{t("footer.getInTouch")}</h2>
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
                {t.rich("footer.noContact", {
                  link: (chunk) => (
                    <Link href="/contact" className="underline underline-offset-2 hover:text-ivory">
                      {chunk}
                    </Link>
                  ),
                })}
              </p>
            )}
            <div className="mt-6 flex gap-2">
              {social.instagram && (
                <a href={social.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ivory/20 text-ivory/80 transition-colors hover:border-ivory hover:text-ivory" aria-label={t("footer.socialLink", { network: `Instagram @${brand.instagramHandle}` })}>
                  <InstagramIcon className="h-4 w-4" />
                </a>
              )}
              {social.facebook && (
                <a href={social.facebook} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ivory/20 text-ivory/80 transition-colors hover:border-ivory hover:text-ivory" aria-label={t("footer.socialLink", { network: "Facebook" })}>
                  <FacebookIcon className="h-4 w-4" />
                </a>
              )}
              {social.telegram && (
                <a href={social.telegram} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ivory/20 text-ivory/80 transition-colors hover:border-ivory hover:text-ivory" aria-label={t("footer.socialLink", { network: "Telegram" })}>
                  <TelegramIcon className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-ivory/10">
        <div className="container-page flex flex-col gap-3 py-6 text-[13px] text-ivory/55 sm:flex-row sm:items-center sm:justify-between">
          <p>{t("footer.copyright", { year: String(year), name: settings.storeName })}</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <nav aria-label={t("footer.legal")} className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/legal/privacy" className="hover:text-ivory">{t("legal.privacy")}</Link>
            <Link href="/legal/terms" className="hover:text-ivory">{t("legal.terms")}</Link>
            <Link href="/legal/returns" className="hover:text-ivory">{t("legal.returns")}</Link>
          </nav>
          <LanguageSwitcher tone="dark" />
          </div>
        </div>
      </div>
    </footer>
  );
}

export function SiteFooterFallback() {
  return <footer className="mt-auto h-[480px] bg-brand-900" aria-hidden="true" />;
}
