import { BadgeCheck, DownloadCloud, FileKey2, ShieldCheck } from "lucide-react";
import { copy, type Locale } from "@/lib/i18n";
import type { CertificateDto } from "@/lib/types";

export function CertificateCard({ cert, locale = "en" }: { cert: CertificateDto; locale?: Locale }) {
  const Icon = cert.role === "leaf" ? FileKey2 : cert.role === "root" ? ShieldCheck : DownloadCloud;
  const text = copy[locale];

  return (
    <article className="cert-panel border border-line bg-white/80 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-mint text-signal">
            <Icon size={20} />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-ink/45">
              {cert.index + 1}. {text.role[cert.role]} / {text.source[cert.source]}
            </p>
            <h3 className="mt-1 break-words text-lg font-black text-night">{cert.subject}</h3>
          </div>
        </div>
        {cert.ca ? (
          <span className="inline-flex items-center gap-2 rounded-md bg-vault px-3 py-1 text-xs font-black text-secure">
            <BadgeCheck size={14} />
            CA
          </span>
        ) : null}
      </div>

      <dl className="mt-5 grid gap-3 text-sm md:grid-cols-2">
        <div>
          <dt className="font-black text-ink/45">{text.issuer}</dt>
          <dd className="mt-1 break-words font-semibold text-ink/75">{cert.issuer}</dd>
        </div>
        <div>
          <dt className="font-black text-ink/45">{text.validity}</dt>
          <dd className="mt-1 font-semibold text-ink/75">{cert.validFrom} - {cert.validTo}</dd>
        </div>
        <div>
          <dt className="font-black text-ink/45">Serial</dt>
          <dd className="mt-1 break-all font-semibold text-ink/75">{cert.serialNumber}</dd>
        </div>
        <div>
          <dt className="font-black text-ink/45">SHA-256</dt>
          <dd className="mt-1 break-all font-semibold text-ink/75">{cert.fingerprint256}</dd>
        </div>
      </dl>
      {cert.subjectAltName ? (
        <p className="mt-4 break-words border-t border-line pt-4 text-xs font-semibold leading-6 text-ink/60">{cert.subjectAltName}</p>
      ) : null}
    </article>
  );
}
