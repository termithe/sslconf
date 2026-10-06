import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import { z } from "zod";

const dnsLabel = /^(?!-)[a-z0-9_]{1,63}(?<!-)$/i;
const blockedIpv4Cidrs = [
  "0.0.0.0/8",
  "10.0.0.0/8",
  "100.64.0.0/10",
  "127.0.0.0/8",
  "169.254.0.0/16",
  "172.16.0.0/12",
  "192.0.0.0/24",
  "192.0.2.0/24",
  "192.168.0.0/16",
  "198.18.0.0/15",
  "198.51.100.0/24",
  "203.0.113.0/24",
  "224.0.0.0/4",
  "240.0.0.0/4",
  "255.255.255.255/32"
] as const;

export function isValidHostname(value: string) {
  const normalized = value.trim().replace(/\.$/, "");
  if (normalized.length < 1 || normalized.length > 253) return false;
  if (isIP(normalized)) return true;
  return normalized.split(".").every((part) => dnsLabel.test(part));
}

function ipv4ToInt(ip: string) {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function ipv4InRange(ip: string, cidr: string) {
  const [base, maskRaw] = cidr.split("/");
  const maskBits = Number(maskRaw);
  const mask = maskBits === 0 ? 0 : (0xffffffff << (32 - maskBits)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask);
}

export function isBlockedIp(ip: string) {
  const version = isIP(ip);
  if (version === 4) return blockedIpv4Cidrs.some((range) => ipv4InRange(ip, range));
  if (version === 6) {
    const lower = ip.toLowerCase();
    const expandedLike = lower.split(":").map((part) => part.replace(/^0+/, "") || "0").join(":");
    const hextets = lower.split(":");
    const first = Number.parseInt(hextets[0] || "0", 16);
    const second = Number.parseInt(hextets[1] || "0", 16);
    return (
      lower === "::" ||
      lower === "::1" ||
      expandedLike === "0:0:0:0:0:0:0:0" ||
      expandedLike === "0:0:0:0:0:0:0:1" ||
      lower.startsWith("::") ||
      lower.startsWith("::ffff:") ||
      lower.startsWith("0:0:0:0:0:ffff:") ||
      (first === 0x64 && second === 0xff9b) ||
      first === 0x100 ||
      (first === 0x2001 && second === 0x0db8) ||
      (first >= 0xfc00 && first <= 0xfdff) ||
      (first >= 0xfe80 && first <= 0xfebf) ||
      (first >= 0xff00 && first <= 0xffff)
    );
  }
  return true;
}

export async function resolvePublicHostname(host: string, context = "host") {
  const directIp = isIP(host);
  if (directIp && isBlockedIp(host)) throw new Error(`${context} resolves to a private or reserved IP address.`);
  if (directIp) return [{ address: host, family: directIp }] satisfies LookupAddress[];

  const addresses = await lookup(host, { all: true, verbatim: true });
  if (addresses.length === 0) throw new Error(`${context} does not resolve in DNS.`);
  if (addresses.some((address) => isBlockedIp(address.address))) {
    throw new Error(`${context} resolves to a private or reserved IP address.`);
  }
  return addresses;
}

export async function assertPublicHostname(host: string, context = "host") {
  await resolvePublicHostname(host, context);
}

export async function publicLookupFor(host: string, context = "host") {
  const addresses = await resolvePublicHostname(host, context);
  return function publicLookup(
    _hostname: string,
    options: unknown,
    callback?: (error: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void
  ) {
    const lookupCallback = typeof options === "function" ? options as typeof callback : callback;
    const lookupOptions = typeof options === "object" && options ? options as { family?: number; all?: boolean } : {};
    const family = lookupOptions.family ? Number(lookupOptions.family) : 0;
    const matches = addresses.filter((address) => !family || address.family === family);
    const selected = matches[0] ?? addresses[0];

    if (lookupOptions.all) lookupCallback?.(null, matches.length > 0 ? matches : addresses);
    else lookupCallback?.(null, selected.address, selected.family);
  };
}

export async function assertPublicUrl(url: string, options?: { context?: string; allowedProtocols?: string[]; allowedPorts?: number[] }) {
  const parsed = new URL(url);
  const context = options?.context ?? "URL";
  const allowedProtocols = options?.allowedProtocols ?? ["http:", "https:"];
  if (!allowedProtocols.includes(parsed.protocol)) throw new Error(`${context} protocol is not allowed.`);

  const effectivePort = parsed.port ? Number(parsed.port) : parsed.protocol === "http:" ? 80 : parsed.protocol === "https:" ? 443 : 0;
  const allowedPorts = options?.allowedPorts ?? (parsed.protocol === "http:" ? [80] : [443]);
  if (!allowedPorts.includes(effectivePort)) throw new Error(`${context} port is not allowed.`);

  await assertPublicHostname(parsed.hostname, context);
  return parsed;
}

export async function publicLookupForUrl(url: string, options?: { context?: string; allowedProtocols?: string[]; allowedPorts?: number[] }) {
  const parsed = await assertPublicUrl(url, options);
  return {
    parsed,
    lookup: await publicLookupFor(parsed.hostname, options?.context ?? "URL")
  };
}

function parseHostPort(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return { host: "", port: 443 };

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      return {
        host: url.hostname,
        port: url.port ? Number(url.port) : url.protocol === "http:" ? 80 : 443
      };
    } catch {
      return { host: trimmed, port: 443 };
    }
  }

  if (trimmed.startsWith("[")) {
    const match = trimmed.match(/^\[([^\]]+)\](?::(\d+))?$/);
    return { host: match?.[1] ?? trimmed, port: match?.[2] ? Number(match[2]) : 443 };
  }

  const parts = trimmed.split(":");
  if (parts.length === 2 && /^\d+$/.test(parts[1])) return { host: parts[0], port: Number(parts[1]) };
  return { host: trimmed, port: 443 };
}

export const tlsChainSchema = z.object({
  host: z.string().min(1).max(300),
  includeRoot: z.boolean().optional().default(false),
  locale: z.enum(["en", "es"]).optional().default("en")
}).transform((value) => {
  const parsed = parseHostPort(value.host);
  return {
    host: parsed.host.replace(/\.$/, "").toLowerCase(),
    port: parsed.port,
    includeRoot: value.includeRoot,
    locale: value.locale
  };
}).refine((value) => isValidHostname(value.host), {
  message: "Hostname no válido.",
  path: ["host"]
}).refine((value) => value.port >= 1 && value.port <= 65535, {
  message: "Puerto no válido.",
  path: ["host"]
}).refine((value) => [443, 465, 636, 8443, 993, 995].includes(value.port), {
  message: "Puerto no permitido para esta utilidad.",
  path: ["host"]
});

export const tlsScanSchema = z.object({
  host: z.string().min(1).max(300),
  locale: z.enum(["en", "es"]).optional().default("en")
}).transform((value) => {
  const parsed = parseHostPort(value.host);
  return {
    host: parsed.host.replace(/\.$/, "").toLowerCase(),
    port: parsed.port,
    locale: value.locale
  };
}).refine((value) => isValidHostname(value.host), {
  message: "Hostname no válido.",
  path: ["host"]
}).refine((value) => value.port >= 1 && value.port <= 65535, {
  message: "Puerto no válido.",
  path: ["host"]
}).refine((value) => [443, 8443].includes(value.port), {
  message: "Puerto no permitido para esta utilidad.",
  path: ["host"]
});

export const certificateDecodeSchema = z.object({
  certificate: z.string().min(1).max(65_536).refine((value) => !/-----BEGIN (?:RSA |EC |ENCRYPTED )?PRIVATE KEY-----/i.test(value), {
    message: "Invalid certificate."
  }),
  locale: z.enum(["en", "es"]).optional().default("en")
});
