import type { BodyType, KeyValueEntry } from "./types";

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "-";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export function statusColorClass(status: number | null | undefined): string {
  if (status === null || status === undefined) return "text-red-500";
  if (status < 300) return "text-emerald-500";
  if (status < 400) return "text-sky-500";
  if (status < 500) return "text-amber-500";
  return "text-red-500";
}

export function tryPrettyJson(text: string | null | undefined): { pretty: string; isJson: boolean } {
  if (!text) return { pretty: "", isJson: false };
  try {
    const parsed = JSON.parse(text);
    return { pretty: JSON.stringify(parsed, null, 2), isJson: true };
  } catch {
    return { pretty: text, isJson: false };
  }
}

export type ResponseLanguage = "json" | "xml" | "html" | "text";

export function getHeaderValue(headers: KeyValueEntry[], name: string): string | undefined {
  return headers.find((h) => h.key.trim().toLowerCase() === name.toLowerCase())?.value;
}

function detectResponseLanguage(contentType: string | null | undefined, body: string): ResponseLanguage {
  const ct = (contentType ?? "").toLowerCase();
  if (ct.includes("json")) return "json";
  if (ct.includes("html")) return "html";
  if (ct.includes("xml")) return "xml";

  const trimmed = body.trim();
  if (!trimmed) return "text";
  if (trimmed[0] === "{" || trimmed[0] === "[") return "json";
  if (/^<!doctype html/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) return "html";
  if (trimmed[0] === "<") return "xml";
  return "text";
}

/**
 * Reindents markup (XML/HTML) for display. Deliberately simple — it
 * normalizes whitespace between tags and indents based on open/close
 * tags, without attempting full parsing. Good enough for typical API
 * responses; falls back to the original text if anything looks off.
 */
export function prettyPrintMarkup(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return input;
  try {
    const withBreaks = trimmed.replace(/>\s*</g, "><").replace(/></g, ">\n<");
    const lines = withBreaks.split("\n");
    const PAD = "  ";
    let depth = 0;
    const out: string[] = [];

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;

      const isDeclOrComment = /^<[?!]/.test(line);
      const isClosing = !isDeclOrComment && /^<\//.test(line);
      const isSelfClosing = !isDeclOrComment && /\/>$/.test(line);
      const isOpeningOnly = !isDeclOrComment && !isClosing && !isSelfClosing && /^<[a-zA-Z][^>]*>$/.test(line);

      if (isClosing) depth = Math.max(depth - 1, 0);
      out.push(PAD.repeat(depth) + line);
      if (isOpeningOnly) depth += 1;
    }

    return out.join("\n");
  } catch {
    return input;
  }
}

export function prettyPrintResponseBody(
  contentType: string | null | undefined,
  body: string | null | undefined,
): { pretty: string; language: ResponseLanguage } {
  const text = body ?? "";
  const language = detectResponseLanguage(contentType, text);

  if (language === "json") {
    const { pretty, isJson } = tryPrettyJson(text);
    return { pretty, language: isJson ? "json" : "text" };
  }
  if (language === "xml" || language === "html") {
    return { pretty: prettyPrintMarkup(text), language };
  }
  return { pretty: text, language: "text" };
}

export function defaultContentTypeFor(bodyType: BodyType | null | undefined): string | null {
  switch (bodyType) {
    case "json":
      return "application/json";
    case "form":
      return "application/x-www-form-urlencoded";
    default:
      return null;
  }
}

export function hasContentTypeHeader(headers: KeyValueEntry[]): boolean {
  return headers.some((h) => h.enabled && h.key.trim().toLowerCase() === "content-type");
}

/** Appends a Content-Type header for JSON/form bodies unless the user already set one. */
export function withAutoContentType(
  headers: KeyValueEntry[],
  bodyType: BodyType | null | undefined,
): KeyValueEntry[] {
  const auto = defaultContentTypeFor(bodyType);
  if (!auto || hasContentTypeHeader(headers)) return headers;
  return [...headers, { key: "Content-Type", value: auto, enabled: true }];
}

function buildUrlWithQuery(url: string, params: KeyValueEntry[]): string {
  const enabled = params.filter((p) => p.enabled && p.key.trim().length > 0);
  if (enabled.length === 0) return url;
  const [base, existingQuery] = url.split("?");
  const search = new URLSearchParams(existingQuery ?? "");
  for (const p of enabled) search.append(p.key, p.value);
  const qs = search.toString();
  return qs ? `${base}?${qs}` : base;
}

export function toCurl(request: {
  method: string;
  url: string;
  headers: KeyValueEntry[];
  query_params?: KeyValueEntry[];
  body?: string | null;
}): string {
  const parts = ["curl"];
  parts.push("-X", request.method.toUpperCase());
  const fullUrl = buildUrlWithQuery(request.url, request.query_params ?? []);
  for (const h of request.headers.filter((h) => h.enabled && h.key.trim())) {
    parts.push("-H", `'${h.key}: ${h.value.replace(/'/g, "'\\''")}'`);
  }
  if (request.body) {
    parts.push("-d", `'${request.body.replace(/'/g, "'\\''")}'`);
  }
  parts.push(`'${fullUrl}'`);
  return parts.join(" ");
}
