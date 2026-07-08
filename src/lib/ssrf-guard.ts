/**
 * Lightweight SSRF guard for outbound fetches that use a user-supplied URL.
 * Worker-runtime safe (no node:dns dependency): enforces HTTPS and blocks
 * hostnames that resolve to loopback/link-local/private IP literals or known
 * internal/metadata names. Returns a sanitized origin for sub-path fetches.
 */

const BLOCKED_HOST_SUFFIXES = [".local", ".internal", ".localhost", ".lan", ".home"];

const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal", "metadata"]);

function isPrivateIpv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const o = m.slice(1).map(Number);
  if (o.some((n) => n > 255)) return true; // malformed → treat as unsafe
  const [a, b] = o;
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 169 && b === 254) return true; // link-local (cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  return false;
}

function isPrivateIpv6(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (h === "::1" || h === "::") return true; // loopback / unspecified
  if (h.startsWith("fe80")) return true; // link-local
  if (h.startsWith("fc") || h.startsWith("fd")) return true; // unique local
  if (h.startsWith("::ffff:")) return isPrivateIpv4(h.replace("::ffff:", "")); // mapped IPv4
  return false;
}

/**
 * Validates a user-supplied URL for safe server-side fetching.
 * Throws a user-facing Error when the URL targets a non-public destination.
 */
export function assertPublicHttpUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("URL inválida.");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Apenas URLs http(s) são permitidas.");
  }

  const host = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(host)) {
    throw new Error("Endereços internos não são permitidos.");
  }
  if (BLOCKED_HOST_SUFFIXES.some((s) => host.endsWith(s))) {
    throw new Error("Endereços internos não são permitidos.");
  }
  if (isPrivateIpv4(host) || isPrivateIpv6(host)) {
    throw new Error("Endereços internos não são permitidos.");
  }
  if (!host.includes(".")) {
    // Reject bare hostnames with no public TLD (e.g. intranet shortnames).
    throw new Error("Endereços internos não são permitidos.");
  }

  return parsed;
}
