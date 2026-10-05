import type { NextRequest } from "next/server";
import type { Locale } from "./i18n";

const maxJsonBodyBytes = Number(process.env.API_JSON_BODY_MAX_BYTES ?? 4096);

export async function readSmallJsonBody(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxJsonBodyBytes) {
    throw new Error("request body too large");
  }

  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > maxJsonBodyBytes) {
    throw new Error("request body too large");
  }
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export function apiErrorMessage(error: unknown, locale: Locale, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const lower = message.toLowerCase();

  if (lower.includes("body too large")) {
    return locale === "es" ? "La petición es demasiado grande." : "The request body is too large.";
  }
  if (lower.includes("private or reserved ip")) {
    return locale === "es" ? "El destino resuelve a una IP privada o reservada y no se permite escanearlo." : "The target resolves to a private or reserved IP address and cannot be scanned.";
  }
  if (lower.includes("does not resolve in dns") || lower.includes("enotfound") || lower.includes("eai_again")) {
    return locale === "es" ? "No se pudo resolver el hostname por DNS." : "The hostname could not be resolved in DNS.";
  }
  if (lower.includes("port is not allowed")) {
    return locale === "es" ? "El destino usa un puerto no permitido para esta comprobación." : "The target uses a port that is not allowed for this check.";
  }
  if (lower.includes("protocol is not allowed") || lower.includes("unsupported redirect protocol")) {
    return locale === "es" ? "El destino usa un protocolo no permitido." : "The target uses a protocol that is not allowed.";
  }
  if (lower.includes("timeout") || lower.includes("etimedout")) {
    return locale === "es" ? "Timeout durante la comprobación del destino." : "Timeout while checking the target.";
  }
  if (lower.includes("econnrefused")) {
    return locale === "es" ? "Conexión rechazada por el destino." : "Connection refused by the target.";
  }
  if (lower.includes("too many redirects")) {
    return locale === "es" ? "Demasiadas redirecciones durante la comprobación." : "Too many redirects while checking the target.";
  }
  if (lower.includes("redirect loop")) {
    return locale === "es" ? "Se detectó un bucle de redirecciones." : "A redirect loop was detected.";
  }

  return message || fallback;
}

export function apiErrorStatus(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (
    message.includes("body too large") ||
    message.includes("private or reserved ip") ||
    message.includes("does not resolve in dns") ||
    message.includes("port is not allowed") ||
    message.includes("protocol is not allowed")
  ) {
    return 400;
  }
  return 502;
}
