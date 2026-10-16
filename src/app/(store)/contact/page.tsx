import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Phone, Mail, MapPin, Clock, MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/store/page-header";
import { Skeleton } from "@/components/ui/spinner";
import { InstagramIcon } from "@/components/ui/social-icons";
import { getSettings } from "@/lib/services/settings";
import { brand } from "@/lib/brand";

export const metadata: Metadata = { title: "Contact", description: "Get in touch with Floriani Flowers.", alternates: { canonical: "/contact" } };

async function Contact() {
  await connection();
  const { contact, social } = await getSettings();
  const cards = [
    contact.phone && { icon: Phone, title: "Call us", value: contact.phone, href: `tel:${contact.phone.replace(/[^\d+]/g, "")}` },
    contact.whatsapp && { icon: MessageCircle, title: "WhatsApp", value: contact.whatsapp, href: `https://wa.me/${contact.whatsapp.replace(/\D/g, "")}` },
    contact.email && { icon: Mail, title: "Email", value: contact.email, href: `mailto:${contact.email}` },
    social.instagram && { icon: InstagramIcon, title: "Instagram", value: `@${brand.instagramHandle}`, href: social.instagram },
    contact.address && { icon: MapPin, title: "Studio", value: contact.address, href: contact.mapUrl || undefined },
    contact.hours && { icon: Clock, title: "Opening hours", value: contact.hours },
  ].filter(Boolean) as { icon: typeof Phone; title: string; value: string; href?: string }[];

  return (
    <div className="container-page pb-24">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ icon: Icon, title, value, href }) => (
          <li key={title} className="rounded-[1.5rem] border border-line bg-paper p-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand">
              <Icon className="h-5 w-5" />
            </span>
            <p className="mt-4 text-sm font-semibold text-ink-muted">{title}</p>
            {href ? (
              <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noopener noreferrer" : undefined} className="mt-1 block whitespace-pre-line break-words font-display text-2xl text-ink hover:text-brand">
                {value}
              </a>
            ) : (
              <p className="mt-1 whitespace-pre-line font-display text-2xl text-ink">{value}</p>
            )}
          </li>
        ))}
      </ul>
      {cards.length <= 1 && (
        <p className="mt-8 max-w-xl text-[15px] text-ink-soft">
          More contact details will be added here soon. In the meantime, the quickest way to reach us is a message on Instagram.
        </p>
      )}
    </div>
  );
}

export default function ContactPage() {
  return (
    <>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Contact" }]} eyebrow="Say hello" title="Contact us" description="Questions about an order, a special request or wedding flowers — we would love to hear from you." />
      <Suspense fallback={<div className="container-page grid gap-4 pb-24 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-[1.5rem]" />)}</div>}>
        <Contact />
      </Suspense>
    </>
  );
}
