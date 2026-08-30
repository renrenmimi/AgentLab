"use client";

import { useMemo, useState } from "react";
import {
  LIMIT,
  apply,
  bench,
  blocks,
  conversation,
  meta,
  totalTokens,
  type Msg,
  type Strategy,
} from "@/lib/context";
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

export default function ContextStop() {
  const { lang } = useLang();
  const [strategy, setStrategy] = useState<Strategy>("truncate");

  const before = totalTokens(conversation);
  const outcome = useMemo(() => apply(strategy, conversation, LIMIT), [strategy]);

  const options = [
    { id: "refuse" as const, label: bench.options.refuse, hint: bench.options.refuseHint },
    { id: "truncate" as const, label: bench.options.truncate, hint: bench.options.truncateHint },
    { id: "summarise" as const, label: bench.options.summarise, hint: bench.options.summariseHint },
  ];

  return (
    <main className="page">
      <LessonHeader meta={meta} lang={lang} />
      <SimulatedNote lang={lang} />

      <Prose block={blocks[0]} lang={lang} />

      <Workbench title={bench.title} note={bench.note} lang={lang}>
        <Choices
          options={options}
          value={strategy}
          onChange={setStrategy}
          lang={lang}
          label={bench.chooseLabel}
        />

        <div className="lsn-two">
          <div className="lsn-col lsn-col-bad">
            <div className="lsn-col-h">
              {t(bench.before, lang)}
              <span className="ctx-sum">
                {before.toLocaleString()} / {LIMIT.toLocaleString()} ·{" "}
                {t(bench.overBy, lang)} {(before - LIMIT).toLocaleString()}
              </span>
            </div>
            <ul className="ctx-list">
              {conversation.map((m) => (
                <MsgRow
                  key={m.id}
                  m={m}
                  lang={lang}
                  state={outcome.dropped.some((d) => d.id === m.id) ? "drop" : "keep"}
                />
              ))}
            </ul>
          </div>

          <div className={`lsn-col${outcome.fits && outcome.kept.length ? " lsn-col-good" : ""}`}>
            <div className="lsn-col-h">
              {t(bench.after, lang)}
              <span className="ctx-sum">
                {outcome.total.toLocaleString()} / {LIMIT.toLocaleString()}
                {outcome.kept.length > 0 && ` · ${t(bench.fitsNow, lang)}`}
              </span>
            </div>
            {strategy === "refuse" ? (
              <p className="lsn-note">{t(bench.refuseNote, lang)}</p>
            ) : (
              <ul className="ctx-list">
                {outcome.synthetic && (
                  <li className="ctx-row ctx-new">
                    <span className="ctx-role">{t(bench.options.summarise, lang)}</span>
                    <span className="ctx-body">
                      <b>{t(outcome.synthetic.label, lang)}</b>
                      {t(outcome.synthetic.detail, lang)}
                    </span>
                    <span className="ctx-tok num">{outcome.synthetic.tokens}</span>
                  </li>
                )}
                {outcome.kept.map((m) => (
                  <MsgRow key={m.id} m={m} lang={lang} state="keep" />
                ))}
              </ul>
            )}
            {strategy === "summarise" && (
              <p className="lsn-note">{t(bench.summaryNote, lang)}</p>
            )}
            {outcome.lostTask && strategy === "truncate" && (
              <p className="ctx-warn">{t(bench.lostTaskWarn, lang)}</p>
            )}
          </div>
        </div>
      </Workbench>

      <Prose block={blocks[1]} lang={lang} />

      <Takeaway text={meta.takeaway} lang={lang} />
      <StopNav lang={lang} />
    </main>
  );
}

function MsgRow({
  m,
  lang,
  state,
}: {
  m: Msg;
  lang: Lang;
  state: "keep" | "drop";
}) {
  return (
    <li className={`ctx-row${state === "drop" ? " ctx-dropped" : ""}`}>
      <span className="ctx-role">{m.role}</span>
      <span className="ctx-body">
        <b>
          {t(m.label, lang)}
          {m.isTask && <span className="ctx-task-tag">task</span>}
        </b>
        {t(m.detail, lang)}
      </span>
      <span className="ctx-tok num">{m.tokens}</span>
    </li>
  );
}
