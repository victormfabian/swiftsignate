function normalizeAbsoluteUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (
    /^wa\.me\//i.test(trimmed) ||
    /^api\.whatsapp\.com\//i.test(trimmed) ||
    /^web\.whatsapp\.com\//i.test(trimmed) ||
    /^[a-z0-9-]+(\.[a-z0-9-]+)+($|\/)/i.test(trimmed)
  ) {
    return `https://${trimmed}`;
  }

  return trimmed;
}

export function buildExternalHref(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  try {
    return new URL(normalizeAbsoluteUrl(trimmed)).toString();
  } catch {
    return trimmed;
  }
}

export function buildWhatsAppHref(whatsappHref: string, message?: string) {
  const trimmed = whatsappHref.trim();
  const text = message?.trim() ?? "";

  if (!trimmed) {
    return text ? `https://wa.me/?text=${encodeURIComponent(text)}` : "https://wa.me/";
  }

  const digitsOnly = trimmed.replace(/[^\d]/g, "");
  if (!trimmed.includes("://") && digitsOnly.length >= 7) {
    return text ? `https://wa.me/${digitsOnly}?text=${encodeURIComponent(text)}` : `https://wa.me/${digitsOnly}`;
  }

  try {
    const url = new URL(normalizeAbsoluteUrl(trimmed));

    if (text) {
      url.searchParams.set("text", text);
    }

    return url.toString();
  } catch {
    return trimmed;
  }
}

export function buildMailHref(contactEmail: string, subject?: string, body?: string) {
  const trimmed = contactEmail.trim();

  if (!trimmed) {
    return "#";
  }

  const href = trimmed.startsWith("mailto:") ? trimmed : `mailto:${trimmed}`;

  try {
    const url = new URL(href);

    if (subject) {
      url.searchParams.set("subject", subject);
    }

    if (body) {
      url.searchParams.set("body", body);
    }

    return url.toString();
  } catch {
    const params = new URLSearchParams();

    if (subject) {
      params.set("subject", subject);
    }

    if (body) {
      params.set("body", body);
    }

    const query = params.toString();
    return query ? `${href}?${query}` : href;
  }
}
