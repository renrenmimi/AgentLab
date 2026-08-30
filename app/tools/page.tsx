"use client";

import { useState } from "react";
import { bench, blocks, cases, meta, type Side } from "@/lib/tools";
import { useLang, t, type Lang } from "@/lib/i18n";
import {
  Choices,
  LessonHeader,
  Prose,
  SimulatedNote,
  StopNav,
  Takeaway,
  Workbench,
} from "@/app/lesson";

export default function ToolsStop() {
  const { lang } = useLang();
  const [id, setId] = useState(cases[0].id);
  const active = cases.find((c) => c.id === id) ?? cases[0];

  return (
    <main className="page">
      <LessonHeader meta={meta} lang={lang} />
      <SimulatedNote lang={lang} />

      <Prose block={blocks[0]} lang={lang} />

      <Workbench title={bench.title} note={bench.note} lang={lang}>
        <Choices
          options={cases.map((c) => ({ id: c.id, label: c.task, hint: c.flaw }))}
          value={id}
          onChange={setId}
          lang={lang}
          label={bench.chooseLabel}
        />

        <p className="lsn-note">
          <b>{t(bench.flawWord, lang)}:</b> {t(active.flaw, lang)}
        </p>

        <div className="lsn-two">
          <SideCol side={active.vague} head={t(bench.vagueHead, lang)} lang={lang} />
          <SideCol side={active.precise} head={t(bench.preciseHead, lang)} lang={lang} />
        </div>
      </Workbench>

      <Prose block={blocks[1]} lang={lang} />

      <Takeaway text={meta.takeaway} lang={lang} />
      <StopNav lang={lang} />
    </main>
  );
}

function SideCol({ side, head, lang }: { side: Side; head: string; lang: Lang }) {
  return (
    <div className={`lsn-col ${side.good ? "lsn-col-good" : "lsn-col-bad"}`}>
      <div className="lsn-col-h">
        {side.good ? "✓" : "✕"} {head}
      </div>

      <div className="tl-def">
        <div className="tl-name mono">{side.tool.name}</div>
        <div className="tl-field">
          <span className="tl-k">{t(bench.descWord, lang)}</span>
          <span className="tl-v">{t(side.tool.description, lang)}</span>
        </div>
        <div className="tl-field">
          <span className="tl-k">{t(bench.schemaWord, lang)}</span>
          <span className="tl-v mono">{side.tool.schema}</span>
        </div>
      </div>

      <dl className="tl-run">
        <dt>{t(bench.callWord, lang)}</dt>
        <dd className="mono">{side.call}</dd>
        <dt>{t(bench.resultWord, lang)}</dt>
        <dd>{t(side.result, lang)}</dd>
        <dt>{t(bench.answerWord, lang)}</dt>
        <dd className="tl-answer">{t(side.answer, lang)}</dd>
      </dl>

      <p className="tl-verdict">{t(side.verdict, lang)}</p>
    </div>
  );
}
