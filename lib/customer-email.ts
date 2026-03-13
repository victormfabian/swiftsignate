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
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light only" />
        <title>${escapeHtml(input.title)}</title>
      </head>
      <body style="margin:0;padding:0;background-color:#fff7ed;color:#111827;font-family:Segoe UI,Arial,sans-serif;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#fff7ed" style="width:100%;border-collapse:collapse;background-color:#fff7ed;">
          <tr>
            <td align="center" style="padding:32px 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#ffffff" style="width:100%;max-width:620px;border-collapse:separate;border-spacing:0;background-color:#ffffff;border:1px solid #fdba74;border-radius:28px;overflow:hidden;">
                <tr>
                  <td bgcolor="#f97316" style="padding:24px 32px;background-color:#f97316;border-bottom:1px solid #fdba74;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                      <tr>
                        <td valign="middle" style="width:48px;vertical-align:middle;">
                          <img src="${logoUrl}" alt="Swift Signate logo" width="48" height="48" style="display:block;width:48px;height:48px;border-radius:14px;border:0;outline:none;text-decoration:none;" />
                        </td>
                        <td valign="middle" style="padding-left:14px;vertical-align:middle;">
                          <div style="margin:0;color:#111827;font-size:24px;font-weight:700;letter-spacing:0.02em;line-height:1.1;">Swift Signate</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td bgcolor="#ffffff" style="padding:32px;background-color:#ffffff;color:#111827;">
                    <div style="margin:0;color:#111827;font-size:30px;font-weight:700;line-height:1.2;">${escapeHtml(input.title)}</div>
                    <div style="margin-top:18px;background-color:#ffffff;color:#111827;">${input.contentHtml}</div>
                    ${actionMarkup}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
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
      return `<div style="margin:0 0 16px;color:#111827;font-size:16px;line-height:1.8;">${paragraphHtml}</div>`;
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
