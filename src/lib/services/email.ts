import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export type EmailMessage = { to: string; subject: string; text: string; html?: string };
export type SendResult = { status: "sent" | "skipped" | "failed"; error?: string };

let transporter: Transporter | null = null;

export function isEmailConfigured(): boolean {
  return env.smtp !== null;
}

function getTransporter(): Transporter | null {
  const smtp = env.smtp;
  if (!smtp) return null;
  transporter ??= nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
  });
  return transporter;
}

/**
 * Sends an email through the configured SMTP provider.
 * When SMTP is not configured the message is NOT sent and "skipped" is returned —
 * callers must never report a skipped email as delivered.
 */
export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  const t = getTransporter();
  if (!t) {
    if (!env.isProduction) {
      logger.info("email not sent: SMTP is not configured (development preview below)", {
        to: message.to,
        subject: message.subject,
        preview: message.text.slice(0, 600),
      });
    }
    return { status: "skipped", error: "Email provider not configured" };
  }
  try {
    await t.sendMail({ from: env.smtp!.from, to: message.to, subject: message.subject, text: message.text, html: message.html });
    return { status: "sent" };
  } catch (error) {
    logger.error("email send failed", { error, subject: message.subject });
    return { status: "failed", error: error instanceof Error ? error.message.slice(0, 300) : "Unknown error" };
  }
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Wraps plain paragraphs in a simple, brand-coloured HTML email layout. */
export function renderEmailHtml(title: string, paragraphs: string[], action?: { label: string; url: string }): string {
  const body = paragraphs.map((p) => `<p style="margin:0 0 14px;line-height:1.6">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`).join("");
  const button = action
    ? `<p style="margin:24px 0"><a href="${escapeHtml(action.url)}" style="background:#781241;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;display:inline-block">${escapeHtml(action.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#fbf8f4;font-family:Arial,Helvetica,sans-serif;color:#2b1e23">
<div style="max-width:560px;margin:0 auto;padding:32px 24px">
<div style="font-family:Georgia,serif;font-size:26px;letter-spacing:6px;color:#781241;margin-bottom:24px">FLORIANI</div>
<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:0 0 18px">${escapeHtml(title)}</h1>
${body}${button}
<p style="margin-top:32px;font-size:12px;color:#75656b">Floriani Flowers</p>
</div></body></html>`;
}
