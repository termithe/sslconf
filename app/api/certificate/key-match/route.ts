import { NextRequest, NextResponse } from "next/server";
import { apiErrorMessage, apiErrorStatus, readSmallJsonBody } from "@/lib/api-errors";
import { createRequestId, logApiEvent, requestHeaders } from "@/lib/api-telemetry";
import { isLocale, type Locale } from "@/lib/i18n";
import { matchCertificateAndKey } from "@/lib/key-match";
import { assertRateLimit, clientIpFromRequest, rateLimitHeaders } from "@/lib/rate-limit";
import { certificateKeyMatchSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxBodyBytes = Number(process.env.CERTIFICATE_KEY_MATCH_BODY_MAX_BYTES ?? 180_000);

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = createRequestId();
  const ip = clientIpFromRequest(request);
  const limit = await assertRateLimit(ip, "key-match");
  const headers = { ...requestHeaders(requestId), ...rateLimitHeaders(limit), "cache-control": "no-store" };
  if (!limit.allowed) {
    logApiEvent({ requestId, tool: "key-match", status: 429, durationMs: Date.now() - startedAt, clientIp: ip, rateLimitSource: limit.source, rateLimited: true, error: "rate limited" });
    return NextResponse.json({ error: "Rate limit exceeded. Try again later.", requestId }, { status: 429, headers });
  }

  let body: unknown;
  try {
    body = await readSmallJsonBody(request, maxBodyBytes);
  } catch (error) {
    const message = apiErrorMessage(error, "en", "Invalid request.");
    logApiEvent({ requestId, tool: "key-match", status: apiErrorStatus(error), durationMs: Date.now() - startedAt, clientIp: ip, rateLimitSource: limit.source, error: message });
    return NextResponse.json({ error: message, requestId }, { status: apiErrorStatus(error), headers });
  }

  const locale: Locale = body && typeof body === "object" && "locale" in body && typeof body.locale === "string" && isLocale(body.locale) ? body.locale : "en";
  const parsed = certificateKeyMatchSchema.safeParse(body);
  if (!parsed.success) {
    const message = locale === "es" ? "Introduce un certificado PEM y una clave privada PEM válidos." : "Enter a valid PEM certificate and PEM private key.";
    logApiEvent({ requestId, tool: "key-match", status: 400, durationMs: Date.now() - startedAt, clientIp: ip, rateLimitSource: limit.source, error: message });
    return NextResponse.json({ error: message, requestId }, { status: 400, headers });
  }

  try {
    const result = matchCertificateAndKey(parsed.data.certificate, parsed.data.privateKey);
    logApiEvent({ requestId, tool: "key-match", status: 200, durationMs: Date.now() - startedAt, clientIp: ip, rateLimitSource: limit.source });
    return NextResponse.json({ result }, { headers });
  } catch (error) {
    const fallback = locale === "es" ? "No se pudo comprobar el certificado y la clave privada." : "Could not check the certificate and private key.";
    const message = error instanceof Error && error.message.toLowerCase().includes("encrypted private key")
      ? locale === "es" ? "Las claves privadas PEM cifradas no son compatibles con esta comprobación." : "Encrypted PEM private keys are not supported by this check."
      : apiErrorMessage(error, locale, fallback);
    logApiEvent({ requestId, tool: "key-match", status: apiErrorStatus(error), durationMs: Date.now() - startedAt, clientIp: ip, rateLimitSource: limit.source, error: message });
    return NextResponse.json({ error: message, requestId }, { status: apiErrorStatus(error), headers });
  }
}
