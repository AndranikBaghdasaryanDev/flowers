/** Social brand glyphs (lucide-react 1.x no longer ships brand logos). */
type Props = { className?: string };

export function InstagramIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FacebookIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M15 3h-2.2A3.8 3.8 0 0 0 9 6.8V10H6.5v3.6H9V21h3.6v-7.4h2.6l.5-3.6h-3.1V7.3c0-.6.4-1 1-1H15z" />
    </svg>
  );
}

export function TelegramIcon({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m21 4-3.2 15.2c-.2 1-.9 1.3-1.7.8l-4.8-3.6-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.4-.1-.6-.6-.2L5.6 13 1 11.6c-1-.3-1-1 .2-1.5L19.7 3c.9-.3 1.6.2 1.3 1Z" />
    </svg>
  );
}
