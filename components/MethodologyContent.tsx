import { BadgeInfo, CheckCircle2, CircleAlert, Gauge, Network, ShieldCheck } from "lucide-react";
import type { Locale } from "@/lib/i18n";

const content = {
  en: {
    eyebrow: "SSL/TLS diagnostics",
    title: "How SSLConf assesses an SSL/TLS server.",
    intro: "The Server Test is a repeatable configuration review of a public TLS endpoint. It is designed to make the grade, evidence and limits visible, not to replace a full security assessment.",
    back: "Run SSL/TLS Server Test",
    scoreTitle: "Scoring model",
    scoreLead: "Every scan starts at 100. Confirmed configuration issues subtract points. A hostname mismatch is reported as M and an untrusted chain as T, rather than presenting either as a normal letter grade.",
    gradeTitle: "Grade bands",
    grades: [["A+", "100"], ["A", "85–99"], ["B", "70–84"], ["C", "55–69"], ["D", "40–54"], ["E", "25–39"], ["F", "0–24"], ["M", "Hostname mismatch"], ["T", "Untrusted chain"]],
    penaltyTitle: "Point deductions currently applied",
    penalties: [
      ["Untrusted certificate chain", "−60, reported as T"],
      ["Certificate expires in 7 days or less", "−25"],
      ["Certificate expires in 30 days or less", "−10"],
      ["TLS 1.3 unavailable", "−5"],
      ["TLS 1.0 or TLS 1.1 enabled", "−20 per protocol"],
      ["Weak or legacy cipher negotiated", "−15"],
      ["Weak TLS 1.2 cipher suite accepted", "−10"],
      ["TLS compression enabled", "−25"],
      ["Client-initiated renegotiation accepted", "−5"],
      ["Weak ephemeral key exchange", "−15"],
      ["HSTS missing or max-age below 180 days", "−5"],
      ["Certificate confirmed revoked through OCSP", "−80"]
    ],
    endpointTitle: "Public endpoint coverage",
    endpointLead: "The scanner resolves public IPv4 and IPv6 addresses and attempts a TLS handshake against each selected endpoint using the requested hostname as SNI. A completed endpoint with a weaker confirmed TLS posture can reduce the overall grade. An endpoint that times out or cannot complete a handshake is shown as unavailable coverage; it does not, by itself, reduce the score.",
    checksTitle: "What the report checks",
    checks: [
      ["Certificate and trust", "Hostname coverage, validity, public-key details, supplied chain and path validation against the available trust store."],
      ["Protocols and ciphers", "TLS 1.0 through TLS 1.3 probes, negotiated ciphers, TLS 1.2 cipher enumeration and an indicative server-order check."],
      ["Transport behavior", "TLS compression, secure and client-initiated renegotiation, TLS_FALLBACK_SCSV, session resumption, ALPN and negotiated key exchange details when observable."],
      ["HTTP, DNS and revocation signals", "HTTP-to-HTTPS flow, HTTPS redirect behavior, HSTS, preload status, HTTP/2 through ALPN, CAA, OCSP stapling and OCSP revocation when the issuer data and responder permit it."],
      ["Indicative compatibility", "A small set of current TLS client profiles. This is not an exhaustive simulation of browser or operating-system versions."]
    ],
    signalsTitle: "Signals that do not directly lower the score",
    signalsLead: "SSLConf still reports these because they are useful configuration evidence or recommendations. Their absence alone does not lower the current numerical grade:",
    signals: ["HTTP/2 availability", "CAA records", "OCSP stapling", "HSTS preload status", "redirect-chain length and HSTS on an HTTPS redirect", "session resumption and TLS_FALLBACK_SCSV status when no explicit penalty applies"],
    limitsTitle: "Scope and limitations",
    limits: [
      "The result is a point-in-time observation from the scanner's network path. DNS, CDNs, geographic routing and load balancers can serve different configurations to other clients.",
      "A failed probe means the scanner could not confirm that check in its time window. It is not automatically evidence that the server does not support the feature.",
      "The test is not a web-application penetration test, a vulnerability scanner, a certificate-authority audit or an exhaustive client-compatibility simulator.",
      "SSLConf uses its own transparent rules. A grade is not intended to be equivalent to an SSL Labs grade or another provider's assessment.",
      "Use the evidence and recommendations as input to change control; test configuration changes in your own environment before production rollout."
    ],
    referencesTitle: "Technical references",
    references: [
      ["TLS 1.3, RFC 8446", "https://www.rfc-editor.org/info/rfc8446/"],
      ["HTTP Strict Transport Security, RFC 6797", "https://www.rfc-editor.org/info/rfc6797/"],
      ["Certification Authority Authorization, RFC 8659", "https://www.rfc-editor.org/rfc/rfc8659.html"],
      ["Online Certificate Status Protocol, RFC 6960", "https://www.rfc-editor.org/info/rfc6960/"]
    ]
  },
  es: {
    eyebrow: "Diagnóstico SSL/TLS",
    title: "Cómo evalúa SSLConf un servidor SSL/TLS.",
    intro: "El Análisis SSL/TLS es una revisión reproducible de la configuración de un endpoint TLS público. Está diseñado para mostrar la nota, las evidencias y sus límites, no para sustituir una auditoría de seguridad completa.",
    back: "Analizar dominio",
    scoreTitle: "Modelo de puntuación",
    scoreLead: "Cada análisis parte de 100. Los problemas de configuración confirmados restan puntos. Si el hostname no coincide se muestra M y si la cadena no es confiable se muestra T, en lugar de tratarlos como una letra normal.",
    gradeTitle: "Rangos de nota",
    grades: [["A+", "100"], ["A", "85–99"], ["B", "70–84"], ["C", "55–69"], ["D", "40–54"], ["E", "25–39"], ["F", "0–24"], ["M", "Hostname no cubierto"], ["T", "Cadena no confiable"]],
    penaltyTitle: "Penalizaciones aplicadas actualmente",
    penalties: [
      ["Cadena de certificados no confiable", "−60, se muestra T"],
      ["El certificado caduca en 7 días o menos", "−25"],
      ["El certificado caduca en 30 días o menos", "−10"],
      ["TLS 1.3 no disponible", "−5"],
      ["TLS 1.0 o TLS 1.1 habilitado", "−20 por protocolo"],
      ["Cipher débil o heredado negociado", "−15"],
      ["Suite TLS 1.2 débil aceptada", "−10"],
      ["Compresión TLS activa", "−25"],
      ["Renegociación iniciada por cliente aceptada", "−5"],
      ["Intercambio de clave efímera débil", "−15"],
      ["HSTS ausente o max-age inferior a 180 días", "−5"],
      ["Certificado confirmado como revocado mediante OCSP", "−80"]
    ],
    endpointTitle: "Cobertura de endpoints públicos",
    endpointLead: "El escáner resuelve direcciones IPv4 e IPv6 públicas e intenta un handshake TLS contra cada endpoint seleccionado utilizando el hostname solicitado como SNI. Un endpoint completado con una postura TLS confirmada más débil puede reducir la nota global. Un endpoint que agota el tiempo o no completa el handshake se muestra como cobertura no disponible; por sí solo no reduce la puntuación.",
    checksTitle: "Qué comprueba el informe",
    checks: [
      ["Certificado y confianza", "Cobertura del hostname, validez, detalles de clave pública, cadena enviada y validación de ruta contra el almacén de confianza disponible."],
      ["Protocolos y ciphers", "Sondeos TLS 1.0 a TLS 1.3, ciphers negociados, enumeración de suites TLS 1.2 y una comprobación indicativa del orden del servidor."],
      ["Comportamiento de transporte", "Compresión TLS, renegociación segura e iniciada por cliente, TLS_FALLBACK_SCSV, reanudación de sesión, ALPN y datos del intercambio de claves negociado cuando son observables."],
      ["Señales HTTP, DNS y revocación", "Flujo HTTP a HTTPS, redirecciones HTTPS, HSTS, estado preload, HTTP/2 mediante ALPN, CAA, OCSP stapling y revocación OCSP cuando los datos del emisor y el responder lo permiten."],
      ["Compatibilidad indicativa", "Un conjunto reducido de perfiles TLS actuales. No es una simulación exhaustiva de versiones de navegadores o sistemas operativos."]
    ],
    signalsTitle: "Señales que no restan puntos directamente",
    signalsLead: "SSLConf sigue mostrando estas señales porque aportan evidencia de configuración o recomendaciones. Su ausencia, por sí sola, no reduce la nota numérica actual:",
    signals: ["Disponibilidad de HTTP/2", "Registros CAA", "OCSP stapling", "Estado HSTS preload", "longitud de la cadena de redirecciones y HSTS en una redirección HTTPS", "reanudación de sesión y estado TLS_FALLBACK_SCSV cuando no hay una penalización explícita"],
    limitsTitle: "Alcance y limitaciones",
    limits: [
      "El resultado es una observación puntual desde la red del escáner. DNS, CDN, enrutamiento geográfico y balanceadores pueden entregar configuraciones distintas a otros clientes.",
      "Un sondeo fallido significa que el escáner no pudo confirmar esa comprobación en su ventana de tiempo. No demuestra automáticamente que el servidor no admita esa función.",
      "El test no es una prueba de intrusión de aplicación web, un escáner de vulnerabilidades, una auditoría de autoridad certificadora ni un simulador exhaustivo de compatibilidad de clientes.",
      "SSLConf usa reglas propias y transparentes. La nota no pretende ser equivalente a SSL Labs ni a la evaluación de otro proveedor.",
      "Usa las evidencias y recomendaciones como entrada para el control de cambios; prueba los ajustes en tu entorno antes de aplicarlos en producción."
    ],
    referencesTitle: "Referencias técnicas",
    references: [
      ["TLS 1.3, RFC 8446", "https://www.rfc-editor.org/info/rfc8446/"],
      ["HTTP Strict Transport Security, RFC 6797", "https://www.rfc-editor.org/info/rfc6797/"],
      ["Certification Authority Authorization, RFC 8659", "https://www.rfc-editor.org/rfc/rfc8659.html"],
      ["Online Certificate Status Protocol, RFC 6960", "https://www.rfc-editor.org/info/rfc6960/"]
    ]
  }
} as const;

export function MethodologyContent({ locale }: { locale: Locale }) {
  const text = content[locale];
  const prefix = locale === "es" ? "/es" : "";

  return (
    <main className="px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <section className="border-b border-line pb-10">
          <div className="inline-flex items-center gap-2 border-l-2 border-signal pl-3 text-xs font-black uppercase tracking-[0.18em] text-signal"><span className="h-2 w-2 bg-secure" />{text.eyebrow}</div>
          <h1 className="mt-5 max-w-4xl text-balance font-serif text-[2.6rem] font-semibold leading-[1.04] text-night sm:text-6xl">{text.title}</h1>
          <p className="mt-5 max-w-3xl text-lg font-semibold leading-relaxed text-ink/70">{text.intro}</p>
          <a href={`${prefix}/scan`} className="mt-7 inline-flex h-11 items-center gap-2 bg-night px-4 text-sm font-black text-white transition hover:bg-signal"><Gauge size={17} aria-hidden="true" />{text.back}</a>
        </section>

        <section className="grid gap-8 py-12 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="report-section py-0">
            <SectionHeading icon={Gauge} title={text.scoreTitle} />
            <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-ink/70">{text.scoreLead}</p>
            <h3 className="mt-8 text-xs font-black uppercase tracking-[0.16em] text-ink/50">{text.gradeTitle}</h3>
            <div className="mt-4 grid grid-cols-3 border border-line sm:grid-cols-5">
              {text.grades.map(([grade, range]) => <div key={grade} className="min-w-0 border-b border-r border-line p-3 last:border-r-0 sm:nth-[5n]:border-r-0"><p className="text-xl font-black text-night">{grade}</p><p className="mt-1 text-xs font-bold leading-5 text-ink/60">{range}</p></div>)}
            </div>
          </div>
          <aside className="border-l-4 border-signal bg-mint/55 p-5 text-sm font-semibold leading-7 text-ink/70">
            <BadgeInfo className="text-signal" size={23} aria-hidden="true" />
            <p className="mt-3">{locale === "es" ? "La sección “Por qué esta nota” de cada informe se genera con estas mismas penalizaciones aplicadas por el backend." : "The “Why this grade?” section in every report is generated from these same backend penalties."}</p>
          </aside>
        </section>

        <section className="report-section">
          <SectionHeading icon={CircleAlert} title={text.penaltyTitle} />
          <div className="mt-5 overflow-hidden border border-line bg-white/75">
            <div className="divide-y divide-line">
              {text.penalties.map(([label, points]) => <div key={label} className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center"><p className="text-sm font-bold leading-6 text-ink/75">{label}</p><p className="font-mono text-sm font-black text-fault sm:text-right">{points}</p></div>)}
            </div>
          </div>
        </section>

        <section className="report-section">
          <SectionHeading icon={Network} title={text.endpointTitle} />
          <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-ink/70">{text.endpointLead}</p>
        </section>

        <section className="report-section">
          <SectionHeading icon={ShieldCheck} title={text.checksTitle} />
          <div className="mt-5 grid gap-x-10 gap-y-6 lg:grid-cols-2">
            {text.checks.map(([title, detail]) => <article key={title} className="border-l-2 border-line pl-4"><h3 className="font-black text-night">{title}</h3><p className="mt-2 text-sm font-semibold leading-6 text-ink/65">{detail}</p></article>)}
          </div>
        </section>

        <section className="grid gap-10 border-y border-line py-10 lg:grid-cols-2">
          <div>
            <h2 className="font-serif text-3xl font-semibold text-night">{text.signalsTitle}</h2>
            <p className="mt-4 text-sm font-semibold leading-7 text-ink/70">{text.signalsLead}</p>
            <ul className="mt-5 space-y-3">
              {text.signals.map((signal) => <li key={signal} className="flex gap-3 text-sm font-semibold leading-6 text-ink/70"><CheckCircle2 className="mt-0.5 shrink-0 text-secure" size={18} aria-hidden="true" />{signal}</li>)}
            </ul>
          </div>
          <div>
            <h2 className="font-serif text-3xl font-semibold text-night">{text.limitsTitle}</h2>
            <ul className="mt-5 space-y-3">
              {text.limits.map((limit) => <li key={limit} className="flex gap-3 text-sm font-semibold leading-6 text-ink/70"><span className="mt-2 h-2 w-2 shrink-0 bg-signal" />{limit}</li>)}
            </ul>
          </div>
        </section>

        <section className="py-10">
          <h2 className="font-serif text-3xl font-semibold text-night">{text.referencesTitle}</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {text.references.map(([label, href]) => <li key={href}><a href={href} target="_blank" rel="noreferrer" className="block border border-line bg-white px-4 py-3 text-sm font-bold text-ink/70 transition hover:border-signal hover:text-signal">{label}</a></li>)}
          </ul>
        </section>
      </div>
    </main>
  );
}

function SectionHeading({ icon: Icon, title }: { icon: typeof Gauge; title: string }) {
  return <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center border border-line bg-white text-signal"><Icon size={19} aria-hidden="true" /></span><h2 className="font-serif text-3xl font-semibold text-night">{title}</h2></div>;
}
