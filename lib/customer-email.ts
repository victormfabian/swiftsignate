import "server-only";

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
        html: input.html
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
