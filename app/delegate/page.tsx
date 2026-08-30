"use client";

import { useState } from "react";
import { bench, blocks, ledger, meta, summary } from "@/lib/delegate";
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

export default function DelegateStop() {
  const { lang } = useLang();
  const [view, setView] = useState<"parent" | "actual">("parent");
  const showAll = view === "actual";

  return (
    <main className="page">
      <LessonHeader meta={meta} lang={lang} />
      <SimulatedNote lang={lang} />

      <Prose block={blocks[0]} lang={lang} />

      <Workbench title={bench.title} note={bench.note} lang={lang}>
        <div className="dl-msgs">
          <div className="dl-msg">
            <span className="dl-k">{t(bench.askWord, lang)}</span>
            <p>{t(summary.ask, lang)}</p>
          </div>
          <div className="dl-msg">
            <span className="dl-k">{t(bench.gotWord, lang)}</span>
            <p>{t(summary.got, lang)}</p>
          </div>
        </div>

        <Choices
          options={[
            { id: "parent" as const, label: bench.parent, hint: bench.parentHint },
            { id: "actual" as const, label: bench.actual, hint: bench.actualHint },
          ]}
          value={view}
          onChange={setView}
          lang={lang}
          label={bench.viewLabel}
        />

        <table className="lsn-table">
          <thead>
            <tr>
              <th />
              <th>{t(bench.colParent, lang)}</th>
              {showAll && <th>{t(bench.colActual, lang)}</th>}
            </tr>
          </thead>
          <tbody>
            {ledger.map((row, i) => (
              <tr key={i}>
                <td>{t(row.label, lang)}</td>
                <td className={row.parentBad && showAll ? "mark-fail" : undefined}>
                  {t(row.parent, lang)}
                </td>
                {showAll && <td className="num">{t(row.actual, lang)}</td>}
              </tr>
            ))}
          </tbody>
        </table>

        {showAll && (
          <div className="lsn-col lsn-col-bad">
            <div className="lsn-col-h">✕ {t(bench.missedWord, lang)}</div>
            <p className="lsn-note">{t(summary.missed, lang)}</p>
          </div>
        )}
      </Workbench>

      <Prose block={blocks[1]} lang={lang} />

      <Takeaway text={meta.takeaway} lang={lang} />
      <StopNav lang={lang} />
    </main>
  );
}
