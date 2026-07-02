"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ui, useLang, t } from "@/lib/i18n";

export default function Nav() {
  const path = usePathname();
  const { lang, setLang } = useLang();

  const stops = [
    { href: "/", num: "01", label: t(ui.nav.stop1, lang) },
    { href: "/loop", num: "02", label: t(ui.nav.stop2, lang) },
    { href: "/build", num: "03", label: t(ui.nav.stop3, lang) },
  ];

  return (
    <nav className="nav">
      <Link href="/" className="nav-brand">
        <span className="brand">AgentLab</span>
        <span className="nav-brand-sub">{t(ui.nav.brandSub, lang)}</span>
      </Link>
      <div className="nav-right">
        <div className="nav-stops">
          {stops.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className={`nav-stop ${path === s.href ? "on" : ""}`}
            >
              <span className="nav-num">{s.num}</span>
              {s.label}
            </Link>
          ))}
        </div>
        <div className="lang-switch" role="group" aria-label="Language">
          <button
            className={lang === "zh" ? "on" : ""}
            onClick={() => setLang("zh")}
          >
            中
          </button>
          <button
            className={lang === "en" ? "on" : ""}
            onClick={() => setLang("en")}
          >
            EN
          </button>
        </div>
      </div>
    </nav>
  );
}
