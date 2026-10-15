import { NextRequest, NextResponse } from "next/server";
import { apiErrorMessage, apiErrorStatus, readSmallJsonBody } from "@/lib/api-errors";
import { cacheHeaders, getOrSetCached } from "@/lib/api-cache";
import { createRequestId, logApiEvent, requestHeaders } from "@/lib/api-telemetry";
import { isLocale, type Locale } from "@/lib/i18n";
import { assertRateLimit, assertTargetRateLimit, clientIpFromRequest, rateLimitHeaders } from "@/lib/rate-limit";
import { validateTlsInstallation } from "@/lib/tls-installation";
import { tlsInstallationSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const cacheTtlSeconds = Number(process.env.TLS_INSTALLATION_CACHE_TTL_SECONDS ?? 300);

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
  const limit = await assertRateLimit(ip, "installation");
  const headers = { ...requestHeaders(requestId), ...rateLimitHeaders(limit) };
  if (!limit.allowed) {
    logApiEvent({ requestId, tool: "installation", status: 429, durationMs: Date.now() - startedAt, clientIp: ip, rateLimitSource: limit.source, rateLimited: true, error: "rate limited" });
    return NextResponse.json({ error: "Rate limit exceeded. Try again later.", requestId }, { status: 429, headers });
  }

  let body: unknown;
  try {
    body = await readSmallJsonBody(request);
  } catch (error) {
    const status = apiErrorStatus(error);
    const message = apiErrorMessage(error, "en", "Invalid request.");
    logApiEvent({ requestId, tool: "installation", status, durationMs: Date.now() - startedAt, clientIp: ip, rateLimitSource: limit.source, error: message });
    return NextResponse.json({ error: message, requestId }, { status, headers });
  }

  const record = body && typeof body === "object" ? body as Record<string, unknown> : null;
  const locale: Locale = record && typeof record.locale === "string" && isLocale(record.locale) ? record.locale : "en";
  const parsed = tlsInstallationSchema.safeParse(body);
  if (!parsed.success) {
    const message = validationError(locale, parsed.error.issues[0]?.message);
    logApiEvent({ requestId, tool: "installation", status: 400, durationMs: Date.now() - startedAt, clientIp: ip, rateLimitSource: limit.source, error: message });
    return NextResponse.json({ error: message, requestId }, { status: 400, headers });
  }

  const targetLimit = await assertTargetRateLimit(parsed.data.host, parsed.data.port, "installation");
  if (!targetLimit.allowed) {
    const targetHeaders = { ...requestHeaders(requestId), ...rateLimitHeaders(targetLimit) };
    const message = parsed.data.locale === "es" ? "Demasiadas comprobaciones sobre este destino. Inténtalo más tarde." : "Too many checks against this target. Try again later.";
    logApiEvent({ requestId, tool: "installation", status: 429, durationMs: Date.now() - startedAt, clientIp: ip, host: parsed.data.host, port: parsed.data.port, rateLimitSource: targetLimit.source, rateLimited: true, error: "target rate limited" });
    return NextResponse.json({ error: message, requestId }, { status: 429, headers: targetHeaders });
  }

  try {
    const cache = await getOrSetCached(`installation:${parsed.data.host}:${parsed.data.port}:${parsed.data.locale}`, cacheTtlSeconds, () => validateTlsInstallation(parsed.data.host, parsed.data.port, parsed.data.locale));
    const cacheState = cache.hit ? "HIT" : cache.inFlight ? "INFLIGHT" : "MISS";
    logApiEvent({ requestId, tool: "installation", status: 200, durationMs: Date.now() - startedAt, clientIp: ip, host: parsed.data.host, port: parsed.data.port, cache: cacheState, rateLimitSource: limit.source });
    return NextResponse.json(cache.value, { headers: { ...headers, ...cacheHeaders(cache) } });
  } catch (error) {
    const status = apiErrorStatus(error);
    const fallback = parsed.data.locale === "es" ? "No se pudo validar la instalación TLS." : "The TLS installation could not be validated.";
    const message = apiErrorMessage(error, parsed.data.locale, fallback);
    logApiEvent({ requestId, tool: "installation", status, durationMs: Date.now() - startedAt, clientIp: ip, host: parsed.data.host, port: parsed.data.port, rateLimitSource: limit.source, error: message });
    return NextResponse.json({ error: message, requestId }, { status, headers });
  }
}
