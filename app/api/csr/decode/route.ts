import { NextRequest, NextResponse } from "next/server";
import { apiErrorMessage, apiErrorStatus, readSmallJsonBody } from "@/lib/api-errors";
import { decodeCsr } from "@/lib/csr-decode";
import { createRequestId, logApiEvent, requestHeaders } from "@/lib/api-telemetry";
import { isLocale, type Locale } from "@/lib/i18n";
import { assertRateLimit, clientIpFromRequest, rateLimitHeaders } from "@/lib/rate-limit";
import { csrDecodeSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxCsrBodyBytes = Number(process.env.CSR_DECODE_BODY_MAX_BYTES ?? 70_000);

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = createRequestId();
  const ip = clientIpFromRequest(request);
  const limit = await assertRateLimit(ip, "csr");
  const headers = { ...requestHeaders(requestId), ...rateLimitHeaders(limit) };

  if (!limit.allowed) {
    logApiEvent({ requestId, tool: "csr", status: 429, durationMs: Date.now() - startedAt, clientIp: ip, rateLimitSource: limit.source, rateLimited: true, error: "rate limited" });
    return NextResponse.json({ error: "Rate limit exceeded. Try again later.", requestId }, { status: 429, headers });
  }

  let body: unknown;
  try {
    body = await readSmallJsonBody(request, maxCsrBodyBytes);
  } catch (error) {
    const message = apiErrorMessage(error, "en", "Invalid request.");
    logApiEvent({ requestId, tool: "csr", status: apiErrorStatus(error), durationMs: Date.now() - startedAt, clientIp: ip, rateLimitSource: limit.source, error: message });
    return NextResponse.json({ error: message, requestId }, { status: apiErrorStatus(error), headers });
  }

  const locale: Locale = body && typeof body === "object" && "locale" in body && typeof body.locale === "string" && isLocale(body.locale) ? body.locale : "en";
  const parsed = csrDecodeSchema.safeParse(body);
  if (!parsed.success) {
    const message = locale === "es" ? "Introduce una solicitud CSR PEM o DER codificada en Base64 válida." : "Enter a valid PEM CSR or Base64-encoded DER CSR.";
    logApiEvent({ requestId, tool: "csr", status: 400, durationMs: Date.now() - startedAt, clientIp: ip, rateLimitSource: limit.source, error: message });
    return NextResponse.json({ error: message, requestId }, { status: 400, headers });
  }

  try {
    const csr = decodeCsr(parsed.data.csr, parsed.data.locale);
    logApiEvent({ requestId, tool: "csr", status: 200, durationMs: Date.now() - startedAt, clientIp: ip, rateLimitSource: limit.source });
    return NextResponse.json({ csr }, { headers: { ...headers, "cache-control": "no-store" } });
  } catch (error) {
    const fallback = locale === "es" ? "No se pudo interpretar la solicitud CSR." : "The CSR could not be decoded.";
    const message = apiErrorMessage(error, locale, fallback);
    logApiEvent({ requestId, tool: "csr", status: apiErrorStatus(error), durationMs: Date.now() - startedAt, clientIp: ip, rateLimitSource: limit.source, error: message });
    return NextResponse.json({ error: message, requestId }, { status: apiErrorStatus(error), headers });
  }
}
