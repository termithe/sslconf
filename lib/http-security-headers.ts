import { request as httpsRequest } from "node:https";
import type { IncomingHttpHeaders } from "node:http";
import type { Locale } from "./i18n";
import type { HttpSecurityHeaderCheck, HttpSecurityHeadersResponse } from "./types";
import { publicLookupForUrl } from "./validation";

const timeoutMs = Number(process.env.HTTP_HEADERS_TIMEOUT_MS ?? 6000);
const maxRedirects = Number(process.env.HTTP_HEADERS_MAX_REDIRECTS ?? 6);
const userAgent = process.env.TLS_SCAN_USER_AGENT ?? "SSLConf/0.1 (+https://sslconf.com)";

type HeaderResponse = {
  url: string;
  statusCode: number;
  headers: IncomingHttpHeaders;
  redirects: number;
};

function hostForUrl(host: string) {
  return host.includes(":") ? `[${host}]` : host;
}

function firstHeader(headers: IncomingHttpHeaders, name: string) {
  const value = headers[name];
  return Array.isArray(value) ? value.join(", ") : value ?? "";
}

function clipped(value: string, max = 400) {
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

async function getHeaders(url: string, redirects = 0): Promise<HeaderResponse> {
  if (redirects > maxRedirects) throw new Error("too many redirects");
  const { parsed, lookup } = await publicLookupForUrl(url, {
    context: "HTTP security headers target",
    allowedProtocols: ["https:"],
    allowedPorts: [443, 8443]
  });

  return new Promise((resolve, reject) => {
    const request = httpsRequest({
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port || undefined,
      path: `${parsed.pathname}${parsed.search}`,
      method: "GET",
      timeout: timeoutMs,
      lookup,
      headers: { "user-agent": userAgent, accept: "text/html,application/xhtml+xml" }
    }, (response) => {
      response.resume();
      const location = firstHeader(response.headers, "location");
      if ([301, 302, 303, 307, 308].includes(response.statusCode ?? 0) && location) {
        const target = new URL(location, url);
        if (target.protocol !== "https:") {
          reject(new Error("unsupported redirect protocol"));
          return;
        }
        getHeaders(target.toString(), redirects + 1).then(resolve, reject);
        return;
      }
      resolve({ url, statusCode: response.statusCode ?? 0, headers: response.headers, redirects });
    });
    request.once("timeout", () => request.destroy(new Error("HTTP headers request timeout")));
    request.once("error", reject);
    request.end();
  });
}

function copy(locale: Locale) {
  const es = locale === "es";
  return {
    hsts: es ? ["HSTS fuerte", "HSTS protege futuras visitas contra downgrade a HTTP."] : ["Strong HSTS", "HSTS protects future visits against HTTP downgrade."],
    hstsPartial: es ? ["HSTS sin cobertura de subdominios", "La duración es adecuada, pero falta includeSubDomains para proteger los subdominios compatibles."] : ["HSTS without subdomain coverage", "The duration is adequate, but includeSubDomains is missing for compatible subdomains."],
    hstsMissing: es ? ["HSTS ausente o corto", "Envía Strict-Transport-Security con una duración larga en todas las respuestas HTTPS."] : ["HSTS missing or short", "Send Strict-Transport-Security with a long duration on every HTTPS response."],
    csp: es ? ["Content Security Policy", "La respuesta publica una política CSP."] : ["Content Security Policy", "The response publishes a CSP policy."],
    cspWeak: es ? ["CSP permisiva", "La política contiene unsafe-inline o unsafe-eval; revísala antes de endurecerla."] : ["Permissive CSP", "The policy contains unsafe-inline or unsafe-eval; review it before hardening."],
    cspMissing: es ? ["CSP no publicada", "Content-Security-Policy reduce el impacto de inyecciones de contenido y scripts."] : ["CSP not published", "Content-Security-Policy reduces the impact of injected content and scripts."],
    frame: es ? ["Protección contra clickjacking", "La respuesta restringe quién puede embeberla en un frame."] : ["Clickjacking protection", "The response restricts who can embed it in a frame."],
    frameMissing: es ? ["Sin protección de frames", "Define CSP frame-ancestors o X-Frame-Options para limitar el clickjacking."] : ["Missing frame protection", "Define CSP frame-ancestors or X-Frame-Options to limit clickjacking."],
    nosniff: es ? ["MIME sniffing bloqueado", "X-Content-Type-Options: nosniff está activo."] : ["MIME sniffing blocked", "X-Content-Type-Options: nosniff is active."],
    nosniffMissing: es ? ["MIME sniffing no bloqueado", "Añade X-Content-Type-Options: nosniff."] : ["MIME sniffing not blocked", "Add X-Content-Type-Options: nosniff."],
    referrer: es ? ["Referrer-Policy segura", "La respuesta limita la información de referencia compartida."] : ["Secure Referrer-Policy", "The response limits the referrer information shared."],
    referrerMissing: es ? ["Referrer-Policy ausente o permisiva", "Usa strict-origin-when-cross-origin o una política más restrictiva."] : ["Referrer-Policy missing or permissive", "Use strict-origin-when-cross-origin or a stricter policy."],
    permissions: es ? ["Permissions-Policy publicada", "La respuesta restringe capacidades sensibles del navegador."] : ["Permissions-Policy published", "The response restricts sensitive browser capabilities."],
    permissionsMissing: es ? ["Permissions-Policy no publicada", "No es obligatoria, pero permite limitar APIs del navegador que no utiliza la aplicación."] : ["Permissions-Policy not published", "It is not mandatory, but it can limit browser APIs the application does not use."],
    coop: es ? ["Aislamiento de ventana", "Cross-Origin-Opener-Policy está definido."] : ["Window isolation", "Cross-Origin-Opener-Policy is defined."],
    coopMissing: es ? ["Aislamiento de ventana no definido", "Es una mejora opcional para aplicaciones que manejan contenido sensible."] : ["Window isolation not defined", "This is an optional improvement for applications handling sensitive content."],
    cookiesSecure: es ? ["Cookies seguras", "Las cookies observadas incluyen Secure, HttpOnly y SameSite."] : ["Secure cookies", "Observed cookies include Secure, HttpOnly and SameSite."],
    cookiesWeak: es ? ["Cookies con atributos incompletos", "Alguna cookie observada no incluye Secure, HttpOnly o SameSite."] : ["Cookies with incomplete attributes", "One or more observed cookies lack Secure, HttpOnly or SameSite."],
    cookiesNone: es ? ["Sin cookies observadas", "La respuesta analizada no emitió Set-Cookie; no se evalúa una política de cookies."] : ["No cookies observed", "The scanned response did not emit Set-Cookie, so no cookie policy is assessed."]
  };
}

function check(id: HttpSecurityHeaderCheck["id"], status: HttpSecurityHeaderCheck["status"], value: string[]) {
  return { id, status, title: value[0], detail: value[1] };
}

function hstsDuration(value: string) {
  const age = value.match(/max-age\s*=\s*(\d+)/i);
  return age ? Number(age[1]) : 0;
}

export async function analyzeHttpSecurityHeaders(host: string, port: number, locale: Locale = "en"): Promise<HttpSecurityHeadersResponse> {
  const response = await getHeaders(`https://${hostForUrl(host)}${port === 443 ? "" : `:${port}`}/`);
  const hsts = firstHeader(response.headers, "strict-transport-security");
  const csp = firstHeader(response.headers, "content-security-policy");
  const xfo = firstHeader(response.headers, "x-frame-options");
  const nosniff = firstHeader(response.headers, "x-content-type-options");
  const referrer = firstHeader(response.headers, "referrer-policy");
  const permissions = firstHeader(response.headers, "permissions-policy");
  const coop = firstHeader(response.headers, "cross-origin-opener-policy");
  const cookies = response.headers["set-cookie"] ?? [];
  const text = copy(locale);
  const checks: HttpSecurityHeaderCheck[] = [];

  const hstsAge = hstsDuration(hsts);
  checks.push(check("hsts", hstsAge < 15_552_000 ? "fail" : /includesubdomains/i.test(hsts) ? "pass" : "warning", hstsAge < 15_552_000 ? text.hstsMissing : /includesubdomains/i.test(hsts) ? text.hsts : text.hstsPartial));
  if (!csp) checks.push(check("csp", "fail", text.cspMissing));
  else checks.push(check("csp", /unsafe-(?:inline|eval)/i.test(csp) ? "warning" : "pass", /unsafe-(?:inline|eval)/i.test(csp) ? text.cspWeak : text.csp));
  const frameProtected = /frame-ancestors/i.test(csp) || /^(deny|sameorigin)$/i.test(xfo.trim());
  checks.push(check("frame-protection", frameProtected ? "pass" : "fail", frameProtected ? text.frame : text.frameMissing));
  checks.push(check("nosniff", /nosniff/i.test(nosniff) ? "pass" : "fail", /nosniff/i.test(nosniff) ? text.nosniff : text.nosniffMissing));
  const safeReferrer = /^(no-referrer|same-origin|strict-origin|strict-origin-when-cross-origin)$/i.test(referrer.trim());
  checks.push(check("referrer-policy", safeReferrer ? "pass" : "warning", safeReferrer ? text.referrer : text.referrerMissing));
  checks.push(check("permissions-policy", permissions ? "pass" : "warning", permissions ? text.permissions : text.permissionsMissing));
  checks.push(check("coop", coop ? "pass" : "info", coop ? text.coop : text.coopMissing));
  const cookieFlags = cookies.map((cookie) => /;\s*secure(?:;|$)/i.test(cookie) && /;\s*httponly(?:;|$)/i.test(cookie) && /;\s*samesite=/i.test(cookie));
  checks.push(check("cookies", cookies.length === 0 ? "info" : cookieFlags.every(Boolean) ? "pass" : "warning", cookies.length === 0 ? text.cookiesNone : cookieFlags.every(Boolean) ? text.cookiesSecure : text.cookiesWeak));

  const penalties = checks.reduce((total, item) => total + (item.status === "fail" ? item.id === "hsts" || item.id === "csp" ? 20 : item.id === "frame-protection" ? 15 : 10 : item.status === "warning" ? item.id === "permissions-policy" || item.id === "cookies" ? 5 : 8 : 0), 0);
  const score = Math.max(0, 100 - penalties);
  const grade = score === 100 ? "A+" : score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : "D";
  const observed = Object.fromEntries(Object.entries({ "strict-transport-security": hsts, "content-security-policy": csp, "x-frame-options": xfo, "x-content-type-options": nosniff, "referrer-policy": referrer, "permissions-policy": permissions, "cross-origin-opener-policy": coop }).filter(([, value]) => value).map(([name, value]) => [name, clipped(value)]));

  return { queryId: crypto.randomUUID(), host, port, score, grade, assessedAt: new Date().toISOString(), finalUrl: response.url, statusCode: response.statusCode, redirects: response.redirects, checks, observed };
}
