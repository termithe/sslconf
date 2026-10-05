import { createHash, randomUUID } from "node:crypto";

type ApiLogEvent = {
  requestId: string;
  tool: "scan" | "chain";
  status: number;
  durationMs: number;
  clientIp?: string;
  host?: string;
  port?: number;
  cache?: "HIT" | "MISS" | "INFLIGHT";
  rateLimitSource?: string;
  rateLimited?: boolean;
  error?: string;
};

const logLevel = process.env.SSLCONF_LOG_LEVEL ?? "info";
const logSalt = process.env.SSLCONF_LOG_SALT ?? "sslconf-local";

export function createRequestId() {
  return randomUUID();
}

export function requestHeaders(requestId: string) {
  return {
    "x-sslconf-request-id": requestId
  };
}

function hashClientIp(ip: string | undefined) {
  if (!ip) return undefined;
  return createHash("sha256").update(`${logSalt}:${ip}`).digest("hex").slice(0, 16);
}

export function logApiEvent(event: ApiLogEvent) {
  if (logLevel === "silent") return;

  const { clientIp, ...rest } = event;
  console.info(JSON.stringify({
    event: "sslconf_api_request",
    ...rest,
    client: hashClientIp(clientIp)
  }));
}
