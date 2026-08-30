"use client";

import { useState } from "react";
import { bench, blocks, meta, questions } from "@/lib/invent";
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
import GroupCheck from "@/app/group-check";
import { RichText } from "@/lib/glossary";

export default function InventStop() {
  const { lang } = useLang();
  const [mode, setMode] = useState<"without" | "with">("without");
  const armed = mode === "with";

  return (
    <main className="page">
      <LessonHeader meta={meta} lang={lang} />
      <SimulatedNote lang={lang} />

      <Workbench title={bench.title} note={bench.note} lang={lang}>
        <Choices
          options={[
            { id: "without" as const, label: bench.without, hint: bench.withoutHint },
            { id: "with" as const, label: bench.withTools, hint: bench.withHint },
          ]}
          value={mode}
          onChange={setMode}
          lang={lang}
          label={bench.toggle}
        />

        <ul className="iv-list">
          {questions.map((q) => {
            const a = armed ? q.with : q.without;
            return (
              <li key={q.id} className={`iv-item ${a.ok ? "iv-ok" : "iv-bad"}`}>
                <p className="iv-ask">{t(q.ask, lang)}</p>
                <p className="iv-why">
                  <span className="iv-k">{t(bench.whyWord, lang)}</span>
                  {t(q.why, lang)}
                </p>
                {armed && (
                  <p className="iv-via mono">
                    <span className="iv-k">{t(bench.viaWord, lang)}</span>
                    {t(q.with.via, lang)}
                  </p>
                )}
                <p className="iv-answer">
                  <span className="iv-k">{t(bench.answerWord, lang)}</span>
                  {t(a.text, lang)}
                </p>
                <p className="iv-check">
                  <span className="iv-k">
                    {a.ok ? "✓ " : "✕ "}
                    {t(bench.checkWord, lang)}
                  </span>
                  <RichText text={t(a.checkable, lang)} lang={lang} />
                </p>
              </li>
            );
          })}
        </ul>
      </Workbench>

      {blocks.map((b, i) => (
        <Prose key={i} block={b} lang={lang} />
      ))}

      <Takeaway text={meta.takeaway} lang={lang} />
      <GroupCheck href="/invent" lang={lang} />
      <StopNav lang={lang} />
    </main>
  );
}
