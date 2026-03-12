import "server-only";

import { getSiteUrl } from "@/lib/site-url";

type CustomerEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

type EmailResult = {
  ok: boolean;
  skipped: boolean;
};

type BrandedCustomerEmailHtmlInput = {
  title: string;
  contentHtml: string;
  actionHtml?: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildBrandedCustomerEmailHtml(input: BrandedCustomerEmailHtmlInput) {
  const actionMarkup = input.actionHtml ? `<div style="margin-top:28px;">${input.actionHtml}</div>` : "";
  const logoUrl = `${getSiteUrl()}/api/content/logo`;

  return `
    <div style="margin:0;padding:32px 16px;background:#fff7ed;font-family:Segoe UI,Arial,sans-serif;">
      <div style="max-width:620px;margin:0 auto;overflow:hidden;border-radius:28px;border:1px solid #fdba74;background:#ffffff;">
        <div style="padding:26px 32px;background:#f97316;border-bottom:1px solid #fdba74;">
          <div style="display:flex;align-items:center;gap:14px;">
            <img src="${logoUrl}" alt="Swift Signate logo" width="48" height="48" style="display:block;height:48px;width:48px;border-radius:14px;" />
            <div style="font-size:24px;font-weight:700;letter-spacing:0.02em;color:#111827;">Swift Signate</div>
          </div>
        </div>
        <div style="padding:32px;background:#ffffff;">
          <div style="color:#111827;font-size:30px;font-weight:700;line-height:1.2;">${escapeHtml(input.title)}</div>
          <div style="margin-top:18px;">${input.contentHtml}</div>
          ${actionMarkup}
        </div>
      </div>
    </div>
  `;
}

function buildDefaultCustomerEmailHtml(input: CustomerEmailInput) {
  const paragraphs = input.text
    .split(/\r?\n\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const contentHtml = paragraphs
    .map((paragraph) => {
      const paragraphHtml = escapeHtml(paragraph).replaceAll(/\r?\n/g, "<br />");
      return `<div style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.8;">${paragraphHtml}</div>`;
    })
    .join("");

  return buildBrandedCustomerEmailHtml({
    title: input.subject,
    contentHtml
  });
}

function readEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  const fromName = process.env.RESEND_FROM_NAME?.trim() || "Swift Signate";

  if (!apiKey || !fromEmail) {
    return null;
  }

  return {
    apiKey,
    from: `${fromName} <${fromEmail}>`
  };
}

export function isCustomerEmailConfigured() {
  return Boolean(readEmailConfig());
}

export async function sendCustomerEmail(input: CustomerEmailInput): Promise<EmailResult> {
  const config = readEmailConfig();

  if (!config) {
    return {
      ok: false,
      skipped: true
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: config.from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html ?? buildDefaultCustomerEmailHtml(input)
      })
    });

    return {
      ok: response.ok,
      skipped: false
    };
  } catch {
    return {
      ok: false,
      skipped: false
    };
  }
}
