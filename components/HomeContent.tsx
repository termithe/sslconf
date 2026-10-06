import { ArrowRight, FileKey2, FilePenLine, FileSearch, Gauge, LockKeyhole, Route, ShieldCheck, type LucideIcon } from "lucide-react";
import { TLSServerScanForm } from "@/components/TLSServerScanForm";
import { copy, type Locale } from "@/lib/i18n";

const checkIcons = [ShieldCheck, Route, LockKeyhole] as const;
const toolIcons = [Gauge, FileKey2, FileSearch, FilePenLine] as const;

export function HomeContent({ locale }: { locale: Locale }) {
  const text = copy[locale];
  const prefix = locale === "es" ? "/es" : "";
  const toolLinks = [`${prefix}/scan`, `${prefix}/check`, `${prefix}/decode`, `${prefix}/csr`];

  return (
    <main className="px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <section className="grid gap-12 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
          <div>
            <div className="inline-flex items-center gap-2 border-l-2 border-signal pl-3 text-xs font-black uppercase tracking-[0.18em] text-signal">
              <span className="h-2 w-2 bg-secure" />
              SSL/TLS Diagnostics
            </div>
            <h1 className="mt-5 max-w-4xl font-serif text-[2.6rem] font-semibold leading-[1.04] text-night sm:text-[3.25rem]">
              {text.homeTitle}
            </h1>
            <p className="mt-4 max-w-2xl text-lg font-semibold leading-relaxed text-ink/70">
              {text.homeDescription}
            </p>
            <div className="mt-6">
              <TLSServerScanForm locale={locale} />
            </div>
          </div>

          <aside className="report-aside xl:mt-20">
            <h2 className="font-black text-night">{text.checksTitle}</h2>
            <div className="mt-5 space-y-4">
              {text.checks.map(([title, description], index) => {
                const Icon = checkIcons[index] as LucideIcon;
                return (
                  <div key={title} className="flex gap-3 border-t border-line pt-4 first:border-0 first:pt-0">
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center bg-mint text-signal">
                      <Icon size={18} />
                    </span>
                    <div>
                      <h3 className="font-black text-night">{title}</h3>
                      <p className="mt-1 text-sm font-semibold leading-6 text-ink/65">{description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        </section>

        <section className="mt-14 border-t border-night pt-5">
          <h2 className="text-sm font-black uppercase tracking-[0.16em] text-ink/55">{text.homeToolsTitle}</h2>
          <div className="mt-4 divide-y divide-line border-y border-line">
            {text.homeTools.slice(1).map(([title, description, action], index) => {
              const toolIndex = index + 1;
              const Icon = toolIcons[toolIndex] as LucideIcon;
              return (
                <a key={title} href={toolLinks[toolIndex]} className="group grid gap-5 px-1 py-6 transition hover:bg-white/65 md:grid-cols-[48px_minmax(0,1fr)_auto] md:items-center md:px-5">
                  <span className="grid h-12 w-12 shrink-0 place-items-center bg-mint text-signal">
                    <Icon size={22} />
                  </span>
                  <div>
                    <h3 className="text-xl font-black text-night">{title}</h3>
                    <p className="mt-2 max-w-2xl text-sm font-semibold leading-7 text-ink/65">{description}</p>
                  </div>
                  <span className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.14em] text-signal">
                    {action}
                    <ArrowRight className="text-ink/35 transition group-hover:translate-x-1 group-hover:text-signal" size={19} />
                  </span>
                </a>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
