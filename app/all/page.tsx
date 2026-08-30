"use client";

// 一页读完。给回头查东西的人：读过一遍之后，多半只想找回其中一段。

import Link from "next/link";
import { COURSE, CHECK_SECTIONS } from "@/lib/course";
import { ui, useLang, t } from "@/lib/i18n";
import { RichText } from "@/lib/glossary";

export default function AllPage() {
  const { lang } = useLang();

  const sectionsFor = (href: string) => {
    const stop = COURSE.find((s) => s.href === href);
    const extra = CHECK_SECTIONS.filter((c) => c.href === href).map((c) => c.section);
    return [...(stop?.sections ?? []), ...extra];
  };

  return (
    <main className="page all">
      <header className="header">
        <div>
          <h1 className="page-title">{t(ui.all.title, lang)}</h1>
          <p className="subtitle">{t(ui.all.subtitle, lang)}</p>
        </div>
      </header>

      <p className="lsn-sim">{t(ui.all.intro, lang)}</p>

      <nav className="all-toc" aria-label={t(ui.all.toc, lang)}>
        <div className="eyebrow">{t(ui.all.toc, lang)}</div>
        <ol>
          {COURSE.map((stop) => (
            <li key={stop.href}>
              <a href={`#${stop.href === "/" ? "start" : stop.href.slice(1)}`}>
                <span className="all-toc-n">{stop.glyph}</span>
                {t(stop.title, lang)}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {COURSE.map((stop) => {
        const anchor = stop.href === "/" ? "start" : stop.href.slice(1);
        return (
          <article key={stop.href} className="all-stop">
            <h2 id={anchor} className="all-stop-title">
              <span className="all-stop-n">{stop.glyph}</span>
              {t(stop.title, lang)}
              <Link className="all-open" href={stop.href}>
                {t(ui.all.openStop, lang)} →
              </Link>
            </h2>
            <p className="all-sub">{t(stop.subtitle, lang)}</p>

            {sectionsFor(stop.href).map((section) => (
              <section key={section.id} className="all-section">
                <h3 id={section.id} className="all-heading">
                  <a className="all-anchor" href={`#${section.id}`} aria-label={t(section.heading, lang)}>
                    {t(section.heading, lang)}
                  </a>
                </h3>
                {section.staticNote && (
                  <p className="all-static">{t(ui.all.staticNote, lang)}</p>
                )}
                {section.paras.map((para, i) => (
                  <p key={i} className="lsn-p">
                    <RichText text={t(para, lang)} lang={lang} />
                  </p>
                ))}
              </section>
            ))}
          </article>
        );
      })}
    </main>
  );
}
