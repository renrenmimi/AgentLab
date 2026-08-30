"use client";

import { useState } from "react";
import { bench, blocks, meta, mitigations, page } from "@/lib/trust";
import { useLang, t } from "@/lib/i18n";
import {
  Choices,
  LessonHeader,
  Prose,
  SimulatedNote,
  StopNav,
  Takeaway,
  Workbench,
} from "@/app/lesson";

export default function TrustStop() {
  const { lang } = useLang();
  const [view, setView] = useState<"human" | "array">("human");
  const [mit, setMit] = useState(mitigations[0].id);

  const active = mitigations.find((m) => m.id === mit) ?? mitigations[0];
  const injected = view === "array";

  return (
    <main className="page">
      <LessonHeader meta={meta} lang={lang} />
      <SimulatedNote lang={lang} />

      <Prose block={blocks[0]} lang={lang} />

      <Workbench title={bench.title} note={bench.note} lang={lang}>
        <p className="lsn-note">
          <b>{t(bench.taskWord, lang)}:</b> {t(bench.task, lang)}
        </p>

        <Choices
          options={[
            { id: "human" as const, label: bench.human, hint: bench.humanHint },
            { id: "array" as const, label: bench.array, hint: bench.arrayHint },
          ]}
          value={view}
          onChange={setView}
          lang={lang}
          label={bench.viewLabel}
        />

        <div className="tr-frame">
          <div className="tr-bar mono">{page.url}</div>
          <pre className={`tr-page${injected ? " tr-page-raw" : ""}`}>
            {t(injected ? page.array : page.human, lang)}
          </pre>
        </div>

        <div className={`lsn-col ${injected ? "lsn-col-bad" : "lsn-col-good"}`}>
          <div className="lsn-col-h">
            {injected ? "✕" : "✓"} {t(bench.outWord, lang)}
          </div>
          <pre className="lsn-quote">
            {t(injected ? bench.outputHit : bench.outputSafe, lang)}
          </pre>
          {injected && <p className="tr-note">{t(bench.hitNote, lang)}</p>}
        </div>
      </Workbench>

      <Prose block={blocks[1]} lang={lang} />

      <Workbench title={bench.mitTitle} lang={lang}>
        <Choices
          options={mitigations.map((m) => ({ id: m.id, label: m.name }))}
          value={mit}
          onChange={setMit}
          lang={lang}
          label={bench.mitLabel}
        />

        <div className="tr-mit">
          <span
            className={`tr-tag tr-tag-${active.strength}`}
            title={t(
              active.strength === "structural" ? bench.tagStructural : bench.tagText,
              lang,
            )}
          >
            {t(
              active.strength === "structural" ? bench.tagStructural : bench.tagText,
              lang,
            )}
          </span>
          <p className="tr-what">{t(active.what, lang)}</p>
          <div className="lsn-two">
            <div className="lsn-col lsn-col-good">
              <div className="lsn-col-h">✓ {t(bench.stopsWord, lang)}</div>
              <p className="lsn-note">{t(active.stops, lang)}</p>
            </div>
            <div className="lsn-col lsn-col-bad">
              <div className="lsn-col-h">✕ {t(bench.notWord, lang)}</div>
              <p className="lsn-note">{t(active.doesNot, lang)}</p>
            </div>
          </div>
        </div>
      </Workbench>

      <Prose block={blocks[2]} lang={lang} />

      <Takeaway text={meta.takeaway} lang={lang} />
      <StopNav lang={lang} />
    </main>
  );
}
