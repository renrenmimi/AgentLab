"use client";

// 一页读完。给回头查东西的人：读过一遍之后，多半只想找回其中一段。

import { useEffect, useRef } from "react";
import Link from "next/link";
import { COURSE, CHECK_SECTIONS } from "@/lib/course";
import { ui, useLang, t } from "@/lib/i18n";
import { RichText } from "@/lib/glossary";

export default function AllPage() {
  const { lang } = useLang();

  // A link to a heading has to land on it in either language. The server
  // renders English and a Chinese reader's page switches after hydration, which
  // changes the height of everything above the heading after the browser has
  // already started scrolling to it: the reader ended up some 2,400 px below
  // it. So the page re-anchors whenever the language settles, until the reader
  // scrolls on their own.
  const moved = useRef(false);
  useEffect(() => {
    const stop = () => {
      moved.current = true;
    };
    const opts = { passive: true, once: true } as const;
    window.addEventListener("wheel", stop, opts);
    window.addEventListener("touchmove", stop, opts);
    window.addEventListener("keydown", stop, { once: true });
    return () => {
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchmove", stop);
      window.removeEventListener("keydown", stop);
    };
  }, []);
  useEffect(() => {
    if (moved.current || !location.hash) return;
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    target?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [lang]);

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
            {/* The link sits beside the heading, not in it, so the heading's
                name is the stop's name and not "… Open this stop →". */}
            <div className="all-stop-head">
              <h2 id={anchor} className="all-stop-title">
                <span className="all-stop-n">{stop.glyph}</span>
                {t(stop.title, lang)}
              </h2>
              <Link className="all-open" href={stop.href}>
                {t(ui.all.openStop, lang)} →
              </Link>
            </div>
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
