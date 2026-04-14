import { isIPv4, isIPv6 } from "net";

/**
 * Block SSRF-prone destinations: loopback, RFC1918, link-local, ULA, metadata hosts, etc.
 * Used for outbound HTTPS from the app (user webhooks, env notification URL).
 */
export function isBlockedOutboundHost(hostname: string): boolean {
  const h = hostname.trim().toLowerCase();
  if (!h) return true;
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local")) return true;
  if (h === "metadata.google.internal" || h === "metadata") return true;

  if (isIPv4(h)) {
    return isBlockedIpv4(h);
  }
  if (h.includes(":") || isIPv6(h)) {
    return isBlockedIpv6(h);
  }
  return false;
}

function isBlockedIpv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts;
  if (a === 0 || a === 127) return true;
  if (a === 10) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0 && parts[2] === 0) return true;
  if (a === 192 && b === 0 && parts[2] === 2) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a === 198 && b === 51 && parts[2] === 100) return true;
  if (a === 203 && b === 0 && parts[2] === 113) return true;
  if (a === 224 || a >= 240) return true;
  return false;
}

function isBlockedIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1") return true;
  if (lower.startsWith("fe80:")) return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  if (lower.startsWith("ff")) return true;
  if (lower.startsWith("::ffff:")) {
    const v4 = lower.slice("::ffff:".length);
    return isBlockedIpv4(v4);
  }
  return false;
}

/** Parse https URL and throw if host is missing, not https, or blocked. */
export function assertPublicHttpsUrl(urlString: string): URL {
  let u: URL;
  try {
    u = new URL(urlString.trim());
  } catch {
    throw new Error("INVALID_WEBHOOK_URL");
  }
  if (u.protocol !== "https:") {
    throw new Error("INVALID_WEBHOOK_URL");
  }
  if (!u.hostname || isBlockedOutboundHost(u.hostname)) {
    throw new Error("WEBHOOK_URL_BLOCKED");
  }
  return u;
}
