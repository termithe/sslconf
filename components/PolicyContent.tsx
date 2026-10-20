import { Database, Eye, KeyRound, Mail, Scale, ShieldCheck, TriangleAlert } from "lucide-react";
import type { Locale } from "@/lib/i18n";

type PolicyKind = "privacy" | "acceptable";

const content = {
  en: {
    privacy: {
      eyebrow: "Operational transparency",
      title: "Privacy and data use.",
      intro: "This page explains the data flows implemented by SSLConf's current public tools. It is an operational notice, not a substitute for legal advice tailored to a future account, payment, analytics or marketing feature.",
      updated: "Last updated: 20 October 2026.",
      sections: [
        {
          icon: Eye,
          title: "Data you provide",
          paragraphs: [
            "Public diagnostic tools receive the hostname, optional supported port and language selection needed to perform the requested check. SSLConf connects only to public endpoints accepted by its validation controls.",
            "Certificate and CSR decoders receive the PEM or DER material you paste. The Certificate & Key Matcher receives both the certificate and private key supplied for the comparison. Only submit material you are authorised to provide; do not use the matcher for production keys that you cannot safely disclose to this service."
          ]
        },
        {
          icon: KeyRound,
          title: "How sensitive material is handled",
          paragraphs: [
            "Decoder and certificate-key matching requests are processed in memory. Their responses use no-store and the application telemetry records request metadata, not pasted certificate, CSR or private-key content. The matcher response is not cached.",
            "The CSR Generator is different: it generates the private key and CSR in the browser with Web Crypto. The private key is not sent to an SSLConf API. Download and protect it before leaving the page; SSLConf cannot recover it."
          ]
        },
        {
          icon: Database,
          title: "Technical logs, rate limits and short-lived cache",
          paragraphs: [
            "For reliability and abuse prevention, application logs can include a request ID, selected tool, hostname and port, response status, duration, cache state and a one-way shortened hash of the client network address. The application does not log pasted PEM, CSR or private-key content.",
            "Some public endpoint checks are held in an in-memory cache for a short period, normally five or ten minutes depending on the tool, to limit repeat connections. This cache is capacity-limited and is not a user profile. Deployment and hosting providers can process operational logs under their own service terms; this page does not define their retention periods."
          ]
        },
        {
          icon: ShieldCheck,
          title: "Browser storage and third parties",
          paragraphs: [
            "SSLConf stores the sslconf_locale cookie for up to one year to remember the language. After successful server tests, the browser can keep up to six recent hostnames in localStorage under sslconf_recent_scan_hosts. You can remove both through your browser settings or the relevant tool control.",
            "The current application code does not include user accounts, advertising tags or a third-party analytics SDK. If that changes, this notice must be revised before the feature is enabled."
          ]
        },
        {
          icon: Mail,
          title: "Questions and changes",
          paragraphs: [
            "For a security report, use the published security contact. For questions about this operational notice, contact contacto@sslconf.com. Material changes to these data flows will be reflected here with a new update date."
          ]
        }
      ]
    },
    acceptable: {
      eyebrow: "Public tool limits",
      title: "Responsible use.",
      intro: "SSLConf is for analysing public HTTPS services and certificate material that you are entitled to inspect. Use it responsibly, within the authority you have and with consideration for the systems being contacted.",
      updated: "Last updated: 20 October 2026.",
      sections: [
        {
          icon: ShieldCheck,
          title: "Permitted use",
          paragraphs: [
            "Use the service to inspect your own public endpoints, systems you manage, or targets for which you have clear permission. The tools are intended for configuration review, troubleshooting and operational validation.",
            "Treat every result as point-in-time technical evidence. DNS, CDNs, load balancers and network location can change what the scanner observes. Validate planned production changes in your own environment."
          ]
        },
        {
          icon: TriangleAlert,
          title: "Do not use SSLConf to",
          paragraphs: [
            "Do not scan private, internal or restricted systems; bypass access controls; probe systems without authority; run excessive automation; attempt to degrade availability; or use results to facilitate unauthorised access.",
            "Do not submit credentials, personal data, confidential business data or private keys that you are not authorised to disclose. The Certificate & Key Matcher should be used only when sending the key to this service is an acceptable risk for you."
          ]
        },
        {
          icon: Scale,
          title: "Rate limits and service safeguards",
          paragraphs: [
            "SSLConf applies input validation, public-address restrictions, timeouts, caching and rate limits to protect the service and third-party endpoints. These controls are not permission to test a target. We may restrict requests that threaten reliability, security or acceptable use.",
            "Do not try to evade these controls or distribute tooling that does. If you need recurring or high-volume checks, use a controlled monitoring process with explicit authorisation from the target owner."
          ]
        },
        {
          icon: Eye,
          title: "Scope of results",
          paragraphs: [
            "SSLConf is not a penetration test, a complete vulnerability assessment, a certificate-authority audit or a guarantee of browser compatibility. Its grades follow SSLConf's published methodology and are not equivalent to another provider's grade.",
            "You remain responsible for evaluating the result, applying changes safely and meeting the security, contractual and legal obligations relevant to your systems."
          ]
        },
        {
          icon: Mail,
          title: "Report misuse",
          paragraphs: [
            "Report suspected abuse, a security concern or an issue with these limits to contacto@sslconf.com or through the security contact published in security.txt."
          ]
        }
      ]
    }
  },
  es: {
    privacy: {
      eyebrow: "Transparencia operativa",
      title: "Privacidad y uso de datos.",
      intro: "Esta página explica los flujos de datos implementados por las herramientas públicas actuales de SSLConf. Es un aviso operativo, no sustituye el asesoramiento legal adaptado a futuras funciones de cuentas, pagos, analítica o marketing.",
      updated: "Última actualización: 20 de octubre de 2026.",
      sections: [
        {
          icon: Eye,
          title: "Datos que proporcionas",
          paragraphs: [
            "Las herramientas de diagnóstico público reciben el hostname, el puerto opcional admitido y el idioma necesarios para realizar la comprobación solicitada. SSLConf conecta solo con endpoints públicos aceptados por sus controles de validación.",
            "Los decodificadores de certificados y CSR reciben el material PEM o DER que pegues. El Comprobador de certificado y clave recibe tanto el certificado como la clave privada para realizar la comparación. Envía únicamente material que estés autorizado a proporcionar; no utilices el comprobador con claves de producción que no puedas revelar de forma segura a este servicio."
          ]
        },
        {
          icon: KeyRound,
          title: "Tratamiento del material sensible",
          paragraphs: [
            "Las solicitudes del decodificador y del comprobador certificado-clave se procesan en memoria. Sus respuestas usan no-store y la telemetría de la aplicación registra metadatos de la solicitud, no el contenido pegado de certificados, CSR ni claves privadas. La respuesta del comprobador no se almacena en caché.",
            "El Generador de CSR es diferente: genera la clave privada y la CSR en el navegador mediante Web Crypto. La clave privada no se envía a ninguna API de SSLConf. Descárgala y protégela antes de salir de la página; SSLConf no puede recuperarla."
          ]
        },
        {
          icon: Database,
          title: "Logs técnicos, límites y caché de corta duración",
          paragraphs: [
            "Para fiabilidad y prevención de abuso, los logs de aplicación pueden incluir un identificador de solicitud, la herramienta elegida, hostname y puerto, estado de respuesta, duración, estado de caché y un hash abreviado unidireccional de la dirección de red del cliente. La aplicación no registra contenido pegado de PEM, CSR ni claves privadas.",
            "Algunas comprobaciones de endpoints públicos se mantienen en una caché en memoria durante un periodo corto, normalmente cinco o diez minutos según la herramienta, para limitar conexiones repetidas. Esta caché tiene capacidad limitada y no es un perfil de usuario. Los proveedores de despliegue y alojamiento pueden procesar logs operativos bajo sus propios términos; esta página no define sus plazos de conservación."
          ]
        },
        {
          icon: ShieldCheck,
          title: "Almacenamiento en el navegador y terceros",
          paragraphs: [
            "SSLConf guarda la cookie sslconf_locale hasta un año para recordar el idioma. Tras análisis de servidor correctos, el navegador puede conservar hasta seis hostnames recientes en localStorage con la clave sslconf_recent_scan_hosts. Puedes eliminar ambos desde la configuración del navegador o el control de la herramienta correspondiente.",
            "El código actual de la aplicación no incluye cuentas de usuario, etiquetas publicitarias ni un SDK de analítica de terceros. Si eso cambia, este aviso deberá revisarse antes de activar esa función."
          ]
        },
        {
          icon: Mail,
          title: "Consultas y cambios",
          paragraphs: [
            "Para informar de un asunto de seguridad, utiliza el contacto de seguridad publicado. Para consultas sobre este aviso operativo, escribe a contacto@sslconf.com. Los cambios relevantes en estos flujos de datos se reflejarán aquí con una nueva fecha de actualización."
          ]
        }
      ]
    },
    acceptable: {
      eyebrow: "Límites de herramientas públicas",
      title: "Uso responsable.",
      intro: "SSLConf sirve para analizar servicios HTTPS públicos y material de certificados que tienes derecho a inspeccionar. Úsalo de forma responsable, dentro de tu autorización y teniendo en cuenta los sistemas contactados.",
      updated: "Última actualización: 20 de octubre de 2026.",
      sections: [
        {
          icon: ShieldCheck,
          title: "Uso permitido",
          paragraphs: [
            "Utiliza el servicio para inspeccionar tus propios endpoints públicos, sistemas que administras o destinos para los que dispones de permiso claro. Las herramientas están orientadas a revisión de configuración, resolución de incidencias y validación operativa.",
            "Trata cada resultado como evidencia técnica puntual. DNS, CDN, balanceadores y la ubicación de red pueden cambiar lo que observa el escáner. Valida los cambios previstos en producción dentro de tu propio entorno."
          ]
        },
        {
          icon: TriangleAlert,
          title: "No utilices SSLConf para",
          paragraphs: [
            "No analices sistemas privados, internos o restringidos; no eludas controles de acceso; no sondees sistemas sin autorización; no ejecutes automatizaciones excesivas; no intentes degradar la disponibilidad; ni emplees resultados para facilitar accesos no autorizados.",
            "No envíes credenciales, datos personales, información empresarial confidencial ni claves privadas cuya divulgación no estés autorizado a realizar. El Comprobador de certificado y clave debe usarse solo cuando enviar la clave a este servicio sea un riesgo aceptable para ti."
          ]
        },
        {
          icon: Scale,
          title: "Límites y salvaguardas del servicio",
          paragraphs: [
            "SSLConf aplica validación de entrada, restricciones de direcciones públicas, timeouts, caché y límites de solicitudes para proteger el servicio y los endpoints de terceros. Estos controles no constituyen permiso para probar un destino. Podemos restringir solicitudes que amenacen la fiabilidad, la seguridad o el uso aceptable.",
            "No intentes eludir estos controles ni distribuyas herramientas para hacerlo. Para comprobaciones recurrentes o de alto volumen, utiliza un proceso de monitorización controlado y con autorización explícita del propietario del destino."
          ]
        },
        {
          icon: Eye,
          title: "Alcance de los resultados",
          paragraphs: [
            "SSLConf no es una prueba de intrusión, una evaluación completa de vulnerabilidades, una auditoría de autoridad certificadora ni una garantía de compatibilidad de navegadores. Sus notas siguen la metodología publicada de SSLConf y no son equivalentes a la nota de otro proveedor.",
            "Sigues siendo responsable de evaluar el resultado, aplicar cambios de forma segura y cumplir las obligaciones de seguridad, contractuales y legales aplicables a tus sistemas."
          ]
        },
        {
          icon: Mail,
          title: "Comunicar un uso indebido",
          paragraphs: [
            "Comunica un posible abuso, una preocupación de seguridad o un problema con estos límites a contacto@sslconf.com o al contacto de seguridad publicado en security.txt."
          ]
        }
      ]
    }
  }
} as const;

export function PolicyContent({ locale, policy }: { locale: Locale; policy: PolicyKind }) {
  const text = content[locale][policy];
  const prefix = locale === "es" ? "/es" : "";

  return (
    <main className="px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <section className="border-b border-line pb-10">
          <div className="inline-flex items-center gap-2 border-l-2 border-signal pl-3 text-xs font-black uppercase tracking-[0.18em] text-signal"><span className="h-2 w-2 bg-secure" />{text.eyebrow}</div>
          <h1 className="mt-5 max-w-4xl text-balance font-serif text-[2.6rem] font-semibold leading-[1.04] text-night sm:text-6xl">{text.title}</h1>
          <p className="mt-5 max-w-3xl text-lg font-semibold leading-relaxed text-ink/70">{text.intro}</p>
          <p className="mt-5 font-mono text-xs font-bold uppercase tracking-[0.1em] text-ink/45">{text.updated}</p>
        </section>

        <div className="divide-y divide-line">
          {text.sections.map((section) => {
            const Icon = section.icon;
            return (
              <section key={section.title} className="grid gap-5 py-9 sm:grid-cols-[52px_minmax(0,1fr)] sm:gap-6">
                <span className="grid h-10 w-10 place-items-center border border-line bg-mint text-signal"><Icon size={20} aria-hidden="true" /></span>
                <div>
                  <h2 className="font-serif text-3xl font-semibold text-night">{section.title}</h2>
                  <div className="mt-4 space-y-4 text-sm font-semibold leading-7 text-ink/70">
                    {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        <aside className="mt-2 border-l-4 border-signal bg-mint/55 p-5 text-sm font-semibold leading-7 text-ink/70">
          <a href={`${prefix}/methodology`} className="font-black text-signal underline decoration-signal/35 underline-offset-4 transition hover:text-night">{locale === "es" ? "Consulta la metodología del Análisis SSL/TLS" : "Read the SSL/TLS Server Test methodology"}</a>
          <span>{locale === "es" ? " para conocer el alcance de las notas y comprobaciones." : " for the scope of grades and checks."}</span>
        </aside>
      </div>
    </main>
  );
}
