import { AlertTriangle } from "lucide-react";
import { copy, type Locale } from "@/lib/i18n";

export function ErrorState({ message, locale = "en" }: { message: string; locale?: Locale }) {
  return (
    <div className="border border-fault/25 bg-white/80 p-5 text-fault">
      <div className="flex items-center gap-3">
        <AlertTriangle size={20} />
        <p className="font-black">{copy[locale].errorTitle}</p>
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-ink/70">{message}</p>
    </div>
  );
}
