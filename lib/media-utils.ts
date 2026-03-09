export type ResolvedMediaKind = "empty" | "css" | "image" | "video" | "audio" | "pdf" | "file";

export type ResolvedMedia = {
  kind: ResolvedMediaKind;
  src: string;
  label: string;
  extension: string;
};

const imageExtensions = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "avif"]);
const videoExtensions = new Set(["mp4", "mov", "webm", "ogg", "m4v", "avi", "mkv"]);
const audioExtensions = new Set(["mp3", "wav", "aac", "m4a", "ogg", "flac"]);

export const builtInIconKeys = [
  "clipboard",
  "tracking",
  "support",
  "quote",
  "route",
  "delivery",
  "freight",
  "express",
  "warehouse"
] as const;

function normalizeLabel(label: string) {
  return label.toUpperCase() || "FILE";
}

function extensionFromUrl(source: string) {
  const withoutQuery = source.split("?")[0]?.split("#")[0] ?? source;
  const lastSegment = withoutQuery.split("/").pop() ?? "";
  const extension = lastSegment.includes(".") ? lastSegment.split(".").pop() ?? "" : "";
  return extension.toLowerCase();
}

function mediaFromMime(source: string) {
  const mime = source.slice(5).split(";")[0]?.toLowerCase() ?? "";
  const subtype = mime.split("/")[1] ?? "";

  if (mime.startsWith("image/")) {
    return {
      kind: "image" as const,
      label: normalizeLabel(subtype || "image"),
      extension: subtype
    };
  }

  if (mime.startsWith("video/")) {
    return {
      kind: "video" as const,
      label: normalizeLabel(subtype || "video"),
      extension: subtype
    };
  }

  if (mime.startsWith("audio/")) {
    return {
      kind: "audio" as const,
      label: normalizeLabel(subtype || "audio"),
      extension: subtype
    };
  }

  if (mime === "application/pdf") {
    return {
      kind: "pdf" as const,
      label: "PDF",
      extension: "pdf"
    };
  }

  return {
    kind: "file" as const,
    label: normalizeLabel(subtype || mime || "file"),
    extension: subtype || "file"
  };
}

export function resolveMediaSource(value?: string | null): ResolvedMedia {
  const source = value?.trim() ?? "";

  if (!source) {
    return {
      kind: "empty",
      src: "",
      label: "No media",
      extension: ""
    };
  }

  if (/^(linear-gradient|radial-gradient|conic-gradient|url\()/i.test(source)) {
    return {
      kind: "css",
      src: source,
      label: "Background",
      extension: "css"
    };
  }

  if (source.startsWith("data:")) {
    const media = mediaFromMime(source);
    return {
      ...media,
      src: source
    };
  }

  const extension = extensionFromUrl(source);

  if (imageExtensions.has(extension)) {
    return {
      kind: "image",
      src: source,
      label: normalizeLabel(extension || "image"),
      extension
    };
  }

  if (videoExtensions.has(extension)) {
    return {
      kind: "video",
      src: source,
      label: normalizeLabel(extension || "video"),
      extension
    };
  }

  if (audioExtensions.has(extension)) {
    return {
      kind: "audio",
      src: source,
      label: normalizeLabel(extension || "audio"),
      extension
    };
  }

  if (extension === "pdf") {
    return {
      kind: "pdf",
      src: source,
      label: "PDF",
      extension
    };
  }

  return {
    kind: "file",
    src: source,
    label: normalizeLabel(extension || "file"),
    extension: extension || "file"
  };
}

export function mediaSourceToBackground(value?: string | null) {
  const media = resolveMediaSource(value);

  if (media.kind === "css") {
    return media.src;
  }

  if (media.kind === "image") {
    return `url("${media.src.replace(/"/g, '\\"')}")`;
  }

  return undefined;
}
