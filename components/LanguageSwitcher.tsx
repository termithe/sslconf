"use client";

import { usePathname, useRouter } from "next/navigation";
import { isSpanishPath, localeCookieName, localizedPath, type Locale } from "@/lib/i18n";

function setLocaleCookie(locale: Locale) {
  document.cookie = `${localeCookieName}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

export function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const currentLocale: Locale = isSpanishPath(pathname) ? "es" : "en";

  function choose(locale: Locale) {
    setLocaleCookie(locale);
    router.push(`${localizedPath(pathname, locale)}${window.location.search}`);
  }

  return (
    <div className="flex items-center divide-x divide-line border border-line bg-white text-xs font-black text-ink/65" aria-label="Language selector">
      {(["en", "es"] as const).map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => choose(locale)}
          className={`px-2.5 py-1 transition ${currentLocale === locale ? "bg-night text-white" : "hover:bg-mint hover:text-night"}`}
          aria-pressed={currentLocale === locale}
        >
          {locale.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
