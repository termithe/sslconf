import { NextRequest, NextResponse } from "next/server";
import { apiErrorMessage, apiErrorStatus, readSmallJsonBody } from "@/lib/api-errors";
import { decodeCertificate } from "@/lib/certificate-decode";
import { createRequestId, logApiEvent, requestHeaders } from "@/lib/api-telemetry";
import { isLocale, type Locale } from "@/lib/i18n";
import { assertRateLimit, clientIpFromRequest, rateLimitHeaders } from "@/lib/rate-limit";
import { certificateDecodeSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxDecodeBodyBytes = Number(process.env.CERTIFICATE_DECODE_BODY_MAX_BYTES ?? 70_000);

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = createRequestId();
  const ip = clientIpFromRequest(request);
  const limit = await assertRateLimit(ip, "decode");
  const headers = { ...requestHeaders(requestId), ...rateLimitHeaders(limit) };

  if (!limit.allowed) {
    logApiEvent({ requestId, tool: "decode", status: 429, durationMs: Date.now() - startedAt, clientIp: ip, rateLimitSource: limit.source, rateLimited: true, error: "rate limited" });
    return NextResponse.json({ error: "Rate limit exceeded. Try again later.", requestId }, { status: 429, headers });
  }

  let body: unknown;
  try {
    body = await readSmallJsonBody(request, maxDecodeBodyBytes);
  } catch (error) {
    const message = apiErrorMessage(error, "en", "Invalid request.");
    logApiEvent({ requestId, tool: "decode", status: apiErrorStatus(error), durationMs: Date.now() - startedAt, clientIp: ip, rateLimitSource: limit.source, error: message });
    return NextResponse.json({ error: message, requestId }, { status: apiErrorStatus(error), headers });
  }

  const locale: Locale = body && typeof body === "object" && "locale" in body && typeof body.locale === "string" && isLocale(body.locale) ? body.locale : "en";
  const parsed = certificateDecodeSchema.safeParse(body);
  if (!parsed.success) {
    const message = locale === "es" ? "Introduce un certificado PEM o DER codificado en Base64 válido." : "Enter a valid PEM certificate or Base64-encoded DER certificate.";
    logApiEvent({ requestId, tool: "decode", status: 400, durationMs: Date.now() - startedAt, clientIp: ip, rateLimitSource: limit.source, error: message });
    return NextResponse.json({ error: message, requestId }, { status: 400, headers });
  }

  try {
    const certificate = decodeCertificate(parsed.data.certificate);
    logApiEvent({ requestId, tool: "decode", status: 200, durationMs: Date.now() - startedAt, clientIp: ip, rateLimitSource: limit.source });
    return NextResponse.json({ certificate }, { headers: { ...headers, "cache-control": "no-store" } });
  } catch (error) {
    const fallback = locale === "es" ? "No se pudo interpretar el certificado." : "The certificate could not be decoded.";
    const message = apiErrorMessage(error, locale, fallback);
    logApiEvent({ requestId, tool: "decode", status: apiErrorStatus(error), durationMs: Date.now() - startedAt, clientIp: ip, rateLimitSource: limit.source, error: message });
    return NextResponse.json({ error: message, requestId }, { status: apiErrorStatus(error), headers });
  }
}
