import dns from "dns/promises";
import net from "net";

/**
 * Checks whether an IPv4 address belongs to a private, loopback, link-local, or reserved range.
 * @param {string} ip
 * @returns {boolean} true if private/internal/reserved
 */
export function isPrivateIPv4(ip) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // invalid IP treated as unsafe
  }

  const [a, b, c, d] = parts;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;

  // 10.0.0.0/8 (Private network)
  if (a === 10) return true;

  // 100.64.0.0/10 (Shared address space / Carrier-grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 169.254.0.0/16 (Link-local / Cloud metadata 169.254.169.254)
  if (a === 169 && b === 254) return true;

  // 172.16.0.0/12 (Private network: 172.16.0.0 - 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.0.0.0/24 (IETF protocol assignments)
  if (a === 192 && b === 0 && c === 0) return true;

  // 192.0.2.0/24 (TEST-NET-1)
  if (a === 192 && b === 0 && c === 2) return true;

  // 192.168.0.0/16 (Private network)
  if (a === 192 && b === 168) return true;

  // 198.18.0.0/15 (Benchmark testing)
  if (a === 198 && (b === 18 || b === 19)) return true;

  // 198.51.100.0/24 (TEST-NET-2)
  if (a === 198 && b === 51 && c === 100) return true;

  // 203.0.113.0/24 (TEST-NET-3)
  if (a === 203 && b === 0 && c === 113) return true;

  // 224.0.0.0/4 (Multicast: 224.0.0.0 - 239.255.255.255)
  if (a >= 224 && a <= 239) return true;

  // 240.0.0.0/4 (Reserved / Future use)
  if (a >= 240) return true;

  return false;
}

/**
 * Checks whether an IPv6 address belongs to a private, loopback, link-local, or reserved range.
 * @param {string} ip
 * @returns {boolean} true if private/internal/reserved
 */
export function isPrivateIPv6(ip) {
  const normalized = ip.toLowerCase().trim();

  // Loopback / Unspecified
  if (normalized === "::1" || normalized === "::") return true;

  // IPv4-mapped IPv6 (::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (normalized.startsWith("::ffff:")) {
    const v4Part = normalized.slice(7);
    if (net.isIPv4(v4Part)) {
      return isPrivateIPv4(v4Part);
    }
  }

  // Unique local addresses (fc00::/7) -> starts with fc or fd
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;

  // Link-local addresses (fe80::/10) -> starts with fe8, fe9, fea, feb
  if (/^fe[89ab]/i.test(normalized)) return true;

  // Discard prefix / documentation
  if (normalized.startsWith("100::") || normalized.startsWith("2001:db8:")) return true;

  return false;
}

/**
 * Validates a URL against SSRF vulnerabilities by parsing and DNS resolving.
 * Throws an Error if the URL is dangerous or resolves to private/internal IPs.
 *
 * @param {string} rawUrl
 * @returns {Promise<{ parsedUrl: URL, ip: string }>}
 */
export async function validateUrlForSSRF(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch (err) {
    throw new Error("Invalid URL format.");
  }

  // Protocol check
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Forbidden protocol "${parsed.protocol}". Only HTTP and HTTPS are allowed.`);
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block obvious internal hosts
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname === "metadata.google.internal" ||
    hostname === "169.254.169.254"
  ) {
    throw new Error(`SSRF Protection: Access to internal host "${hostname}" is blocked.`);
  }

  // If host is a direct IP address
  if (net.isIP(hostname)) {
    if (net.isIPv4(hostname) && isPrivateIPv4(hostname)) {
      throw new Error(`SSRF Protection: Access to private IPv4 address "${hostname}" is blocked.`);
    }
    if (net.isIPv6(hostname) && isPrivateIPv6(hostname)) {
      throw new Error(`SSRF Protection: Access to private IPv6 address "${hostname}" is blocked.`);
    }
    return { parsedUrl: parsed, ip: hostname };
  }

  // Resolve DNS to verify all destination IPs
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      throw new Error(`Could not resolve hostname "${hostname}".`);
    }

    for (const record of addresses) {
      const { address, family } = record;
      if (family === 4 && isPrivateIPv4(address)) {
        throw new Error(`SSRF Protection: Hostname "${hostname}" resolved to private IP "${address}". Access blocked.`);
      }
      if (family === 6 && isPrivateIPv6(address)) {
        throw new Error(`SSRF Protection: Hostname "${hostname}" resolved to private IPv6 "${address}". Access blocked.`);
      }
    }

    return { parsedUrl: parsed, ip: addresses[0].address };
  } catch (err) {
    if (err.message.includes("SSRF Protection")) {
      throw err;
    }
    throw new Error(`DNS resolution failed for "${hostname}": ${err.message}`);
  }
}
