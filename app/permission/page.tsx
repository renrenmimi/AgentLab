"use client";

import { useState } from "react";
import {
  bench,
  blocks,
  branches,
  meta,
  prelude,
  type Beat,
  type Choice,
} from "@/lib/permission";
import { useLang, t, type Lang } from "@/lib/i18n";
import {
  LessonHeader,
  Prose,
  SimulatedNote,
  StopNav,
  Takeaway,
  Workbench,
} from "@/app/lesson";

export default function PermissionStop() {
  const { lang } = useLang();
  const [choice, setChoice] = useState<Choice | null>(null);

  const branch = branches.find((b) => b.id === choice) ?? null;

  return (
    <main className="page">
      <LessonHeader meta={meta} lang={lang} />
      <SimulatedNote lang={lang} />

      <Workbench title={bench.title} note={bench.note} lang={lang}>
        <ol className="pm-run">
          {prelude.map((beat, i) => (
            <BeatRow
              key={i}
              beat={beat}
              lang={lang}
              waiting={i === prelude.length - 1 && !branch}
            />
          ))}
          {branch?.beats.map((beat, i) => (
            <BeatRow key={`b-${i}`} beat={beat} lang={lang} waiting={false} />
          ))}
        </ol>

        {!branch ? (
          <fieldset className="pm-ask">
            <legend>{t(bench.chooseLabel, lang)}</legend>
            <div className="pm-buttons">
              {branches.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={`btn pm-btn pm-${b.id}`}
                  onClick={() => setChoice(b.id)}
                >
                  <span className="pm-btn-name">{t(b.name, lang)}</span>
                  <span className="pm-btn-hint">{t(b.hint, lang)}</span>
                </button>
              ))}
            </div>
          </fieldset>
        ) : (
          <div className="pm-after">
            <div className={`lsn-col ${branch.tone === "bad" ? "lsn-col-bad" : "lsn-col-good"}`}>
              <div className="lsn-col-h">
                {branch.tone === "bad" ? "✕" : "✓"} {t(bench.commitsWord, lang)}
              </div>
              <p className="lsn-note">{t(branch.commits, lang)}</p>
            </div>
            <div className="lsn-col">
              <div className="lsn-col-h">{t(bench.verdictWord, lang)}</div>
              <p className="lsn-note">{t(branch.verdict, lang)}</p>
            </div>
            <button type="button" className="btn" onClick={() => setChoice(null)}>
              ↻ {t(bench.resetWord, lang)}
            </button>
          </div>
        )}
      </Workbench>

      {blocks.map((b, i) => (
        <Prose key={i} block={b} lang={lang} />
      ))}

      <Takeaway text={meta.takeaway} lang={lang} />
      <StopNav lang={lang} />
    </main>
  );
}

function BeatRow({
  beat,
  lang,
  waiting,
}: {
  beat: Beat;
  lang: Lang;
  waiting: boolean;
}) {
  return (
    <li
      className={`pm-beat pm-${beat.who}${beat.bad ? " pm-bad" : ""}${
        waiting ? " pm-waiting" : ""
      }`}
    >
      <span className="pm-who">{beat.who}</span>
      <span className="pm-body">
        <b>
          {t(beat.label, lang)}
          {beat.effect && (
            <span className="pm-effect">{t(bench.effectTag, lang)}</span>
          )}
        </b>
        {t(beat.body, lang)}
      </span>
      {waiting && <span className="pm-pending">{t(bench.pending, lang)}</span>}
    </li>
  );
}
