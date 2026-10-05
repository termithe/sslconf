import { NextRequest, NextResponse } from "next/server";
import { apiErrorMessage, apiErrorStatus, readSmallJsonBody } from "@/lib/api-errors";
import { createRequestId, logApiEvent, requestHeaders } from "@/lib/api-telemetry";
import { cacheHeaders, getOrSetCached } from "@/lib/api-cache";
import { isLocale, type Locale } from "@/lib/i18n";
import { assertRateLimit, assertTargetRateLimit, clientIpFromRequest, rateLimitHeaders } from "@/lib/rate-limit";
import { inspectTlsChain } from "@/lib/tls";
import { tlsChainSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const chainCacheTtlSeconds = Number(process.env.TLS_CHAIN_CACHE_TTL_SECONDS ?? 600);

function validationError(locale: Locale, message?: string) {
  if (locale === "es") return message ?? "Entrada no válida.";
  if (message === "Hostname no válido.") return "Invalid hostname.";
  if (message === "Puerto no válido.") return "Invalid port.";
  if (message === "Puerto no permitido para esta utilidad.") return "Port not allowed for this utility.";
  return "Invalid input.";
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = createRequestId();
  const ip = clientIpFromRequest(request);
  const limit = await assertRateLimit(ip, "chain");
  const baseHeaders = {
    ...requestHeaders(requestId),
    ...rateLimitHeaders(limit)
  };
  if (!limit.allowed) {
    logApiEvent({ requestId, tool: "chain", status: 429, durationMs: Date.now() - startedAt, clientIp: ip, rateLimitSource: limit.source, rateLimited: true, error: "rate limited" });
    return NextResponse.json({ error: "Rate limit excedido. Inténtalo más tarde.", requestId }, { status: 429, headers: baseHeaders });
  }

  let body: unknown;
  try {
    body = await readSmallJsonBody(request);
  } catch (error) {
    const locale: Locale = "en";
    const status = apiErrorStatus(error);
    const message = apiErrorMessage(error, locale, "Invalid request.");
    logApiEvent({ requestId, tool: "chain", status, durationMs: Date.now() - startedAt, clientIp: ip, rateLimitSource: limit.source, error: message });
    return NextResponse.json({ error: message, requestId }, { status, headers: baseHeaders });
  }
  const bodyRecord = body && typeof body === "object" ? body as Record<string, unknown> : null;
  const locale: Locale = bodyRecord && typeof bodyRecord.locale === "string" && isLocale(bodyRecord.locale) ? bodyRecord.locale : "en";
  const parsed = tlsChainSchema.safeParse(body);
  if (!parsed.success) {
    const message = validationError(locale, parsed.error.issues[0]?.message);
    logApiEvent({ requestId, tool: "chain", status: 400, durationMs: Date.now() - startedAt, clientIp: ip, rateLimitSource: limit.source, error: message });
    return NextResponse.json({ error: message, requestId }, { status: 400, headers: baseHeaders });
  }

  const targetLimit = await assertTargetRateLimit(parsed.data.host, parsed.data.port, "chain");
  if (!targetLimit.allowed) {
    const headers = { ...requestHeaders(requestId), ...rateLimitHeaders(targetLimit) };
    const message = parsed.data.locale === "es" ? "Demasiadas comprobaciones sobre este destino. Inténtalo más tarde." : "Too many checks against this target. Try again later.";
    logApiEvent({ requestId, tool: "chain", status: 429, durationMs: Date.now() - startedAt, clientIp: ip, host: parsed.data.host, port: parsed.data.port, rateLimitSource: targetLimit.source, rateLimited: true, error: "target rate limited" });
    return NextResponse.json({ error: message, requestId }, { status: 429, headers });
  }

  try {
    const cacheKey = `chain:${parsed.data.host}:${parsed.data.port}:${parsed.data.includeRoot ? "root" : "intermediate"}:${parsed.data.locale}`;
    const result = await getOrSetCached(cacheKey, chainCacheTtlSeconds, () => inspectTlsChain(parsed.data.host, parsed.data.port, parsed.data.includeRoot, parsed.data.locale));
    const cache = result.hit ? "HIT" : result.inFlight ? "INFLIGHT" : "MISS";
    logApiEvent({ requestId, tool: "chain", status: 200, durationMs: Date.now() - startedAt, clientIp: ip, host: parsed.data.host, port: parsed.data.port, cache, rateLimitSource: limit.source });
    return NextResponse.json(result.value, {
      headers: {
        ...baseHeaders,
        ...cacheHeaders(result)
      }
    });
  } catch (error) {
    const fallback = parsed.data.locale === "es" ? "No se pudo inspeccionar la cadena TLS." : "The TLS chain could not be inspected.";
    const status = apiErrorStatus(error);
    const message = apiErrorMessage(error, parsed.data.locale, fallback);
    logApiEvent({ requestId, tool: "chain", status, durationMs: Date.now() - startedAt, clientIp: ip, host: parsed.data.host, port: parsed.data.port, rateLimitSource: limit.source, error: message });
    return NextResponse.json({ error: message, requestId }, { status, headers: baseHeaders });
  }
}
