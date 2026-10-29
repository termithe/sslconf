import { BadgeCheck, BookOpenCheck, FileSearch, KeyRound, Network, Route, ShieldCheck, type LucideIcon } from "lucide-react";
import type { Locale } from "@/lib/i18n";

type Tool = "scan" | "check" | "decode" | "csr";

type Section = {
  icon: LucideIcon;
  title: string;
  paragraphs?: string[];
  items?: string[];
};

type RelatedTool = { href: string; label: string; description: string };

type ToolContent = {
  title: string;
  lead: string;
  sections: Section[];
  relatedTitle: string;
  related: RelatedTool[];
};

const content: Record<Locale, Record<Tool, ToolContent>> = {
  en: {
    scan: {
      title: "What this SSL/TLS checker reviews",
      lead: "Run the test against a public HTTPS hostname to collect configuration evidence from the endpoint that responds to the scanner. The report separates confirmed findings from checks that could not complete within the available test window.",
      sections: [
        { icon: ShieldCheck, title: "Certificate and trust", paragraphs: ["The test checks hostname coverage, certificate validity, public-key details and the supplied certificate chain. A hostname mismatch or an untrusted chain is reported distinctly because either condition prevents normal browser trust."] },
        { icon: Network, title: "Protocols, ciphers and transport", paragraphs: ["The scanner probes available TLS versions and negotiated ciphers, then reports transport signals such as compression, renegotiation, ALPN, session resumption and key-exchange details when they are observable."] },
        { icon: Route, title: "HTTPS policy signals", paragraphs: ["The report follows HTTP and HTTPS redirects, inspects HSTS, checks CAA records and records HTTP/2, OCSP stapling and revocation signals when the endpoint and issuer data permit those checks."] }
      ],
      relatedTitle: "Continue the investigation",
      related: [
        { href: "/installation", label: "SSL Installation Checker", description: "Confirm the certificate installation and endpoint consistency without the full protocol scan." },
        { href: "/headers", label: "Security Headers Checker", description: "Review HSTS, CSP and browser-facing response headers." },
        { href: "/methodology", label: "Scoring methodology", description: "See the evidence, penalties and limits behind an SSLConf grade." }
      ]
    },
    check: {
      title: "Build the CA bundle your server needs",
      lead: "A server-ready TLS chain normally contains the leaf certificate followed by the required intermediate CA certificates. Clients already carry trusted root certificates, so sending a root in the served chain is usually unnecessary.",
      sections: [
        { icon: Network, title: "How the chain is reconstructed", paragraphs: ["SSLConf starts with the public leaf certificate, follows issuer information and trusted CA repository data, and builds the issuer path required to connect the certificate to a trusted root."] },
        { icon: BookOpenCheck, title: "How to use the generated PEM", items: ["Use the default output when you need the intermediate certificates for a web-server CA bundle.", "Select the root option only when a platform or integration explicitly asks for it.", "Keep the private key separate; a CA bundle never contains it."] },
        { icon: BadgeCheck, title: "When a chain still fails", paragraphs: ["A valid downloaded bundle does not repair an expired leaf certificate, an incorrect virtual-host configuration or a server that continues to deliver an old chain. Use the Installation Checker after deployment to verify what visitors actually receive."] }
      ],
      relatedTitle: "Related certificate tools",
      related: [
        { href: "/installation", label: "SSL Installation Checker", description: "Verify the certificate chain currently delivered by the public endpoint." },
        { href: "/decode", label: "SSL Certificate Decoder", description: "Inspect issuer, AIA, validity and extensions from a PEM certificate." },
        { href: "/scan", label: "SSL Checker", description: "Review chain trust alongside TLS protocols, ciphers and HTTPS policy." }
      ]
    },
    decode: {
      title: "Inspect an X.509 certificate before deployment",
      lead: "Paste one certificate in PEM or Base64-encoded DER form to read the fields encoded in it. Decoding describes the certificate; it does not prove that a server is currently presenting that certificate or that it is trusted by every client.",
      sections: [
        { icon: FileSearch, title: "Identity, issuer and validity", paragraphs: ["Check the subject, issuer, serial number, validity dates and SHA-256 fingerprint. For HTTPS, the DNS names in Subject Alternative Name are the names clients use to validate the hostname."] },
        { icon: KeyRound, title: "Public key and extensions", paragraphs: ["The decoder exposes the public-key algorithm and size, signature algorithm, key usage and common X.509 extensions. These fields help identify whether the certificate is intended for TLS server use and who issued it."] },
        { icon: BookOpenCheck, title: "PEM and DER input", paragraphs: ["PEM is the text form marked with BEGIN and END certificate lines. DER is binary; this tool accepts its Base64 representation so that it can be pasted safely into the browser."] }
      ],
      relatedTitle: "Next certificate checks",
      related: [
        { href: "/check", label: "CA Bundle Generator", description: "Build the intermediate CA chain for a public certificate." },
        { href: "/match", label: "Certificate & Private Key Matcher", description: "Confirm that a certificate belongs to the intended private key pair." },
        { href: "/installation", label: "SSL Installation Checker", description: "Check the certificate that a live HTTPS endpoint actually serves." }
      ]
    },
    csr: {
      title: "Validate a certificate signing request before sending it",
      lead: "A CSR is a PKCS#10 request containing the subject, public key and requested extensions that a certificate authority can use when issuing a certificate. It is not itself a TLS certificate.",
      sections: [
        { icon: BadgeCheck, title: "What a CSR contains", paragraphs: ["Review the subject and public key first, then inspect DNS Subject Alternative Names. Modern public certificates rely on SAN entries for hostname coverage, including the common name when it must be covered."] },
        { icon: ShieldCheck, title: "Signature validation", paragraphs: ["The validator checks that the CSR signature matches the public key embedded in the request. A valid signature confirms the request was formed consistently; it does not guarantee that a certificate authority will approve the names or organisation details."] },
        { icon: KeyRound, title: "Common request mistakes", items: ["Missing a required DNS name from the SAN list.", "Using a private key that does not match the submitted CSR.", "Sending an outdated CSR after generating a replacement key pair."] }
      ],
      relatedTitle: "Related CSR tools",
      related: [
        { href: "/csr/generate", label: "CSR Generator", description: "Create a PKCS#10 request and private key locally in the browser." },
        { href: "/decode", label: "SSL Certificate Decoder", description: "Inspect the certificate issued from an approved CSR." },
        { href: "/match", label: "Certificate & Private Key Matcher", description: "Verify that the issued certificate matches the private key you intend to install." }
      ]
    }
  },
  es: {
    scan: {
      title: "Qué revisa este análisis SSL/TLS",
      lead: "Ejecuta el análisis contra un hostname HTTPS público para recopilar evidencias de configuración del endpoint que responde al escáner. El informe separa los hallazgos confirmados de las comprobaciones que no pudieron terminar dentro de la ventana disponible.",
      sections: [
        { icon: ShieldCheck, title: "Certificado y confianza", paragraphs: ["El test comprueba la cobertura del hostname, validez del certificado, datos de clave pública y cadena de certificados enviada. Una discrepancia de hostname o una cadena no confiable se muestra por separado porque cualquiera de ellas impide la confianza normal del navegador."] },
        { icon: Network, title: "Protocolos, ciphers y transporte", paragraphs: ["El escáner sondea las versiones TLS disponibles y los ciphers negociados, y muestra señales de transporte como compresión, renegociación, ALPN, reanudación de sesión e intercambio de claves cuando son observables."] },
        { icon: Route, title: "Señales de política HTTPS", paragraphs: ["El informe sigue redirecciones HTTP y HTTPS, inspecciona HSTS, comprueba registros CAA y recoge señales de HTTP/2, OCSP stapling y revocación cuando el endpoint y los datos del emisor lo permiten."] }
      ],
      relatedTitle: "Continúa la investigación",
      related: [
        { href: "/installation", label: "Validador de instalación TLS", description: "Confirma la instalación del certificado y la consistencia de endpoints sin el análisis completo de protocolos." },
        { href: "/headers", label: "Analizador de cabeceras", description: "Revisa HSTS, CSP y las cabeceras que recibe el navegador." },
        { href: "/methodology", label: "Metodología de puntuación", description: "Consulta las evidencias, penalizaciones y límites de una nota SSLConf." }
      ]
    },
    check: {
      title: "Genera el CA bundle que necesita tu servidor",
      lead: "Una cadena TLS lista para servidor contiene normalmente el certificado leaf seguido de los certificados CA intermedios necesarios. Los clientes ya incorporan las raíces confiables, por lo que enviar una raíz en la cadena servida suele ser innecesario.",
      sections: [
        { icon: Network, title: "Cómo se reconstruye la cadena", paragraphs: ["SSLConf parte del certificado leaf público, sigue la información de emisor y los datos del repositorio de CA confiables, y construye la ruta necesaria para conectar el certificado con una raíz de confianza."] },
        { icon: BookOpenCheck, title: "Cómo usar el PEM generado", items: ["Usa la salida predeterminada cuando necesites los certificados intermedios para el CA bundle de un servidor web.", "Selecciona la opción de raíz solo cuando una plataforma o integración la solicite de forma explícita.", "Mantén la clave privada separada; un CA bundle nunca la contiene."] },
        { icon: BadgeCheck, title: "Cuando una cadena sigue fallando", paragraphs: ["Un bundle descargado válido no corrige un certificado leaf caducado, un virtual host incorrecto ni un servidor que continúa entregando una cadena antigua. Usa el Validador de instalación después del despliegue para comprobar qué reciben los visitantes."] }
      ],
      relatedTitle: "Herramientas de certificados relacionadas",
      related: [
        { href: "/installation", label: "Validador de instalación TLS", description: "Comprueba la cadena de certificado que entrega actualmente el endpoint público." },
        { href: "/decode", label: "Decodificador de certificados", description: "Inspecciona emisor, AIA, validez y extensiones de un certificado PEM." },
        { href: "/scan", label: "Análisis SSL/TLS", description: "Revisa la confianza de cadena junto con protocolos, ciphers y política HTTPS." }
      ]
    },
    decode: {
      title: "Inspecciona un certificado X.509 antes de desplegarlo",
      lead: "Pega un certificado PEM o DER codificado en Base64 para leer los campos que contiene. Decodificar describe el certificado; no demuestra que un servidor lo entregue actualmente ni que todos los clientes confíen en él.",
      sections: [
        { icon: FileSearch, title: "Identidad, emisor y validez", paragraphs: ["Comprueba subject, emisor, número de serie, fechas de validez y huella SHA-256. Para HTTPS, los nombres DNS de Subject Alternative Name son los que los clientes usan para validar el hostname."] },
        { icon: KeyRound, title: "Clave pública y extensiones", paragraphs: ["El decodificador muestra algoritmo y tamaño de clave pública, algoritmo de firma, usos de clave y extensiones X.509 habituales. Estos campos ayudan a identificar si el certificado está destinado a TLS de servidor y quién lo emitió."] },
        { icon: BookOpenCheck, title: "Entrada PEM y DER", paragraphs: ["PEM es el formato de texto marcado con las líneas BEGIN y END de certificado. DER es binario; esta herramienta acepta su representación Base64 para poder pegarla de forma segura en el navegador."] }
      ],
      relatedTitle: "Siguientes comprobaciones de certificado",
      related: [
        { href: "/check", label: "Generador de CA bundle", description: "Genera la cadena de CA intermedia de un certificado público." },
        { href: "/match", label: "Comprobador de certificado y clave", description: "Confirma que un certificado pertenece al par de clave privada esperado." },
        { href: "/installation", label: "Validador de instalación TLS", description: "Comprueba el certificado que sirve realmente un endpoint HTTPS activo." }
      ]
    },
    csr: {
      title: "Valida una solicitud de certificado antes de enviarla",
      lead: "Una CSR es una solicitud PKCS#10 que contiene el subject, la clave pública y las extensiones solicitadas que una autoridad certificadora puede usar al emitir un certificado. No es un certificado TLS.",
      sections: [
        { icon: BadgeCheck, title: "Qué contiene una CSR", paragraphs: ["Revisa primero el subject y la clave pública y después los DNS Subject Alternative Names. Los certificados públicos modernos dependen de las entradas SAN para cubrir hostnames, incluido el nombre común cuando deba quedar cubierto."] },
        { icon: ShieldCheck, title: "Validación de firma", paragraphs: ["El validador comprueba que la firma de la CSR coincide con la clave pública incluida en la solicitud. Una firma válida confirma que la solicitud se formó de manera consistente; no garantiza que una autoridad certificadora apruebe los nombres ni los datos de organización."] },
        { icon: KeyRound, title: "Errores habituales de solicitud", items: ["Omitir un nombre DNS necesario de la lista SAN.", "Usar una clave privada que no coincide con la CSR enviada.", "Enviar una CSR antigua después de generar un par de claves nuevo."] }
      ],
      relatedTitle: "Herramientas CSR relacionadas",
      related: [
        { href: "/csr/generate", label: "Generador de CSR", description: "Crea una solicitud PKCS#10 y una clave privada localmente en el navegador." },
        { href: "/decode", label: "Decodificador de certificados", description: "Inspecciona el certificado emitido a partir de una CSR aprobada." },
        { href: "/match", label: "Comprobador de certificado y clave", description: "Verifica que el certificado emitido coincide con la clave privada que se instalará." }
      ]
    }
  }
};

export function ToolSeoContent({ locale, tool }: { locale: Locale; tool: Tool }) {
  const text = content[locale][tool];
  const prefix = locale === "es" ? "/es" : "";

  return (
    <section className="mt-14 border-t-2 border-night pt-8" aria-labelledby={`${tool}-guide-title`}>
      <h2 id={`${tool}-guide-title`} className="max-w-3xl font-serif text-3xl font-semibold text-night">{text.title}</h2>
      <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-ink/70">{text.lead}</p>

      <div className="mt-8 grid gap-x-10 gap-y-7 lg:grid-cols-3">
        {text.sections.map((section) => {
          const Icon = section.icon;
          return <article key={section.title} className="border-l-2 border-line pl-4">
            <Icon size={20} className="text-signal" aria-hidden="true" />
            <h3 className="mt-3 font-black text-night">{section.title}</h3>
            {section.paragraphs?.map((paragraph) => <p key={paragraph} className="mt-2 text-sm font-semibold leading-6 text-ink/65">{paragraph}</p>)}
            {section.items ? <ul className="mt-3 space-y-2">{section.items.map((item) => <li key={item} className="flex gap-2 text-sm font-semibold leading-6 text-ink/65"><span className="mt-2 h-1.5 w-1.5 shrink-0 bg-signal" />{item}</li>)}</ul> : null}
          </article>;
        })}
      </div>

      <section className="mt-10 border-y border-line py-7" aria-labelledby={`${tool}-related-title`}>
        <h2 id={`${tool}-related-title`} className="text-xs font-black uppercase tracking-[0.16em] text-ink/50">{text.relatedTitle}</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {text.related.map((related) => <a key={related.href} href={`${prefix}${related.href}`} className="border-l-2 border-secure pl-4 transition hover:border-signal"><h3 className="font-black text-night transition hover:text-signal">{related.label}</h3><p className="mt-2 text-sm font-semibold leading-6 text-ink/65">{related.description}</p></a>)}
        </div>
      </section>
    </section>
  );
}
