"use client";

import { areas, bench, blocks, meta } from "@/lib/next";
import { useLang, t } from "@/lib/i18n";
import { RichText } from "@/lib/glossary";
import {
  LessonHeader,
  Prose,
  StopNav,
  Takeaway,
  Workbench,
} from "@/app/lesson";

export default function NextStop() {
  const { lang } = useLang();

  return (
    <main className="page">
      <LessonHeader meta={meta} lang={lang} />

      <Prose block={blocks[0]} lang={lang} />

      <Workbench title={bench.title} note={bench.note} lang={lang}>
        <ul className="nx-list">
          {areas.map((area) => (
            <li key={area.id} className="nx-item">
              <h3 className="nx-name">
                {t(area.name, lang)}
                {area.link && (
                  <a href={area.link.href} target="_blank" rel="noreferrer">
                    {area.link.label}
                  </a>
                )}
              </h3>
              <p className="nx-p">
                <span className="iv-k">{t(bench.whatWord, lang)}</span>
                <RichText text={t(area.what, lang)} lang={lang} />
              </p>
              <p className="nx-p nx-why">
                <span className="iv-k">{t(bench.whyWord, lang)}</span>
                <RichText text={t(area.why, lang)} lang={lang} />
              </p>
              <p className="nx-p">
                <span className="iv-k">{t(bench.whereWord, lang)}</span>
                <RichText text={t(area.where, lang)} lang={lang} />
              </p>
            </li>
          ))}
        </ul>
      </Workbench>

      <Prose block={blocks[1]} lang={lang} />

      <Takeaway text={meta.takeaway} lang={lang} />
      <StopNav lang={lang} />
    </main>
  );
}
