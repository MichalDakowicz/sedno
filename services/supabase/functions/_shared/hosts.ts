// The base URL of an LLM provider is typed by the user and called from the server, so it must
// not reach anything inside the home network or the Docker network (SSRF). Public https only.

export class UnsafeUrl extends Error {}

/** The addresses a host name resolves to (A and AAAA). */
export type Resolver = (host: string) => Promise<string[]>;

declare const Deno: { resolveDns(name: string, type: "A" | "AAAA"): Promise<string[]> };

export const resolveHost: Resolver = async (host) => {
  const found = await Promise.all((["A", "AAAA"] as const).map((type) => Deno.resolveDns(host, type).catch(() => [] as string[])));
  return found.flat();
};

function isPrivateV4(ip: string): boolean {
  const [a, b, c] = ip.split(".").map(Number) as [number, number, number];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113)
  );
}

/** True for anything that is not a plain public address (private, loopback, link-local, reserved, mapped). */
export function isPrivateAddress(ip: string): boolean {
  if (!ip.includes(":")) return isPrivateV4(ip);
  // IPv6: only global unicast (2000::/3) counts as public, minus documentation and 6to4 ranges.
  const first = parseInt(ip.split(":")[0] || "0", 16);
  if (!(first >= 0x2000 && first <= 0x3fff)) return true;
  const lower = ip.toLowerCase();
  return lower.startsWith("2001:db8:") || lower.startsWith("2002:");
}

const INTERNAL_SUFFIXES = [".local", ".localhost", ".internal", ".lan", ".home", ".localdomain", ".docker"];

/**
 * Parses a provider base URL and throws UnsafeUrl unless it is public https. Returns it without a
 * trailing slash. `allowedOrigins` are exact origins the server's operator chose (e.g. the home
 * server's Ollama); they skip the https and address checks, nothing else does.
 */
export async function assertPublicUrl(raw: string, resolve: Resolver = resolveHost, allowedOrigins: readonly string[] = []): Promise<string> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrl("not a URL");
  }
  if (url.username || url.password) throw new UnsafeUrl("no credentials in the URL");
  if (url.search || url.hash) throw new UnsafeUrl("no query or fragment");
  if (allowedOrigins.includes(url.origin)) return url.href.replace(/\/+$/, "");
  if (url.protocol !== "https:") throw new UnsafeUrl("must be https");
  if (url.port) throw new UnsafeUrl("default port only");

  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const literal = host.includes(":") || /^\d+\.\d+\.\d+\.\d+$/.test(host);
  if (literal) {
    if (isPrivateAddress(host)) throw new UnsafeUrl("private address");
  } else {
    if (!host.includes(".") || INTERNAL_SUFFIXES.some((s) => host.endsWith(s))) throw new UnsafeUrl("internal host name");
    const addresses = await resolve(host);
    if (!addresses.length) throw new UnsafeUrl("host does not resolve");
    if (addresses.some(isPrivateAddress)) throw new UnsafeUrl("resolves to a private address");
  }
  return url.href.replace(/\/+$/, "");
}
