import { copy, type Locale } from "@/lib/i18n";

export function LoadingState({ locale = "en", label }: { locale?: Locale; label?: string }) {
  return (
    <div className="report-section">
      <div className="h-2 w-full overflow-hidden rounded-full bg-line">
        <div className="h-full w-1/3 animate-pulse bg-secure" />
      </div>
      <p className="mt-4 text-sm font-black uppercase tracking-[0.16em] text-ink/55">{label ?? copy[locale].loading}</p>
    </div>
  );
}
