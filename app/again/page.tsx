"use client";

import { useState } from "react";
import {
  MAX_ATTEMPTS,
  backoffMs,
  bench,
  blocks,
  failures,
  meta,
  tools,
  totalWaitMs,
} from "@/lib/again";
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

const ms = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}s` : `${n}ms`);

export default function AgainStop() {
  const { lang } = useLang();
  const [id, setId] = useState(failures[0].id);
  const failure = failures.find((f) => f.id === id) ?? failures[0];

  return (
    <main className="page">
      <LessonHeader meta={meta} lang={lang} />
      <SimulatedNote lang={lang} />

      <Workbench title={bench.title} note={bench.note} lang={lang}>
        <Choices
          options={failures.map((f) => ({ id: f.id, label: f.name }))}
          value={id}
          onChange={setId}
          lang={lang}
          label={bench.chooseLabel}
        />

        <div className={`ag-card ag-${failure.tone}`}>
          <div className="ag-row">
            <span className="iv-k">{t(bench.sawWord, lang)}</span>
            <p>{t(failure.saw, lang)}</p>
          </div>
          <div className="ag-row ag-key">
            <span className="iv-k">
              {t(bench.knowsWord, lang)}
              <b className={failure.certain ? "mark-pass" : "mark-fail"}>
                {failure.certain ? "✓ " : "✕ "}
                {t(failure.certain ? bench.certainYes : bench.certainNo, lang)}
              </b>
            </span>
            <p>{t(failure.knows, lang)}</p>
          </div>
          <div className="ag-row">
            <span className="iv-k">{t(bench.retryWord, lang)}</span>
            <p>{t(failure.safeToRetry, lang)}</p>
          </div>
        </div>
      </Workbench>

      <Prose block={blocks[0]} lang={lang} />

      <Workbench title={bench.backoffTitle} lang={lang}>
        <table className="lsn-table">
          <thead>
            <tr>
              <th className="num">{t(bench.attemptCol, lang)}</th>
              <th className="num">{t(bench.waitCol, lang)}</th>
              <th className="num">{t(bench.totalWord, lang)}</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: MAX_ATTEMPTS - 1 }, (_, i) => i + 1).map((n) => (
              <tr key={n}>
                <td className="num">{n}</td>
                <td className="num">{ms(backoffMs(n))}</td>
                <td className="num">{ms(totalWaitMs(n + 1))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Workbench>

      <Prose block={blocks[1]} lang={lang} />

      <Workbench title={bench.toolsTitle} lang={lang}>
        <table className="lsn-table">
          <thead>
            <tr>
              <th>{t(bench.toolCol, lang)}</th>
              <th>{t(bench.twiceCol, lang)}</th>
            </tr>
          </thead>
          <tbody>
            {tools.map((tool) => (
              <tr key={tool.name}>
                <td>
                  <span className="mono ag-tool">{tool.name}</span>
                  <span className="ag-what">{t(tool.what, lang)}</span>
                  <span className={tool.idempotent ? "mark-pass" : "mark-fail"}>
                    {tool.idempotent ? "✓ " : "✕ "}
                    {t(tool.idempotent ? bench.safeWord : bench.unsafeWord, lang)}
                  </span>
                </td>
                <td>
                  {t(tool.twice, lang)}
                  {tool.fix && (
                    <span className="ag-fix">
                      <b>{t(bench.fixWord, lang)}: </b>
                      {t(tool.fix, lang)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Workbench>

      <Prose block={blocks[2]} lang={lang} />

      <Takeaway text={meta.takeaway} lang={lang} />
      <StopNav lang={lang} />
    </main>
  );
}
