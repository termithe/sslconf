import { resolveCaa } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request } from "node:https";
import { isIP } from "node:net";
import tls from "node:tls";
import { createHash, X509Certificate } from "node:crypto";
import forge from "node-forge";
import type { Locale } from "./i18n";
import { getServerCertificates, inspectTlsChain, verifyServerTrust } from "./tls";
import { assertPublicHostname, publicLookupFor, publicLookupForUrl, resolvePublicHostname } from "./validation";
import type { Tls12CipherSuite, TlsGradeItem, TlsProtocolDetails, TlsProtocolName, TlsProtocolProbe, TlsRecommendation, TlsRedirectCheck, TlsScanFinding, TlsScanResponse } from "./types";

const scanTimeoutMs = Number(process.env.TLS_SCAN_TIMEOUT_MS ?? 8000);
const httpTimeoutMs = Number(process.env.TLS_SCAN_HTTP_TIMEOUT_MS ?? 6000);
const maxRedirects = Number(process.env.TLS_SCAN_MAX_REDIRECTS ?? 6);
const userAgent = process.env.TLS_SCAN_USER_AGENT ?? "SSLConf/0.1 (+https://sslconf.com)";
const cipherProbeConcurrency = Number(process.env.TLS_SCAN_CIPHER_CONCURRENCY ?? 6);
const ocspTimeoutMs = Number(process.env.TLS_SCAN_OCSP_TIMEOUT_MS ?? 6000);
const maxOcspBytes = Number(process.env.TLS_SCAN_OCSP_MAX_BYTES ?? 250_000);
const hstsPreloadTimeoutMs = Number(process.env.TLS_SCAN_HSTS_PRELOAD_TIMEOUT_MS ?? 5000);
const maxHstsPreloadBytes = Number(process.env.TLS_SCAN_HSTS_PRELOAD_MAX_BYTES ?? 50_000);

const protocolVersions: Array<{ name: TlsProtocolName; minVersion: tls.SecureVersion; maxVersion: tls.SecureVersion }> = [
  { name: "TLSv1", minVersion: "TLSv1", maxVersion: "TLSv1" },
  { name: "TLSv1.1", minVersion: "TLSv1.1", maxVersion: "TLSv1.1" },
  { name: "TLSv1.2", minVersion: "TLSv1.2", maxVersion: "TLSv1.2" },
  { name: "TLSv1.3", minVersion: "TLSv1.3", maxVersion: "TLSv1.3" }
];

const tls12CipherCatalog: Array<Omit<Tls12CipherSuite, "weak" | "weakness">> = [
  { opensslName: "ECDHE-ECDSA-AES256-GCM-SHA384", name: "TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384", keyExchange: "ECDHE", authentication: "ECDSA", encryption: "AES-GCM", bits: 256, forwardSecrecy: true, aead: true },
  { opensslName: "ECDHE-ECDSA-AES128-GCM-SHA256", name: "TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256", keyExchange: "ECDHE", authentication: "ECDSA", encryption: "AES-GCM", bits: 128, forwardSecrecy: true, aead: true },
  { opensslName: "ECDHE-ECDSA-CHACHA20-POLY1305", name: "TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256", keyExchange: "ECDHE", authentication: "ECDSA", encryption: "CHACHA20-POLY1305", bits: 256, forwardSecrecy: true, aead: true },
  { opensslName: "ECDHE-RSA-AES256-GCM-SHA384", name: "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384", keyExchange: "ECDHE", authentication: "RSA", encryption: "AES-GCM", bits: 256, forwardSecrecy: true, aead: true },
  { opensslName: "ECDHE-RSA-AES128-GCM-SHA256", name: "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256", keyExchange: "ECDHE", authentication: "RSA", encryption: "AES-GCM", bits: 128, forwardSecrecy: true, aead: true },
  { opensslName: "ECDHE-RSA-CHACHA20-POLY1305", name: "TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256", keyExchange: "ECDHE", authentication: "RSA", encryption: "CHACHA20-POLY1305", bits: 256, forwardSecrecy: true, aead: true },
  { opensslName: "DHE-RSA-AES256-GCM-SHA384", name: "TLS_DHE_RSA_WITH_AES_256_GCM_SHA384", keyExchange: "DHE", authentication: "RSA", encryption: "AES-GCM", bits: 256, forwardSecrecy: true, aead: true },
  { opensslName: "DHE-RSA-AES128-GCM-SHA256", name: "TLS_DHE_RSA_WITH_AES_128_GCM_SHA256", keyExchange: "DHE", authentication: "RSA", encryption: "AES-GCM", bits: 128, forwardSecrecy: true, aead: true },
  { opensslName: "ECDHE-ECDSA-AES256-SHA384", name: "TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA384", keyExchange: "ECDHE", authentication: "ECDSA", encryption: "AES-CBC", bits: 256, forwardSecrecy: true, aead: false },
  { opensslName: "ECDHE-ECDSA-AES128-SHA256", name: "TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA256", keyExchange: "ECDHE", authentication: "ECDSA", encryption: "AES-CBC", bits: 128, forwardSecrecy: true, aead: false },
  { opensslName: "ECDHE-RSA-AES256-SHA384", name: "TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA384", keyExchange: "ECDHE", authentication: "RSA", encryption: "AES-CBC", bits: 256, forwardSecrecy: true, aead: false },
  { opensslName: "ECDHE-RSA-AES128-SHA256", name: "TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256", keyExchange: "ECDHE", authentication: "RSA", encryption: "AES-CBC", bits: 128, forwardSecrecy: true, aead: false },
  { opensslName: "ECDHE-RSA-AES256-SHA", name: "TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA", keyExchange: "ECDHE", authentication: "RSA", encryption: "AES-CBC", bits: 256, forwardSecrecy: true, aead: false },
  { opensslName: "ECDHE-RSA-AES128-SHA", name: "TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA", keyExchange: "ECDHE", authentication: "RSA", encryption: "AES-CBC", bits: 128, forwardSecrecy: true, aead: false },
  { opensslName: "DHE-RSA-AES256-SHA256", name: "TLS_DHE_RSA_WITH_AES_256_CBC_SHA256", keyExchange: "DHE", authentication: "RSA", encryption: "AES-CBC", bits: 256, forwardSecrecy: true, aead: false },
  { opensslName: "DHE-RSA-AES128-SHA256", name: "TLS_DHE_RSA_WITH_AES_128_CBC_SHA256", keyExchange: "DHE", authentication: "RSA", encryption: "AES-CBC", bits: 128, forwardSecrecy: true, aead: false },
  { opensslName: "AES256-GCM-SHA384", name: "TLS_RSA_WITH_AES_256_GCM_SHA384", keyExchange: "RSA", authentication: "RSA", encryption: "AES-GCM", bits: 256, forwardSecrecy: false, aead: true },
  { opensslName: "AES128-GCM-SHA256", name: "TLS_RSA_WITH_AES_128_GCM_SHA256", keyExchange: "RSA", authentication: "RSA", encryption: "AES-GCM", bits: 128, forwardSecrecy: false, aead: true },
  { opensslName: "AES256-SHA256", name: "TLS_RSA_WITH_AES_256_CBC_SHA256", keyExchange: "RSA", authentication: "RSA", encryption: "AES-CBC", bits: 256, forwardSecrecy: false, aead: false },
  { opensslName: "AES128-SHA256", name: "TLS_RSA_WITH_AES_128_CBC_SHA256", keyExchange: "RSA", authentication: "RSA", encryption: "AES-CBC", bits: 128, forwardSecrecy: false, aead: false },
  { opensslName: "AES256-SHA", name: "TLS_RSA_WITH_AES_256_CBC_SHA", keyExchange: "RSA", authentication: "RSA", encryption: "AES-CBC", bits: 256, forwardSecrecy: false, aead: false },
  { opensslName: "AES128-SHA", name: "TLS_RSA_WITH_AES_128_CBC_SHA", keyExchange: "RSA", authentication: "RSA", encryption: "AES-CBC", bits: 128, forwardSecrecy: false, aead: false },
  { opensslName: "DES-CBC3-SHA", name: "TLS_RSA_WITH_3DES_EDE_CBC_SHA", keyExchange: "RSA", authentication: "RSA", encryption: "3DES-CBC", bits: 112, forwardSecrecy: false, aead: false }
];

function scanText(locale: Locale) {
  return {
    summary: (grade: string) => locale === "es" ? `Configuración TLS evaluada con nota ${grade}.` : `TLS configuration assessed with grade ${grade}.`,
    certificateTrusted: locale === "es" ? ["Certificado confiable", "La cadena se completa hasta una raíz confiable y el hostname está cubierto."] : ["Trusted certificate", "The chain builds to a trusted root and the hostname is covered."],
    certificateUntrusted: locale === "es" ? ["Problema de confianza", "La cadena no se pudo validar contra una raíz confiable."] : ["Trust issue", "The chain could not be validated against a trusted root."],
    hostnameMismatch: locale === "es" ? ["Hostname no cubierto", "El certificado presentado no cubre el hostname solicitado."] : ["Hostname mismatch", "The presented certificate does not cover the requested hostname."],
    certificateExpiring: (days: number) => locale === "es" ? ["Certificado próximo a caducar", `Caduca en ${days} días.`] : ["Certificate expires soon", `Expires in ${days} days.`],
    tls13: locale === "es" ? ["TLS 1.3 disponible", "El servidor negocia TLS 1.3."] : ["TLS 1.3 available", "The server negotiates TLS 1.3."],
    noTls13: locale === "es" ? ["TLS 1.3 no disponible", "TLS 1.2 puede ser suficiente, pero TLS 1.3 mejora seguridad y rendimiento."] : ["TLS 1.3 unavailable", "TLS 1.2 can be enough, but TLS 1.3 improves security and performance."],
    tls12Missing: locale === "es" ? ["TLS 1.2 no disponible para clientes heredados", "TLS 1.3 es seguro para clientes modernos; TLS 1.2 solo amplía compatibilidad con navegadores y sistemas antiguos."] : ["TLS 1.2 unavailable for legacy clients", "TLS 1.3 is secure for modern clients; TLS 1.2 only broadens compatibility with older browsers and systems."],
    legacyProtocol: (name: string) => locale === "es" ? [`${name} habilitado`, "Los protocolos antiguos reducen la nota y deberían deshabilitarse."] : [`${name} enabled`, "Legacy protocols lower the grade and should be disabled."],
    hstsGood: locale === "es" ? ["HSTS fuerte", "HSTS está activo con una duración larga."] : ["Strong HSTS", "HSTS is enabled with a long duration."],
    hstsWeak: locale === "es" ? ["HSTS ausente o corto", "Para A+ se recomienda HSTS con max-age largo, includeSubDomains y preload si procede."] : ["HSTS missing or short", "For A+, use long max-age HSTS, includeSubDomains and preload when appropriate."],
    hstsPreloadActive: locale === "es" ? ["HSTS preload activo", "El dominio está incluido en la lista preload o hereda preload de un dominio padre."] : ["HSTS preload active", "The domain is included in the preload list or inherits preload from a parent domain."],
    hstsPreloadPending: (status: string) => locale === "es" ? ["HSTS preload pendiente", `Estado en hstspreload.org: ${status}.`] : ["HSTS preload pending", `hstspreload.org status: ${status}.`],
    hstsPreloadMissing: locale === "es" ? ["HSTS preload no activo", "El dominio no aparece como precargado en la lista pública de HSTS preload."] : ["HSTS preload not active", "The domain is not reported as preloaded in the public HSTS preload list."],
    hstsPreloadFailed: locale === "es" ? ["HSTS preload no comprobado", "No se pudo consultar el estado público de HSTS preload."] : ["HSTS preload not checked", "Could not query the public HSTS preload status."],
    ocspStapled: locale === "es" ? ["OCSP stapling activo", "El servidor entrega una respuesta OCSP stapled durante el handshake TLS."] : ["OCSP stapling enabled", "The server provides a stapled OCSP response during the TLS handshake."],
    ocspMissing: locale === "es" ? ["OCSP stapling no activo", "El servidor no entregó respuesta OCSP stapled durante el handshake TLS."] : ["OCSP stapling not enabled", "The server did not provide a stapled OCSP response during the TLS handshake."],
    ocspRevocationGood: locale === "es" ? ["Revocación OCSP correcta", "El responder OCSP de la CA indica que el certificado está vigente."] : ["OCSP revocation good", "The CA OCSP responder reports the certificate as good."],
    ocspRevocationRevoked: locale === "es" ? ["Certificado revocado", "El responder OCSP de la CA indica que el certificado está revocado."] : ["Certificate revoked", "The CA OCSP responder reports the certificate as revoked."],
    ocspRevocationUnknown: locale === "es" ? ["Revocación OCSP desconocida", "El responder OCSP no confirmó el certificado como vigente."] : ["OCSP revocation unknown", "The OCSP responder did not confirm the certificate as good."],
    ocspRevocationUnavailable: locale === "es" ? ["Revocación OCSP no comprobada", "El certificado no publica responder OCSP o no se pudo completar la consulta."] : ["OCSP revocation not checked", "The certificate does not publish an OCSP responder or the query could not be completed."],
    http2Supported: locale === "es" ? ["HTTP/2 negociado", "El servidor anuncia y negocia HTTP/2 mediante ALPN."] : ["HTTP/2 negotiated", "The server advertises and negotiates HTTP/2 via ALPN."],
    http2Missing: locale === "es" ? ["HTTP/2 no negociado", "El servidor no negoció h2 mediante ALPN."] : ["HTTP/2 not negotiated", "The server did not negotiate h2 via ALPN."],
    caaFound: locale === "es" ? ["CAA publicado", "El dominio declara qué CA pueden emitir certificados."] : ["CAA published", "The domain declares which CAs may issue certificates."],
    caaMissing: locale === "es" ? ["CAA no encontrado", "No es obligatorio, pero ayuda a limitar emisión indebida."] : ["CAA not found", "Not mandatory, but it helps constrain certificate issuance."],
    weakCipher: (cipher: string) => locale === "es" ? ["Cipher mejorable", `Se negoció ${cipher}. Revisa si hay suites CBC, 3DES o RC4.`] : ["Cipher can be improved", `${cipher} was negotiated. Check for CBC, 3DES or RC4 suites.`],
    modernCipher: locale === "es" ? ["Ciphers modernos", "Las pruebas negociadas usan AEAD y forward secrecy."] : ["Modern ciphers", "Negotiated probes use AEAD and forward secrecy."],
    tls12CipherModern: (count: number) => locale === "es" ? ["Suites TLS 1.2 modernas", `Se detectaron ${count} suites TLS 1.2 soportadas y ninguna marcada como débil.`] : ["Modern TLS 1.2 suites", `${count} supported TLS 1.2 suites were detected and none were marked weak.`],
    tls12CipherWeak: (count: number) => locale === "es" ? ["Suites TLS 1.2 débiles soportadas", `El servidor acepta ${count} suite(s) TLS 1.2 débiles o heredadas.`] : ["Weak TLS 1.2 suites supported", `The server accepts ${count} weak or legacy TLS 1.2 suite(s).`],
    tls12CipherNone: locale === "es" ? ["Sin suites TLS 1.2 detectadas", "No se pudo enumerar ninguna suite TLS 1.2 soportada con el catálogo actual."] : ["No TLS 1.2 suites detected", "No supported TLS 1.2 suite could be enumerated with the current catalog."],
    tls12ServerOrder: (order: string) => locale === "es" ? ["Orden de ciphers TLS 1.2", `Preferencia detectada: ${order}.`] : ["TLS 1.2 cipher order", `Detected preference: ${order}.`],
    compressionOk: locale === "es" ? ["Compresión TLS desactivada", "La prueba no negoció compresión TLS."] : ["TLS compression disabled", "The probe did not negotiate TLS compression."],
    compressionUnknown: locale === "es" ? ["Compresión TLS no concluyente", "El runtime no pudo confirmar la compresión TLS de forma fiable. No se penaliza."] : ["TLS compression inconclusive", "The runtime could not confirm TLS compression reliably. This is not penalized."],
    compressionBad: locale === "es" ? ["Compresión TLS activa", "La compresión TLS expone superficie de ataque tipo CRIME y debe estar desactivada."] : ["TLS compression enabled", "TLS compression exposes CRIME-style attack surface and should be disabled."],
    clientRenegotiationRejected: locale === "es" ? ["Renegociación iniciada por cliente rechazada", "El servidor rechaza renegociación TLS iniciada por el cliente."] : ["Client-initiated renegotiation rejected", "The server rejects client-initiated TLS renegotiation."],
    clientRenegotiationSupported: locale === "es" ? ["Renegociación iniciada por cliente permitida", "El servidor acepta renegociación iniciada por el cliente; conviene deshabilitarla si no hay dependencia explícita."] : ["Client-initiated renegotiation allowed", "The server accepts client-initiated renegotiation; disable it unless there is an explicit dependency."],
    renegotiationUnknown: locale === "es" ? ["Renegociación no concluyente", "No se pudo comprobar renegociación TLS de forma fiable. No se penaliza."] : ["Renegotiation inconclusive", "TLS renegotiation could not be checked reliably. This is not penalized."],
    keyExchangeModern: (detail: string) => locale === "es" ? ["Key exchange moderno", detail] : ["Modern key exchange", detail],
    keyExchangeWeak: (detail: string) => locale === "es" ? ["Key exchange débil", detail] : ["Weak key exchange", detail],
    keyExchangeUnknown: locale === "es" ? ["Key exchange no concluyente", "No se pudo leer la clave efímera negociada."] : ["Key exchange inconclusive", "Could not read the negotiated ephemeral key."],
    sessionResumptionSupported: locale === "es" ? ["Reanudación de sesión soportada", "El servidor permite reusar sesión TLS en una segunda conexión de prueba."] : ["Session resumption supported", "The server allows TLS session reuse on a second test connection."],
    sessionResumptionUnknown: locale === "es" ? ["Reanudación de sesión no concluyente", "No se pudo confirmar reanudación de sesión; se muestra como información y no penaliza."] : ["Session resumption inconclusive", "Session resumption could not be confirmed; this is informational and not penalized."],
    fallbackScsvUnknown: locale === "es" ? ["TLS_FALLBACK_SCSV no comprobado", "Node/OpenSSL no expone una prueba portable y fiable para este check en este runtime. No se penaliza."] : ["TLS_FALLBACK_SCSV not checked", "Node/OpenSSL does not expose a portable reliable probe for this check in this runtime. This is not penalized."],
    penaltyHostname: locale === "es" ? ["Hostname no cubierto", "La nota pasa a M porque el certificado no cubre el hostname solicitado."] : ["Hostname mismatch", "Grade is forced to M because the certificate does not cover the requested hostname."],
    penaltyTrust: locale === "es" ? ["Cadena no confiable", "La nota pasa a T porque la cadena no valida contra una raiz confiable."] : ["Untrusted chain", "Grade is forced to T because the chain does not validate to a trusted root."],
    penaltyExpiryCritical: locale === "es" ? ["Caducidad critica", "El certificado caduca en 7 dias o menos."] : ["Critical expiry", "The certificate expires in 7 days or less."],
    penaltyExpirySoon: locale === "es" ? ["Caducidad proxima", "El certificado caduca en 30 dias o menos."] : ["Expires soon", "The certificate expires in 30 days or less."],
    penaltyNoTls13: locale === "es" ? ["Sin TLS 1.3", "TLS 1.3 no es obligatorio, pero se espera en una configuracion moderna."] : ["No TLS 1.3", "TLS 1.3 is not mandatory, but it is expected in a modern configuration."],
    penaltyLegacy: (name: string) => locale === "es" ? [`${name} habilitado`, "Los protocolos antiguos deben estar deshabilitados."] : [`${name} enabled`, "Legacy protocols should be disabled."],
    penaltyWeakCipher: locale === "es" ? ["Cipher debil", "Se negocio una suite considerada debil o heredada."] : ["Weak cipher", "A weak or legacy cipher suite was negotiated."],
    penaltyWeakSupportedCipher: locale === "es" ? ["Ciphers TLS 1.2 débiles soportados", "El servidor acepta suites TLS 1.2 heredadas aunque no sean necesariamente la preferida."] : ["Weak TLS 1.2 ciphers supported", "The server accepts legacy TLS 1.2 suites even if they are not necessarily preferred."],
    penaltyCompression: locale === "es" ? ["Compresión TLS activa", "La compresión TLS debe estar deshabilitada."] : ["TLS compression enabled", "TLS compression should be disabled."],
    penaltyClientRenegotiation: locale === "es" ? ["Renegociación iniciada por cliente", "Aceptar renegociación iniciada por cliente aumenta superficie de abuso."] : ["Client-initiated renegotiation", "Accepting client-initiated renegotiation increases abuse surface."],
    penaltyWeakKeyExchange: locale === "es" ? ["Key exchange débil", "La clave efímera negociada no alcanza el umbral mínimo recomendado."] : ["Weak key exchange", "The negotiated ephemeral key is below the recommended minimum."],
    penaltyRevoked: locale === "es" ? ["Certificado revocado", "OCSP confirma que el certificado está revocado."] : ["Certificate revoked", "OCSP confirms that the certificate is revoked."],
    penaltyHsts: locale === "es" ? ["HSTS ausente o corto", "HSTS no existe o su max-age es inferior a 15552000 segundos."] : ["HSTS missing or short", "HSTS is missing or max-age is below 15552000 seconds."],
    recHostname: locale === "es"
      ? ["Corregir el certificado del hostname", "Los navegadores mostrarán error TLS si el certificado no cubre exactamente el host consultado.", "Emite o instala un certificado que incluya este hostname en Subject Alternative Name."]
      : ["Fix hostname coverage", "Browsers will show a TLS error if the certificate does not cover the requested host.", "Issue or install a certificate that includes this hostname in Subject Alternative Name."],
    recTrust: locale === "es"
      ? ["Instalar una cadena confiable", "Los clientes no podrán validar el certificado si faltan intermedios o la cadena termina en una raíz no confiable.", "Instala el CA bundle correcto en el servidor y evita mezclar intermedios de otra CA o certificados caducados."]
      : ["Install a trusted chain", "Clients cannot validate the certificate if intermediates are missing or the chain ends at an untrusted root.", "Install the correct CA bundle on the server and avoid mixing intermediates from another CA or expired certificates."],
    recExpiry: locale === "es"
      ? ["Renovar el certificado", "Un certificado caducado deja el servicio inaccesible para clientes estrictos.", "Renueva el certificado y automatiza alertas antes de los últimos 30 días."]
      : ["Renew the certificate", "An expired certificate makes the service unavailable to strict clients.", "Renew the certificate and automate alerts before the last 30 days."],
    recTls13: locale === "es"
      ? ["Activar TLS 1.3", "TLS 1.3 reduce latencia y elimina varias decisiones heredadas de TLS 1.2.", "Activa TLS 1.3 si tu balanceador, CDN o servidor web lo soporta."]
      : ["Enable TLS 1.3", "TLS 1.3 reduces latency and removes several legacy TLS 1.2 choices.", "Enable TLS 1.3 if your load balancer, CDN or web server supports it."],
    recTls12: locale === "es"
      ? ["Ampliar compatibilidad con TLS 1.2", "Los clientes modernos funcionan con TLS 1.3; TLS 1.2 mejora compatibilidad con versiones antiguas.", "Activa TLS 1.2 junto a TLS 1.3 solo si necesitas atender navegadores, sistemas o integraciones heredadas."]
      : ["Broaden compatibility with TLS 1.2", "Modern clients work with TLS 1.3; TLS 1.2 improves support for older versions.", "Enable TLS 1.2 alongside TLS 1.3 only when older browsers, systems or integrations must be supported."],
    recLegacy: (name: string) => locale === "es"
      ? [`Deshabilitar ${name}`, "Los protocolos antiguos amplían superficie de ataque y reducen compatibilidad con políticas modernas.", "Deshabilita TLS 1.0 y TLS 1.1 en el servidor, proxy o CDN."]
      : [`Disable ${name}`, "Legacy protocols increase attack surface and fail modern security policies.", "Disable TLS 1.0 and TLS 1.1 on the server, proxy or CDN."],
    recWeakCipher: locale === "es"
      ? ["Eliminar ciphers débiles", "Suites CBC, 3DES, RC4 o RSA key exchange reducen la seguridad efectiva.", "Permite solo suites AEAD con forward secrecy para TLS 1.2 y usa las suites estándar de TLS 1.3."]
      : ["Remove weak ciphers", "CBC, 3DES, RC4 or RSA key exchange suites reduce effective security.", "Allow only AEAD suites with forward secrecy for TLS 1.2 and use the standard TLS 1.3 suites."],
    recDisableCompression: locale === "es"
      ? ["Deshabilitar compresión TLS", "La compresión TLS ya no es necesaria y puede exponer ataques de canal lateral.", "Desactiva compresión TLS en el servidor, proxy o terminador TLS."]
      : ["Disable TLS compression", "TLS compression is no longer needed and can expose side-channel attacks.", "Disable TLS compression on the server, proxy or TLS terminator."],
    recDisableClientRenegotiation: locale === "es"
      ? ["Bloquear renegociación iniciada por cliente", "Permitir renegociación iniciada por el cliente puede facilitar abuso de CPU o configuraciones heredadas inseguras.", "Deshabilita client-initiated renegotiation salvo que una integración controlada lo requiera."]
      : ["Block client-initiated renegotiation", "Allowing client-initiated renegotiation can enable CPU abuse or unsafe legacy behavior.", "Disable client-initiated renegotiation unless a controlled integration requires it."],
    recDhParams: locale === "es"
      ? ["Usar DH/ECDH moderno", "Parámetros DH pequeños reducen la seguridad del intercambio de claves.", "Usa ECDHE con curvas modernas o DHE de al menos 2048 bits."]
      : ["Use modern DH/ECDH", "Small DH parameters reduce key exchange security.", "Use ECDHE with modern curves or DHE of at least 2048 bits."],
    recHsts: locale === "es"
      ? ["Añadir HSTS fuerte", "Sin HSTS, el primer acceso o una redirección HTTPS sin cabecera no queda protegido frente a downgrade a HTTP.", "Envía Strict-Transport-Security en todas las respuestas HTTPS, incluidas redirecciones 301/302."]
      : ["Add strong HSTS", "Without HSTS, first access or an HTTPS redirect without the header is not protected against downgrade to HTTP.", "Send Strict-Transport-Security on every HTTPS response, including 301/302 redirects."],
    recHstsPreload: locale === "es"
      ? ["Verificar HSTS preload", "El header declara preload, pero el dominio todavía no aparece como precargado.", "Comprueba los requisitos en hstspreload.org y envía el dominio solo si quieres aplicar HTTPS obligatorio a todos los subdominios."]
      : ["Verify HSTS preload", "The header declares preload, but the domain is not currently reported as preloaded.", "Check the requirements at hstspreload.org and submit the domain only if HTTPS should be mandatory for every subdomain."],
    recOcspStapling: locale === "es"
      ? ["Activar OCSP stapling", "Sin OCSP stapling, algunos clientes pueden tener que consultar al responder OCSP de la CA para comprobar revocación.", "Activa OCSP stapling en el servidor TLS, proxy o CDN si tu proveedor lo soporta."]
      : ["Enable OCSP stapling", "Without OCSP stapling, some clients may need to contact the CA OCSP responder to check revocation.", "Enable OCSP stapling on the TLS server, proxy or CDN when supported."],
    recRevoked: locale === "es"
      ? ["Reemitir certificado revocado", "Un certificado revocado puede ser rechazado por clientes que comprueban revocación.", "Revoca la instalación actual, emite un certificado nuevo y actualiza el servidor con su cadena correcta."]
      : ["Replace revoked certificate", "A revoked certificate can be rejected by clients that check revocation.", "Issue a new certificate and update the server with the correct chain."],
    recHttp2: locale === "es"
      ? ["Activar HTTP/2", "HTTP/2 mejora multiplexación y rendimiento percibido frente a HTTP/1.1 en muchos sitios.", "Activa HTTP/2 en el servidor, proxy o CDN y verifica que ALPN anuncia h2."]
      : ["Enable HTTP/2", "HTTP/2 improves multiplexing and perceived performance compared with HTTP/1.1 on many sites.", "Enable HTTP/2 on the server, proxy or CDN and verify that ALPN advertises h2."],
    recCaa: locale === "es"
      ? ["Publicar DNS CAA", "CAA limita qué autoridades pueden emitir certificados para el dominio.", "Añade registros CAA para tus CA autorizadas y un iodef de contacto si procede."]
      : ["Publish DNS CAA", "CAA restricts which certificate authorities may issue certificates for the domain.", "Add CAA records for your authorized CAs and an iodef contact when appropriate."],
    redirectHttpOk: locale === "es" ? ["HTTP redirige a HTTPS", "El endpoint HTTP termina en una URL HTTPS."] : ["HTTP redirects to HTTPS", "The HTTP endpoint lands on an HTTPS URL."],
    redirectHttpMissing: locale === "es" ? ["HTTP no redirige a HTTPS", "El endpoint HTTP no termina en HTTPS."] : ["HTTP does not redirect to HTTPS", "The HTTP endpoint does not land on HTTPS."],
    redirectHttpsHstsMissing: locale === "es" ? ["Redirección HTTPS sin HSTS", "La respuesta HTTPS inicial redirige, pero no envía HSTS."] : ["HTTPS redirect without HSTS", "The initial HTTPS response redirects but does not send HSTS."],
    redirectCanonical: (hostname: string) => locale === "es" ? ["Host canónico detectado", `El flujo termina en ${hostname}.`] : ["Canonical host detected", `The redirect flow lands on ${hostname}.`],
    redirectTooLong: locale === "es" ? ["Cadena de redirecciones larga", "Demasiadas redirecciones aumentan latencia y dificultan depuración."] : ["Long redirect chain", "Too many redirects increase latency and make troubleshooting harder."],
    redirectLoop: locale === "es" ? ["Problema siguiendo redirecciones", "No se pudo completar el flujo de redirecciones."] : ["Redirect chain issue", "The redirect flow could not be completed."],
    recHttpRedirect: locale === "es"
      ? ["Forzar HTTP a HTTPS", "Si HTTP no redirige a HTTPS, el primer acceso puede quedar expuesto o terminar en contenido no cifrado.", "Configura una redirección permanente desde HTTP hacia la URL HTTPS canónica."]
      : ["Force HTTP to HTTPS", "If HTTP does not redirect to HTTPS, first access can remain exposed or land on unencrypted content.", "Configure a permanent redirect from HTTP to the canonical HTTPS URL."],
    recHttpsRedirectHsts: locale === "es"
      ? ["Enviar HSTS también en redirecciones HTTPS", "Una redirección 301/302 por HTTPS sin HSTS no fija la política HSTS para ese host.", "Añade Strict-Transport-Security con always para que también salga en respuestas 301/302."]
      : ["Send HSTS on HTTPS redirects too", "An HTTPS 301/302 response without HSTS does not pin the HSTS policy for that host.", "Add Strict-Transport-Security with always semantics so it is sent on 301/302 responses too."],
    recRedirectChain: locale === "es"
      ? ["Simplificar redirecciones", "Varias redirecciones elevan latencia y pueden provocar diferencias entre host raíz, www y rutas finales.", "Redirige en un solo salto hacia el host HTTPS canónico."]
      : ["Simplify redirects", "Multiple redirects add latency and can create differences between apex, www and final paths.", "Redirect in one hop to the canonical HTTPS host."],
    recApacheHsts: `Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"`,
    recNginxHsts: `add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;`,
    recApacheOcsp: "SSLUseStapling On\nSSLStaplingCache shmcb:/var/run/ocsp(128000)",
    recNginxOcsp: "ssl_stapling on;\nssl_stapling_verify on;",
    recApacheHttp2: "Protocols h2 http/1.1",
    recNginxHttp2: "listen 443 ssl http2;",
    recApacheHttpRedirect: "RewriteEngine On\nRewriteCond %{HTTPS} !=on\nRewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]",
    recNginxHttpRedirect: "server {\n  listen 80;\n  server_name example.com www.example.com;\n  return 301 https://$host$request_uri;\n}",
    recApacheProtocols: "SSLProtocol -all +TLSv1.2 +TLSv1.3",
    recNginxProtocols: "ssl_protocols TLSv1.2 TLSv1.3;",
    recApacheCiphers: "SSLCipherSuite ECDHE+AESGCM:ECDHE+CHACHA20\nSSLHonorCipherOrder On",
    recNginxCiphers: "ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305';\nssl_prefer_server_ciphers on;",
    recCaaExample: 'example.com. 3600 IN CAA 0 issue "letsencrypt.org"'
  };
}

function daysUntil(date: string) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
}

function certificateKeyBits(cert: X509Certificate) {
  const details = cert.publicKey.asymmetricKeyDetails;
  return details && "modulusLength" in details ? details.modulusLength : details && "namedCurve" in details ? undefined : undefined;
}

function certificateDto(cert: X509Certificate) {
  return {
    subject: cert.subject,
    issuer: cert.issuer,
    validFrom: cert.validFrom,
    validTo: cert.validTo,
    fingerprint256: cert.fingerprint256,
    serialNumber: cert.serialNumber,
    subjectAltName: cert.subjectAltName,
    keyType: cert.publicKey.asymmetricKeyType,
    keyBits: certificateKeyBits(cert),
    signatureAlgorithm: undefined
  };
}

async function protocolProbe(host: string, port: number, version: { minVersion: tls.SecureVersion; maxVersion: tls.SecureVersion; name: TlsProtocolName }) {
  const lookup = await publicLookupFor(host, "protocol probe target");
  return new Promise<TlsProtocolProbe>((resolve) => {
    const socket = tls.connect({
      host,
      port,
      servername: isIP(host) ? undefined : host,
      rejectUnauthorized: false,
      timeout: scanTimeoutMs,
      minVersion: version.minVersion,
      maxVersion: version.maxVersion,
      ALPNProtocols: ["h2", "http/1.1"],
      lookup
    });

    socket.once("secureConnect", () => {
      const cipher = socket.getCipher();
      resolve({
        name: version.name,
        supported: true,
        protocol: socket.getProtocol() ?? undefined,
        cipher: cipher?.standardName ?? cipher?.name
      });
      socket.end();
    });

    socket.once("timeout", () => {
      socket.destroy();
      resolve({ name: version.name, supported: false, error: "timeout" });
    });

    socket.once("error", (error) => {
      resolve({ name: version.name, supported: false, error: error.message });
    });
  });
}

function classifyCipher(cipher: Omit<Tls12CipherSuite, "weak" | "weakness">): Tls12CipherSuite {
  const reasons = [
    cipher.forwardSecrecy ? "" : "no forward secrecy",
    cipher.aead ? "" : "non-AEAD/CBC",
    cipher.encryption.includes("3DES") ? "3DES" : ""
  ].filter(Boolean);

  return {
    ...cipher,
    weak: reasons.length > 0,
    weakness: reasons.join(", ") || undefined
  };
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, mapper: (item: T) => Promise<R>) {
  const results: R[] = [];
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await mapper(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

async function probeTls12Cipher(host: string, port: number, cipher: Omit<Tls12CipherSuite, "weak" | "weakness">) {
  const lookup = await publicLookupFor(host, "cipher probe target");
  return new Promise<Tls12CipherSuite | null>((resolve) => {
    let socket: tls.TLSSocket;
    try {
      socket = tls.connect({
        host,
        port,
        servername: isIP(host) ? undefined : host,
        rejectUnauthorized: false,
        timeout: scanTimeoutMs,
        minVersion: "TLSv1.2",
        maxVersion: "TLSv1.2",
        ciphers: cipher.opensslName,
        lookup
      });
    } catch {
      resolve(null);
      return;
    }

    socket.once("secureConnect", () => {
      socket.end();
      resolve(classifyCipher(cipher));
    });

    socket.once("timeout", () => {
      socket.destroy();
      resolve(null);
    });

    socket.once("error", () => resolve(null));
  });
}

async function negotiateTls12Cipher(host: string, port: number, ciphers: string[]) {
  const lookup = await publicLookupFor(host, "cipher order probe target");
  return new Promise<string | undefined>((resolve) => {
    let socket: tls.TLSSocket;
    try {
      socket = tls.connect({
        host,
        port,
        servername: isIP(host) ? undefined : host,
        rejectUnauthorized: false,
        timeout: scanTimeoutMs,
        minVersion: "TLSv1.2",
        maxVersion: "TLSv1.2",
        ciphers: ciphers.join(":"),
        lookup
      });
    } catch {
      resolve(undefined);
      return;
    }

    socket.once("secureConnect", () => {
      const cipher = socket.getCipher();
      socket.end();
      resolve(cipher?.standardName ?? cipher?.name);
    });

    socket.once("timeout", () => {
      socket.destroy();
      resolve(undefined);
    });

    socket.once("error", () => resolve(undefined));
  });
}

async function enumerateTls12Ciphers(host: string, port: number): Promise<TlsScanResponse["tls12Ciphers"]> {
  const supported = (await mapWithConcurrency(tls12CipherCatalog, cipherProbeConcurrency, (cipher) => probeTls12Cipher(host, port, cipher)))
    .filter((cipher): cipher is Tls12CipherSuite => Boolean(cipher));

  const supportedOpenSsl = supported.map((cipher) => cipher.opensslName);
  const preferredCipher = supportedOpenSsl.length > 0 ? await negotiateTls12Cipher(host, port, supportedOpenSsl) : undefined;
  const reversePreferredCipher = supportedOpenSsl.length > 1 ? await negotiateTls12Cipher(host, port, [...supportedOpenSsl].reverse()) : undefined;
  const serverOrder = supportedOpenSsl.length <= 1 || !preferredCipher || !reversePreferredCipher
    ? "unknown"
    : preferredCipher === reversePreferredCipher
      ? "server"
      : "client";

  return {
    scanned: tls12CipherCatalog.length,
    supported,
    serverOrder,
    preferredCipher
  };
}

async function probeAlpn(host: string, port: number) {
  const lookup = await publicLookupFor(host, "ALPN probe target");
  return new Promise<string[]>((resolve) => {
    const socket = tls.connect({
      host,
      port,
      servername: isIP(host) ? undefined : host,
      rejectUnauthorized: false,
      timeout: scanTimeoutMs,
      ALPNProtocols: ["h2", "http/1.1"],
      lookup
    });

    socket.once("secureConnect", () => {
      resolve(socket.alpnProtocol ? [socket.alpnProtocol] : []);
      socket.end();
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve([]);
    });
    socket.once("error", () => resolve([]));
  });
}

function emptyProtocolDetails(detail?: string): TlsProtocolDetails {
  return {
    compression: { status: "unknown", detail },
    secureRenegotiation: { status: "unknown", detail },
    clientRenegotiation: { status: "unknown", detail },
    fallbackScsv: { status: "unknown", detail },
    sessionResumption: { status: "unknown", detail },
    keyExchange: { status: "unknown", detail }
  };
}

function classifyKeyExchange(info: ReturnType<tls.TLSSocket["getEphemeralKeyInfo"]> | undefined, locale: Locale): TlsProtocolDetails["keyExchange"] {
  if (!info || Object.keys(info).length === 0) {
    return { status: "unknown", detail: locale === "es" ? "El runtime TLS no expuso información de clave efímera." : "No ephemeral key information exposed by the TLS runtime." };
  }

  const type = "type" in info && typeof info.type === "string" ? info.type : undefined;
  const name = "name" in info && typeof info.name === "string" ? info.name : undefined;
  const size = "size" in info && typeof info.size === "number" ? info.size : undefined;

  if (type === "DH" && size && size < 2048) {
    return { status: "weak", type, name, size, detail: locale === "es" ? `DHE ${size} bits está por debajo del baseline de 2048 bits.` : `DHE ${size} bits is below the 2048-bit baseline.` };
  }

  if ((type === "DH" || type === "ECDH") && size) {
    return { status: "modern", type, name, size, detail: locale === "es" ? `${[type, name, `${size} bits`].filter(Boolean).join(" ")} negociado.` : `${[type, name, `${size} bits`].filter(Boolean).join(" ")} negotiated.` };
  }

  return { status: "unknown", type, name, size, detail: locale === "es" ? "La información de clave efímera fue incompleta." : "Ephemeral key information was incomplete." };
}

async function probeTls12ProtocolDetails(host: string, port: number, locale: Locale): Promise<TlsProtocolDetails> {
  const lookup = await publicLookupFor(host, "TLS details probe target");
  return new Promise((resolve) => {
    let completed = false;

    function finish(result: TlsProtocolDetails) {
      if (completed) return;
      completed = true;
      resolve(result);
    }

    const socket = tls.connect({
      host,
      port,
      servername: isIP(host) ? undefined : host,
      rejectUnauthorized: false,
      timeout: scanTimeoutMs,
      minVersion: "TLSv1.2",
      maxVersion: "TLSv1.2",
      ALPNProtocols: ["h2", "http/1.1"],
      lookup
    });

    socket.once("secureConnect", () => {
      const base: TlsProtocolDetails = {
        compression: {
          status: "not-supported",
          detail: locale === "es" ? "La prueba no negoció compresión TLS." : "No TLS compression was negotiated by the probe."
        },
        secureRenegotiation: {
          status: "unknown",
          detail: locale === "es" ? "Este runtime no expone directamente el soporte de renegociación segura." : "Secure renegotiation support is not exposed directly by this runtime."
        },
        clientRenegotiation: {
          status: "unknown",
          detail: locale === "es" ? "La prueba de renegociación iniciada por cliente no se completó." : "Client-initiated renegotiation probe did not complete."
        },
        fallbackScsv: {
          status: "unknown",
          detail: locale === "es" ? "Este runtime no expone una prueba portable de TLS_FALLBACK_SCSV." : "Portable TLS_FALLBACK_SCSV probing is not exposed directly by this runtime."
        },
        sessionResumption: {
          status: socket.getSession()?.length ? "unknown" : "not-supported",
          detail: socket.getSession()?.length
            ? locale === "es" ? "Se entregó material de sesión; el reúso se comprueba aparte." : "Session material was issued; reuse is checked separately."
            : locale === "es" ? "No se entregó material de sesión TLS reutilizable." : "No reusable TLS session material was issued."
        },
        keyExchange: classifyKeyExchange(socket.getEphemeralKeyInfo(), locale)
      };

      const renegotiationTimer = windowlessTimeout(() => {
        socket.destroy();
        finish({
          ...base,
          clientRenegotiation: {
            status: "rejected",
            detail: locale === "es" ? "La renegociación iniciada por cliente no fue aceptada dentro del timeout de prueba." : "Client-initiated renegotiation was not accepted within the probe timeout."
          }
        });
      }, Math.min(2000, scanTimeoutMs));

      try {
        socket.renegotiate({ requestCert: false, rejectUnauthorized: false }, (error) => {
          clearTimeout(renegotiationTimer);
          socket.end();
          finish({
            ...base,
            clientRenegotiation: error
              ? { status: "rejected", detail: error.message }
              : { status: "supported", detail: locale === "es" ? "La renegociación iniciada por cliente se completó correctamente." : "Client-initiated renegotiation completed successfully." }
          });
        });
      } catch (error) {
        clearTimeout(renegotiationTimer);
        socket.end();
        finish({
          ...base,
          clientRenegotiation: {
            status: "rejected",
            detail: error instanceof Error ? error.message : "Client-initiated renegotiation rejected."
          }
        });
      }
    });

    socket.once("timeout", () => {
      socket.destroy();
      finish(emptyProtocolDetails(locale === "es" ? "La prueba de detalles TLS 1.2 agotó el timeout." : "TLS 1.2 protocol details probe timed out."));
    });

    socket.once("error", (error) => {
      finish({
        ...emptyProtocolDetails(error.message),
        secureRenegotiation: { status: "not-supported", detail: error.message },
        clientRenegotiation: { status: "not-supported", detail: error.message }
      });
    });
  });
}

function windowlessTimeout(callback: () => void, ms: number) {
  return setTimeout(callback, ms);
}

async function probeSessionResumption(host: string, port: number, locale: Locale): Promise<TlsProtocolDetails["sessionResumption"]> {
  const lookup = await publicLookupFor(host, "session resumption probe target");
  const firstSession = await new Promise<Buffer | undefined>((resolve) => {
    const socket = tls.connect({
      host,
      port,
      servername: isIP(host) ? undefined : host,
      rejectUnauthorized: false,
      timeout: scanTimeoutMs,
      minVersion: "TLSv1.2",
      maxVersion: "TLSv1.2",
      lookup
    });
    socket.once("secureConnect", () => {
      const session = socket.getSession();
      socket.end();
      resolve(session?.length ? Buffer.from(session) : undefined);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(undefined);
    });
    socket.once("error", () => resolve(undefined));
  });

  if (!firstSession) return { status: "unknown", detail: locale === "es" ? "La primera conexión no entregó una sesión TLS 1.2 reutilizable." : "No reusable TLS 1.2 session was provided by the first connection." };

  return new Promise((resolve) => {
    const socket = tls.connect({
      host,
      port,
      servername: isIP(host) ? undefined : host,
      rejectUnauthorized: false,
      timeout: scanTimeoutMs,
      minVersion: "TLSv1.2",
      maxVersion: "TLSv1.2",
      session: firstSession,
      lookup
    });
    socket.once("secureConnect", () => {
      const reused = socket.isSessionReused();
      socket.end();
      resolve({
        status: reused ? "supported" : "not-supported",
        detail: reused
          ? locale === "es" ? "La segunda conexión TLS 1.2 reutilizó la sesión." : "Second TLS 1.2 connection reused the session."
          : locale === "es" ? "La segunda conexión TLS 1.2 no reutilizó la sesión." : "Second TLS 1.2 connection did not reuse the session."
      });
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve({ status: "unknown", detail: locale === "es" ? "La prueba de reanudación TLS 1.2 agotó el timeout." : "TLS 1.2 session resumption probe timed out." });
    });
    socket.once("error", (error) => resolve({ status: "unknown", detail: error.message }));
  });
}

async function probeProtocolDetails(host: string, port: number, protocols: TlsProtocolProbe[], locale: Locale): Promise<TlsProtocolDetails> {
  const supportsTls12 = protocols.some((protocol) => protocol.name === "TLSv1.2" && protocol.supported);
  if (!supportsTls12) return emptyProtocolDetails(locale === "es" ? "TLS 1.2 no está disponible, se omitieron los detalles avanzados de TLS 1.2." : "TLS 1.2 is not available, so advanced TLS 1.2 details were skipped.");
  const [details, sessionResumption] = await Promise.all([
    probeTls12ProtocolDetails(host, port, locale),
    probeSessionResumption(host, port, locale)
  ]);

  return {
    ...details,
    sessionResumption,
    fallbackScsv: {
      status: protocols.some((protocol) => protocol.name === "TLSv1.3" && protocol.supported) ? "unknown" : "unknown",
      detail: locale === "es" ? "Este runtime Node/OpenSSL no expone una prueba portable de TLS_FALLBACK_SCSV." : "Portable TLS_FALLBACK_SCSV probing is not exposed directly by this Node/OpenSSL runtime."
    }
  };
}

async function probeOcspStapling(host: string, port: number): Promise<TlsScanResponse["ocspStapling"]> {
  const lookup = await publicLookupFor(host, "OCSP stapling probe target");
  return new Promise((resolve) => {
    let resolved = false;
    let ocspBytes = 0;

    function finish(result: TlsScanResponse["ocspStapling"]) {
      if (resolved) return;
      resolved = true;
      resolve(result);
    }

    const options: tls.ConnectionOptions & { requestOCSP: boolean } = {
      host,
      port,
      servername: isIP(host) ? undefined : host,
      rejectUnauthorized: false,
      timeout: scanTimeoutMs,
      requestOCSP: true,
      lookup
    };

    const socket = tls.connect(options);

    socket.once("OCSPResponse", (response) => {
      ocspBytes = response?.byteLength ?? 0;
    });

    socket.once("secureConnect", () => {
      socket.end();
      finish({
        requested: true,
        present: ocspBytes > 0,
        responseBytes: ocspBytes || undefined
      });
    });

    socket.once("timeout", () => {
      socket.destroy();
      finish({ requested: true, present: false, error: "timeout" });
    });

    socket.once("error", (error) => {
      finish({ requested: true, present: false, error: error.message });
    });
  });
}

function ocspUrls(cert: X509Certificate) {
  return (cert.infoAccess ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("OCSP - URI:"))
    .map((line) => line.replace("OCSP - URI:", "").trim())
    .filter((url) => url.startsWith("http://") || url.startsWith("https://"));
}

function asn1Children(node: forge.asn1.Asn1 | undefined) {
  return node && Array.isArray(node.value) ? node.value : [];
}

function derBytes(node: forge.asn1.Asn1) {
  return Buffer.from(forge.asn1.toDer(node).getBytes(), "binary");
}

function sha1Bytes(input: Buffer) {
  return createHash("sha1").update(input).digest().toString("binary");
}

function serialAsDerIntegerValue(serialNumber: string) {
  const normalized = serialNumber.replace(/[^a-f0-9]/gi, "").replace(/^0+/, "") || "00";
  const evenHex = normalized.length % 2 === 0 ? normalized : `0${normalized}`;
  const bytes = Buffer.from(evenHex, "hex");
  return (bytes[0] & 0x80 ? Buffer.concat([Buffer.from([0]), bytes]) : bytes).toString("binary");
}

function serialValueToHex(value: string) {
  return Buffer.from(value, "binary").toString("hex").replace(/^0+/, "").toUpperCase() || "0";
}

function normalizedSerial(serialNumber: string) {
  return serialNumber.replace(/[^a-f0-9]/gi, "").replace(/^0+/, "").toUpperCase() || "0";
}

function issuerKeyHash(issuer: forge.pki.Certificate) {
  const subjectPublicKeyInfo = forge.pki.publicKeyToAsn1(issuer.publicKey);
  const keyBitString = asn1Children(subjectPublicKeyInfo)[1];
  if (!keyBitString) throw new Error("No se pudo calcular issuerKeyHash.");
  if (typeof keyBitString.value === "string") return sha1Bytes(Buffer.from(keyBitString.value.slice(1), "binary"));
  const composedKey = asn1Children(keyBitString)[0];
  if (composedKey) return sha1Bytes(derBytes(composedKey));
  throw new Error("No se pudo calcular issuerKeyHash.");
}

function buildOcspRequest(leaf: X509Certificate, issuerPem: string) {
  const issuer = forge.pki.certificateFromPem(issuerPem);
  const issuerName = forge.pki.distinguishedNameToAsn1(issuer.subject);
  const hashAlgorithm = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
    forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.OID, false, forge.asn1.oidToDer("1.3.14.3.2.26").getBytes()),
    forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.NULL, false, "")
  ]);
  const certId = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
    hashAlgorithm,
    forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.OCTETSTRING, false, sha1Bytes(derBytes(issuerName))),
    forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.OCTETSTRING, false, issuerKeyHash(issuer)),
    forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.INTEGER, false, serialAsDerIntegerValue(leaf.serialNumber))
  ]);
  const requestItem = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [certId]);
  const tbsRequest = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
    forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [requestItem])
  ]);
  const ocspRequest = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [tbsRequest]);
  return derBytes(ocspRequest);
}

function parseAsn1Time(node: forge.asn1.Asn1 | undefined) {
  if (!node || typeof node.value !== "string") return undefined;
  const raw = node.value;
  const match = raw.match(/^(\d{2}|\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z$/);
  if (!match) return raw;
  const yearRaw = match[1];
  const year = yearRaw.length === 2 ? Number(yearRaw) + (Number(yearRaw) >= 50 ? 1900 : 2000) : Number(yearRaw);
  return new Date(Date.UTC(year, Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6]))).toISOString();
}

function parseOcspResponse(buffer: Buffer, leaf: X509Certificate): Omit<TlsScanResponse["ocspRevocation"], "checked" | "responderUrl"> {
  const response = forge.asn1.fromDer(buffer.toString("binary"));
  const responseChildren = asn1Children(response);
  const responseStatus = responseChildren[0];
  const statusValue = typeof responseStatus?.value === "string" ? Buffer.from(responseStatus.value, "binary")[0] : undefined;
  if (statusValue !== 0) return { status: "error", error: `OCSP responder status ${statusValue ?? "unknown"}` };

  const responseBytesContainer = responseChildren.find((child) => child.tagClass === forge.asn1.Class.CONTEXT_SPECIFIC && child.type === 0);
  const responseBytes = asn1Children(responseBytesContainer)[0];
  const responseBytesChildren = asn1Children(responseBytes);
  const responseType = responseBytesChildren[0];
  const responsePayload = responseBytesChildren[1];
  const responseTypeOid = typeof responseType?.value === "string" ? forge.asn1.derToOid(responseType.value) : "";
  if (responseTypeOid !== "1.3.6.1.5.5.7.48.1.1" || typeof responsePayload?.value !== "string") {
    return { status: "error", error: "OCSP response is not a BasicOCSPResponse" };
  }

  const basicResponse = forge.asn1.fromDer(responsePayload.value);
  const responseData = asn1Children(basicResponse)[0];
  const responseDataChildren = asn1Children(responseData);
  const offset = responseDataChildren[0]?.tagClass === forge.asn1.Class.CONTEXT_SPECIFIC && responseDataChildren[0].type === 0 ? 1 : 0;
  const producedAt = parseAsn1Time(responseDataChildren[offset + 1]);
  const responses = asn1Children(responseDataChildren[offset + 2]);
  const leafSerial = normalizedSerial(leaf.serialNumber);

  for (const singleResponse of responses) {
    const children = asn1Children(singleResponse);
    const certId = children[0];
    const serial = asn1Children(certId)[3];
    if (typeof serial?.value === "string" && serialValueToHex(serial.value) !== leafSerial) continue;

    const certStatus = children[1];
    const thisUpdate = parseAsn1Time(children[2]);
    const nextUpdateNode = children.find((child, index) => index > 2 && child.tagClass === forge.asn1.Class.CONTEXT_SPECIFIC && child.type === 0);
    const nextUpdate = parseAsn1Time(asn1Children(nextUpdateNode)[0]);

    if (certStatus?.tagClass === forge.asn1.Class.CONTEXT_SPECIFIC && certStatus.type === 0) {
      return { status: "good", producedAt, thisUpdate, nextUpdate };
    }
    if (certStatus?.tagClass === forge.asn1.Class.CONTEXT_SPECIFIC && certStatus.type === 1) {
      const revokedInfo = asn1Children(certStatus)[0] ?? certStatus;
      return { status: "revoked", producedAt, thisUpdate, nextUpdate, revocationTime: parseAsn1Time(asn1Children(revokedInfo)[0]) };
    }
    if (certStatus?.tagClass === forge.asn1.Class.CONTEXT_SPECIFIC && certStatus.type === 2) {
      return { status: "unknown", producedAt, thisUpdate, nextUpdate };
    }
  }

  return { status: "unknown", error: "OCSP response did not include the requested certificate serial" };
}

async function postOcspRequest(url: string, body: Buffer) {
  const { parsed, lookup } = await publicLookupForUrl(url, { context: "OCSP responder", allowedPorts: [80, 443] });

  return new Promise<Buffer>((resolve, reject) => {
    const req = requestForProtocol(parsed.protocol)({
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port || undefined,
      path: `${parsed.pathname}${parsed.search}`,
      method: "POST",
      timeout: ocspTimeoutMs,
      lookup,
      headers: {
        "accept": "application/ocsp-response",
        "content-type": "application/ocsp-request",
        "content-length": body.byteLength,
        "user-agent": userAgent
      }
    }, (res) => {
      if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        reject(new Error(`OCSP responder HTTP ${res.statusCode ?? "unknown"}`));
        return;
      }

      const contentLength = Number(res.headers["content-length"] ?? 0);
      if (contentLength > maxOcspBytes) {
        res.resume();
        reject(new Error("OCSP response too large"));
        return;
      }

      const chunks: Buffer[] = [];
      let total = 0;
      res.on("data", (chunk: Buffer) => {
        total += chunk.byteLength;
        if (total > maxOcspBytes) {
          req.destroy(new Error("OCSP response too large"));
          return;
        }
        chunks.push(chunk);
      });
      res.once("end", () => resolve(Buffer.concat(chunks)));
    });

    req.once("timeout", () => req.destroy(new Error("OCSP request timeout")));
    req.once("error", reject);
    req.end(body);
  });
}

async function checkOcspRevocation(leaf: X509Certificate, issuerPem?: string): Promise<TlsScanResponse["ocspRevocation"]> {
  const responderUrl = ocspUrls(leaf)[0];
  if (!responderUrl) return { checked: false, status: "not-supported" };
  if (!issuerPem) return { checked: false, status: "error", responderUrl, error: "issuer certificate unavailable" };

  try {
    const requestBody = buildOcspRequest(leaf, issuerPem);
    const responseBody = await postOcspRequest(responderUrl, requestBody);
    return {
      checked: true,
      responderUrl,
      ...parseOcspResponse(responseBody, leaf)
    };
  } catch (error) {
    return {
      checked: false,
      status: "error",
      responderUrl,
      error: error instanceof Error ? error.message : "OCSP check failed"
    };
  }
}

async function fetchHsts(host: string, port: number) {
  const lookup = await publicLookupFor(host, "HSTS probe target");
  return new Promise<TlsScanResponse["hsts"]>((resolve) => {
    const req = request({
      hostname: host,
      port,
      path: "/",
      method: "HEAD",
      servername: isIP(host) ? undefined : host,
      timeout: httpTimeoutMs,
      rejectUnauthorized: false,
      lookup
    }, (res) => {
      const header = Array.isArray(res.headers["strict-transport-security"]) ? res.headers["strict-transport-security"][0] : res.headers["strict-transport-security"];
      const maxAge = header?.match(/max-age=(\d+)/i)?.[1];
      res.resume();
      resolve({
        present: Boolean(header),
        header,
        maxAge: maxAge ? Number(maxAge) : undefined,
        includesSubDomains: Boolean(header && /includesubdomains/i.test(header)),
        preload: Boolean(header && /preload/i.test(header))
      });
    });

    req.once("timeout", () => {
      req.destroy();
      resolve({ present: false, includesSubDomains: false, preload: false });
    });
    req.once("error", () => resolve({ present: false, includesSubDomains: false, preload: false }));
    req.end();
  });
}

type HstsPreloadApiResponse = {
  status?: string;
  name?: string;
  domain?: string;
  preloadedDomain?: string;
  bulk?: boolean;
};

function normalizeHstsPreloadStatus(status: string | undefined): TlsScanResponse["hstsPreload"]["status"] {
  if (status === "preloaded" || status === "pending" || status === "pending-removal" || status === "removed" || status === "unknown" || status === "rejected") {
    return status;
  }
  return "error";
}

async function checkHstsPreload(host: string): Promise<TlsScanResponse["hstsPreload"]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), hstsPreloadTimeoutMs);
  try {
    const url = `https://hstspreload.org/api/v2/status?domain=${encodeURIComponent(host)}`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "accept": "application/json",
        "user-agent": userAgent
      }
    });
    if (!response.ok) throw new Error(`hstspreload.org HTTP ${response.status}`);
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > maxHstsPreloadBytes) throw new Error("HSTS preload response too large");
    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > maxHstsPreloadBytes) throw new Error("HSTS preload response too large");
    const data = JSON.parse(text) as HstsPreloadApiResponse;
    const status = normalizeHstsPreloadStatus(data.status);
    return {
      checked: status !== "error",
      status,
      name: data.name,
      domain: data.domain,
      preloadedDomain: data.preloadedDomain,
      bulk: data.bulk
    };
  } catch (error) {
    return {
      checked: false,
      status: "error",
      error: error instanceof Error ? error.message : "HSTS preload check failed"
    };
  } finally {
    clearTimeout(timer);
  }
}

function requestForProtocol(protocol: string) {
  return protocol === "http:" ? httpRequest : request;
}

async function singleHttpHead(url: string) {
  const { parsed, lookup } = await publicLookupForUrl(url, { context: "redirect target", allowedPorts: [80, 443, 8443] });

  return new Promise<{ statusCode?: number; location?: string; hsts?: string }>((resolve, reject) => {
    const req = requestForProtocol(parsed.protocol)({
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port || undefined,
      path: `${parsed.pathname}${parsed.search}`,
      method: "HEAD",
      servername: parsed.protocol === "https:" && !isIP(parsed.hostname) ? parsed.hostname : undefined,
      timeout: httpTimeoutMs,
      rejectUnauthorized: false,
      lookup,
      headers: {
        "user-agent": userAgent
      }
    }, (res) => {
      const hsts = Array.isArray(res.headers["strict-transport-security"]) ? res.headers["strict-transport-security"][0] : res.headers["strict-transport-security"];
      const location = Array.isArray(res.headers.location) ? res.headers.location[0] : res.headers.location;
      res.resume();
      resolve({ statusCode: res.statusCode, location, hsts });
    });

    req.once("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
    req.once("error", reject);
    req.end();
  });
}

async function followRedirects(startUrl: string, skipped = false): Promise<TlsRedirectCheck> {
  if (skipped) {
    return {
      testedUrl: startUrl,
      redirectsToHttps: false,
      redirectCount: 0,
      hstsOnHttpsRedirect: false,
      hops: [],
      skipped: true
    };
  }

  const hops: TlsRedirectCheck["hops"] = [];
  const visited = new Set<string>();
  let currentUrl = startUrl;
  let hstsOnHttpsRedirect = false;

  try {
    for (let count = 0; count <= maxRedirects; count += 1) {
      if (visited.has(currentUrl)) throw new Error("redirect loop");
      visited.add(currentUrl);

      const response = await singleHttpHead(currentUrl);
      const hop = {
        url: currentUrl,
        statusCode: response.statusCode,
        location: response.location,
        hsts: response.hsts
      };
      hops.push(hop);

      const isRedirect = response.statusCode && [301, 302, 303, 307, 308].includes(response.statusCode);
      if (new URL(currentUrl).protocol === "https:" && isRedirect && response.hsts) hstsOnHttpsRedirect = true;
      if (!isRedirect || !response.location) {
        return {
          testedUrl: startUrl,
          finalUrl: currentUrl,
          statusCode: response.statusCode,
          redirectsToHttps: new URL(currentUrl).protocol === "https:",
          redirectCount: Math.max(0, hops.length - 1),
          hstsOnHttpsRedirect,
          hops
        };
      }

      currentUrl = new URL(response.location, currentUrl).toString();
      if (!["http:", "https:"].includes(new URL(currentUrl).protocol)) throw new Error("unsupported redirect protocol");
    }

    throw new Error("too many redirects");
  } catch (error) {
    return {
      testedUrl: startUrl,
      finalUrl: hops.at(-1)?.url,
      statusCode: hops.at(-1)?.statusCode,
      redirectsToHttps: hops.at(-1)?.url ? new URL(hops.at(-1)?.url ?? startUrl).protocol === "https:" : false,
      redirectCount: Math.max(0, hops.length - 1),
      hstsOnHttpsRedirect,
      hops,
      error: error instanceof Error ? error.message : "redirect check failed"
    };
  }
}

async function inspectRedirects(host: string, port: number) {
  const httpsPort = port === 443 ? "" : `:${port}`;
  const httpCheck = await followRedirects(`http://${host}/`, port !== 443);
  const httpsCheck = await followRedirects(`https://${host}${httpsPort}/`);
  const final = httpsCheck.finalUrl ?? httpCheck.finalUrl;
  const canonicalHost = final ? new URL(final).hostname : undefined;
  return { http: httpCheck, https: httpsCheck, canonicalHost };
}

async function resolveCaaRecords(host: string) {
  const labels = host.split(".");
  for (let index = 0; index < labels.length - 1; index += 1) {
    const candidate = labels.slice(index).join(".");
    try {
      const records = await resolveCaa(candidate);
      if (records.length > 0) {
        return {
          present: true,
          records: records.map((record) => JSON.stringify(record))
        };
      }
    } catch {
      // CAA inherits from parent zones; keep walking upwards until a policy is found.
    }
  }
  return { present: false, records: [] };
}

function weakCipher(cipher = "") {
  return /RC4|3DES|DES|CBC|NULL|EXPORT|anon/i.test(cipher);
}

function gradeFromScore(score: number) {
  if (score >= 100) return "A+";
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  if (score >= 25) return "E";
  return "F";
}

export async function scanTlsServer(host: string, port: number, locale: Locale = "en"): Promise<TlsScanResponse> {
  const queryId = crypto.randomUUID();
  const text = scanText(locale);
  await assertPublicHostname(host, "scan target");
  const [addresses, serverCerts, chain, trust, protocols, tls12Ciphers, hsts, hstsPreload, caa, alpn, ocspStapling, redirects] = await Promise.all([
    resolvePublicHostname(host, "scan target").catch(() => []),
    getServerCertificates(host, port),
    inspectTlsChain(host, port, false, locale),
    verifyServerTrust(host, port),
    Promise.all(protocolVersions.map((version) => protocolProbe(host, port, version))),
    enumerateTls12Ciphers(host, port),
    fetchHsts(host, port),
    checkHstsPreload(host),
    resolveCaaRecords(host),
    probeAlpn(host, port),
    probeOcspStapling(host, port),
    inspectRedirects(host, port)
  ]);
  const protocolDetails = await probeProtocolDetails(host, port, protocols, locale);

  const leaf = serverCerts[0];
  const issuerPem = chain.certificates[0]?.pem ?? serverCerts[1]?.toString();
  const ocspRevocation = await checkOcspRevocation(leaf, issuerPem);
  const findings: TlsScanFinding[] = [];
  const recommendations: TlsRecommendation[] = [];
  const gradeItems: TlsGradeItem[] = [];
  const http2 = {
    supported: alpn.includes("h2"),
    negotiatedProtocol: alpn[0],
    alpnProtocols: alpn
  };
  let score = 100;

  function penalize(points: number, label: string, detail: string) {
    score -= points;
    gradeItems.push({ label, points: -points, detail });
  }

  if (!chain.hostnameValid) {
    const [title, detail] = text.hostnameMismatch;
    const [label, penaltyDetail] = text.penaltyHostname;
    findings.push({ level: "fail", title, detail });
    recommendations.push(makeRecommendation("critical", text.recHostname));
    return {
      queryId,
      host,
      port,
      grade: "M",
      score: 0,
      gradeBreakdown: {
        baseScore: 100,
        finalScore: 0,
        items: [{ label, points: -100, detail: penaltyDetail }]
      },
      summary: text.summary("M"),
      assessedAt: new Date().toISOString(),
      ipAddresses: addresses.map((address) => address.address),
      certificate: certificateDto(leaf),
      chain: {
        verified: trust.verified,
        hostnameValid: chain.hostnameValid,
        certificatesProvided: serverCerts.length,
        generatedBundleCertificates: chain.certificates.length,
        status: chain.status
      },
      protocols,
      tls12Ciphers,
      protocolDetails,
      hsts,
      hstsPreload,
      ocspStapling,
      ocspRevocation,
      http2,
      caa,
      redirects,
      alpn,
      findings,
      recommendations
    };
  }

  if (!trust.verified) {
    const [label, penaltyDetail] = text.penaltyTrust;
    penalize(60, label, penaltyDetail);
    const [title, detail] = text.certificateUntrusted;
    findings.push({ level: "fail", title, detail });
    recommendations.push(makeRecommendation("critical", text.recTrust));
  } else {
    const [title, detail] = text.certificateTrusted;
    findings.push({ level: "pass", title, detail });
  }

  const expiryDays = daysUntil(leaf.validTo);
  if (expiryDays <= 30) {
    const [label, penaltyDetail] = expiryDays <= 7 ? text.penaltyExpiryCritical : text.penaltyExpirySoon;
    penalize(expiryDays <= 7 ? 25 : 10, label, `${penaltyDetail} ${locale === "es" ? `Dias restantes: ${expiryDays}.` : `Days remaining: ${expiryDays}.`}`);
    const [title, detail] = text.certificateExpiring(expiryDays);
    findings.push({ level: "warning", title, detail });
    recommendations.push(makeRecommendation(expiryDays <= 7 ? "high" : "medium", text.recExpiry));
  }

  const supports = (name: TlsProtocolName) => protocols.some((protocol) => protocol.name === name && protocol.supported);
  if (supports("TLSv1.3")) {
    const [title, detail] = text.tls13;
    findings.push({ level: "pass", title, detail });
  } else {
    const [label, penaltyDetail] = text.penaltyNoTls13;
    penalize(5, label, penaltyDetail);
    const [title, detail] = text.noTls13;
    findings.push({ level: "info", title, detail });
    recommendations.push(makeRecommendation("low", text.recTls13));
  }

  if (!supports("TLSv1.2")) {
    const [title, detail] = text.tls12Missing;
    findings.push({ level: "warning", title, detail });
    recommendations.push(makeRecommendation("medium", text.recTls12));
  }

  for (const legacy of ["TLSv1", "TLSv1.1"] as TlsProtocolName[]) {
    if (supports(legacy)) {
      const [label, penaltyDetail] = text.penaltyLegacy(legacy);
      penalize(20, label, penaltyDetail);
      const [title, detail] = text.legacyProtocol(legacy);
      findings.push({ level: "warning", title, detail });
      recommendations.push(makeRecommendation("high", text.recLegacy(legacy), [
        { label: "nginx", value: text.recNginxProtocols },
        { label: "Apache", value: text.recApacheProtocols }
      ]));
    }
  }

  const negotiatedWeakCipher = protocols.find((protocol) => protocol.supported && weakCipher(protocol.cipher))?.cipher;
  if (negotiatedWeakCipher) {
    const [label, penaltyDetail] = text.penaltyWeakCipher;
    penalize(15, label, `${penaltyDetail} ${negotiatedWeakCipher}.`);
    const [title, detail] = text.weakCipher(negotiatedWeakCipher);
    findings.push({ level: "warning", title, detail });
    recommendations.push(makeRecommendation("medium", text.recWeakCipher, [
      { label: "nginx", value: text.recNginxCiphers },
      { label: "Apache", value: text.recApacheCiphers }
    ]));
  } else {
    const [title, detail] = text.modernCipher;
    findings.push({ level: "pass", title, detail });
  }

  const weakSupportedCiphers = tls12Ciphers.supported.filter((cipher) => cipher.weak);
  if (weakSupportedCiphers.length > 0) {
    const [label, penaltyDetail] = text.penaltyWeakSupportedCipher;
    penalize(10, label, penaltyDetail);
    const [title, detail] = text.tls12CipherWeak(weakSupportedCiphers.length);
    findings.push({ level: "warning", title, detail });
    if (!recommendations.some((recommendation) => recommendation.title === text.recWeakCipher[0])) {
      recommendations.push(makeRecommendation("medium", text.recWeakCipher, [
        { label: "nginx", value: text.recNginxCiphers },
        { label: "Apache", value: text.recApacheCiphers }
      ]));
    }
  } else if (tls12Ciphers.supported.length > 0) {
    const [title, detail] = text.tls12CipherModern(tls12Ciphers.supported.length);
    findings.push({ level: "pass", title, detail });
  } else if (supports("TLSv1.2")) {
    const [title, detail] = text.tls12CipherNone;
    findings.push({ level: "info", title, detail });
  }

  if (tls12Ciphers.serverOrder !== "unknown") {
    const [title, detail] = text.tls12ServerOrder(tls12Ciphers.serverOrder);
    findings.push({ level: "info", title, detail });
  }

  if (protocolDetails.compression.status === "supported") {
    const [label, penaltyDetail] = text.penaltyCompression;
    penalize(25, label, penaltyDetail);
    const [title, detail] = text.compressionBad;
    findings.push({ level: "fail", title, detail: protocolDetails.compression.detail ? `${detail} ${protocolDetails.compression.detail}` : detail });
    recommendations.push(makeRecommendation("high", text.recDisableCompression));
  } else if (protocolDetails.compression.status === "not-supported") {
    const [title, detail] = text.compressionOk;
    findings.push({ level: "pass", title, detail });
  } else {
    const [title, detail] = text.compressionUnknown;
    findings.push({ level: "info", title, detail: protocolDetails.compression.detail ? `${detail} ${protocolDetails.compression.detail}` : detail });
  }

  if (protocolDetails.clientRenegotiation.status === "supported") {
    const [label, penaltyDetail] = text.penaltyClientRenegotiation;
    penalize(5, label, penaltyDetail);
    const [title, detail] = text.clientRenegotiationSupported;
    findings.push({ level: "warning", title, detail: protocolDetails.clientRenegotiation.detail ? `${detail} ${protocolDetails.clientRenegotiation.detail}` : detail });
    recommendations.push(makeRecommendation("low", text.recDisableClientRenegotiation));
  } else if (protocolDetails.clientRenegotiation.status === "rejected") {
    const [title, detail] = text.clientRenegotiationRejected;
    findings.push({ level: "pass", title, detail });
  } else {
    const [title, detail] = text.renegotiationUnknown;
    findings.push({ level: "info", title, detail: protocolDetails.clientRenegotiation.detail ? `${detail} ${protocolDetails.clientRenegotiation.detail}` : detail });
  }

  if (protocolDetails.keyExchange.status === "weak") {
    const [label, penaltyDetail] = text.penaltyWeakKeyExchange;
    penalize(15, label, protocolDetails.keyExchange.detail ? `${penaltyDetail} ${protocolDetails.keyExchange.detail}` : penaltyDetail);
    const [title, detail] = text.keyExchangeWeak(protocolDetails.keyExchange.detail ?? "");
    findings.push({ level: "warning", title, detail });
    recommendations.push(makeRecommendation("high", text.recDhParams));
  } else if (protocolDetails.keyExchange.status === "modern") {
    const [title, detail] = text.keyExchangeModern(protocolDetails.keyExchange.detail ?? "");
    findings.push({ level: "pass", title, detail });
  } else {
    const [title, detail] = text.keyExchangeUnknown;
    findings.push({ level: "info", title, detail: protocolDetails.keyExchange.detail ? `${detail} ${protocolDetails.keyExchange.detail}` : detail });
  }

  if (protocolDetails.sessionResumption.status === "supported") {
    const [title, detail] = text.sessionResumptionSupported;
    findings.push({ level: "info", title, detail });
  } else {
    const [title, detail] = text.sessionResumptionUnknown;
    findings.push({ level: "info", title, detail: protocolDetails.sessionResumption.detail ? `${detail} ${protocolDetails.sessionResumption.detail}` : detail });
  }

  if (protocolDetails.fallbackScsv.status === "unknown") {
    const [title, detail] = text.fallbackScsvUnknown;
    findings.push({ level: "info", title, detail });
  }

  if (hsts.present && (hsts.maxAge ?? 0) >= 15_552_000) {
    const [title, detail] = text.hstsGood;
    findings.push({ level: "pass", title, detail });
  } else {
    const [label, penaltyDetail] = text.penaltyHsts;
    penalize(5, label, penaltyDetail);
    const [title, detail] = text.hstsWeak;
    findings.push({ level: "info", title, detail });
    recommendations.push(makeRecommendation("medium", text.recHsts, [
      { label: "nginx", value: text.recNginxHsts },
      { label: "Apache", value: text.recApacheHsts }
    ]));
  }

  if (hstsPreload.status === "preloaded") {
    const [title, detail] = text.hstsPreloadActive;
    const inherited = hstsPreload.preloadedDomain && hstsPreload.preloadedDomain !== host ? ` ${locale === "es" ? "Dominio preload" : "Preloaded domain"}: ${hstsPreload.preloadedDomain}.` : "";
    findings.push({ level: "pass", title, detail: `${detail}${inherited}` });
  } else if (hstsPreload.status === "pending" || hstsPreload.status === "pending-removal") {
    const [title, detail] = text.hstsPreloadPending(hstsPreload.status);
    findings.push({ level: "info", title, detail });
  } else if (hstsPreload.status === "error") {
    const [title, detail] = text.hstsPreloadFailed;
    findings.push({ level: "info", title, detail: hstsPreload.error ? `${detail} ${hstsPreload.error}.` : detail });
  } else {
    const [title, detail] = text.hstsPreloadMissing;
    findings.push({ level: hsts.preload ? "warning" : "info", title, detail });
    if (hsts.preload) recommendations.push(makeRecommendation("low", text.recHstsPreload));
  }

  if (ocspStapling.present) {
    const [title, detail] = text.ocspStapled;
    findings.push({ level: "pass", title, detail });
  } else {
    const [title, detail] = text.ocspMissing;
    findings.push({ level: "info", title, detail: ocspStapling.error ? `${detail} ${ocspStapling.error}.` : detail });
    recommendations.push(makeRecommendation("low", text.recOcspStapling, [
      { label: "nginx", value: text.recNginxOcsp },
      { label: "Apache", value: text.recApacheOcsp }
    ]));
  }

  if (ocspRevocation.status === "good") {
    const [title, detail] = text.ocspRevocationGood;
    findings.push({ level: "pass", title, detail });
  } else if (ocspRevocation.status === "revoked") {
    const [label, penaltyDetail] = text.penaltyRevoked;
    penalize(80, label, ocspRevocation.revocationTime ? `${penaltyDetail} Revocation time: ${ocspRevocation.revocationTime}.` : penaltyDetail);
    const [title, detail] = text.ocspRevocationRevoked;
    findings.push({ level: "fail", title, detail });
    recommendations.push(makeRecommendation("critical", text.recRevoked));
  } else if (ocspRevocation.status === "unknown") {
    const [title, detail] = text.ocspRevocationUnknown;
    findings.push({ level: "warning", title, detail: ocspRevocation.error ? `${detail} ${ocspRevocation.error}.` : detail });
  } else {
    const [title, detail] = text.ocspRevocationUnavailable;
    findings.push({ level: "info", title, detail: ocspRevocation.error ? `${detail} ${ocspRevocation.error}.` : detail });
  }

  if (http2.supported) {
    const [title, detail] = text.http2Supported;
    findings.push({ level: "pass", title, detail });
  } else {
    const [title, detail] = text.http2Missing;
    findings.push({ level: "info", title, detail: http2.negotiatedProtocol ? `${detail} ${locale === "es" ? "Protocolo negociado" : "Negotiated protocol"}: ${http2.negotiatedProtocol}.` : detail });
    recommendations.push(makeRecommendation("low", text.recHttp2, [
      { label: "nginx", value: text.recNginxHttp2 },
      { label: "Apache", value: text.recApacheHttp2 }
    ]));
  }

  if (caa.present) {
    const [title, detail] = text.caaFound;
    findings.push({ level: "pass", title, detail });
  } else {
    const [title, detail] = text.caaMissing;
    findings.push({ level: "info", title, detail });
    recommendations.push(makeRecommendation("info", text.recCaa, [{ label: "DNS", value: text.recCaaExample }]));
  }

  if (!redirects.http.skipped) {
    if (redirects.http.error) {
      const [title, detail] = text.redirectLoop;
      findings.push({ level: "warning", title, detail: `${detail} ${redirects.http.error}.` });
      recommendations.push(makeRecommendation("low", text.recRedirectChain));
    } else if (redirects.http.redirectsToHttps) {
      const [title, detail] = text.redirectHttpOk;
      findings.push({ level: "pass", title, detail });
    } else {
      const [title, detail] = text.redirectHttpMissing;
      findings.push({ level: "warning", title, detail });
      recommendations.push(makeRecommendation("medium", text.recHttpRedirect, [
        { label: "nginx", value: text.recNginxHttpRedirect },
        { label: "Apache", value: text.recApacheHttpRedirect }
      ]));
    }
  }

  if (redirects.https.error) {
    const [title, detail] = text.redirectLoop;
    findings.push({ level: "warning", title, detail: `${detail} ${redirects.https.error}.` });
    recommendations.push(makeRecommendation("low", text.recRedirectChain));
  }

  const firstHttpsHop = redirects.https.hops[0];
  const firstHttpsIsRedirect = firstHttpsHop?.statusCode && [301, 302, 303, 307, 308].includes(firstHttpsHop.statusCode);
  if (firstHttpsIsRedirect && !firstHttpsHop.hsts) {
    const [title, detail] = text.redirectHttpsHstsMissing;
    findings.push({ level: "warning", title, detail });
    if (!recommendations.some((recommendation) => recommendation.title === text.recHttpsRedirectHsts[0])) {
      recommendations.push(makeRecommendation("medium", text.recHttpsRedirectHsts, [
        { label: "nginx", value: text.recNginxHsts },
        { label: "Apache", value: text.recApacheHsts }
      ]));
    }
  }

  if (redirects.canonicalHost && redirects.canonicalHost !== host) {
    const [title, detail] = text.redirectCanonical(redirects.canonicalHost);
    findings.push({ level: "info", title, detail });
  }

  if (redirects.http.redirectCount > 2 || redirects.https.redirectCount > 2) {
    const [title, detail] = text.redirectTooLong;
    findings.push({ level: "warning", title, detail });
    recommendations.push(makeRecommendation("low", text.recRedirectChain));
  }

  score = Math.max(0, Math.min(100, score));
  const grade = trust.verified ? gradeFromScore(score) : "T";

  return {
    queryId,
    host,
    port,
    grade,
    score,
    gradeBreakdown: {
      baseScore: 100,
      finalScore: score,
      items: grade === "T" && !gradeItems.some((item) => item.label === text.penaltyTrust[0])
        ? [{ label: text.penaltyTrust[0], points: -60, detail: text.penaltyTrust[1] }, ...gradeItems]
        : gradeItems
    },
    summary: text.summary(grade),
    assessedAt: new Date().toISOString(),
    ipAddresses: addresses.map((address) => address.address),
    certificate: certificateDto(leaf),
    chain: {
        verified: trust.verified,
      hostnameValid: chain.hostnameValid,
      certificatesProvided: serverCerts.length,
      generatedBundleCertificates: chain.certificates.length,
        status: trust.verified ? "OK" : chain.status
    },
    protocols,
    tls12Ciphers,
    protocolDetails,
    hsts,
    hstsPreload,
    ocspStapling,
    ocspRevocation,
    http2,
    caa,
    redirects,
    alpn,
    findings,
    recommendations
  };
}

function makeRecommendation(severity: TlsRecommendation["severity"], text: string[], config?: TlsRecommendation["config"]): TlsRecommendation {
  return {
    severity,
    title: text[0],
    impact: text[1],
    action: text[2],
    config
  };
}
