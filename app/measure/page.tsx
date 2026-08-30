"use client";

import { useState } from "react";
import {
  bench,
  blocks,
  broke,
  fixed,
  meta,
  score,
  tasks,
  versions,
  type Version,
} from "@/lib/measure";
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

export default function MeasureStop() {
  const { lang } = useLang();
  const [v, setV] = useState<Version>("v1");

  const passing = score(v);
  const delta = passing - score("v1");
  const isV2 = v === "v2";

  return (
    <main className="page">
      <LessonHeader meta={meta} lang={lang} />
      <SimulatedNote lang={lang} />

      <Prose block={blocks[0]} lang={lang} />
      <Prose block={blocks[1]} lang={lang} />

      <Workbench title={bench.title} note={bench.note} lang={lang}>
        <Choices
          options={[
            { id: "v1" as const, label: versions.v1.name },
            { id: "v2" as const, label: versions.v2.name },
          ]}
          value={v}
          onChange={setV}
          lang={lang}
          label={bench.chooseLabel}
        />

        <div className="ms-prompt">
          <span className="dl-k">{t(bench.promptWord, lang)}</span>
          <p>{t(versions[v].prompt, lang)}</p>
        </div>

        <div className="lsn-readout">
          <div className={`lsn-stat${passing >= 6 ? " lsn-stat-good" : ""}`}>
            <span className="lsn-stat-k">{t(bench.scoreWord, lang)}</span>
            <span className="lsn-stat-v">{passing} / 10</span>
          </div>
          {isV2 && (
            <>
              <div className="lsn-stat lsn-stat-good">
                <span className="lsn-stat-k">{t(bench.fixedWord, lang)}</span>
                <span className="lsn-stat-v">+{fixed().length}</span>
                <span className="lsn-stat-sub">
                  #{fixed().map((x) => x.id).join(", #")}
                </span>
              </div>
              <div className="lsn-stat lsn-stat-bad">
                <span className="lsn-stat-k">{t(bench.brokeWord, lang)}</span>
                <span className="lsn-stat-v">−{broke().length}</span>
                <span className="lsn-stat-sub">
                  #{broke().map((x) => x.id).join(", #")}
                </span>
              </div>
              <div className="lsn-stat">
                <span className="lsn-stat-k">{t(bench.deltaWord, lang)}</span>
                <span className="lsn-stat-v">
                  {delta >= 0 ? "+" : ""}
                  {delta}
                </span>
              </div>
            </>
          )}
        </div>

        <table className="lsn-table">
          <thead>
            <tr>
              <th className="num">#</th>
              <th>{t(bench.taskCol, lang)}</th>
              <th>{t(bench.checkCol, lang)}</th>
              <th>{t(bench.resultCol, lang)}</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const ok = v === "v1" ? task.v1 : task.v2;
              const flip = isV2 && task.v1 !== task.v2;
              return (
                <tr key={task.id}>
                  <td className="num">{task.id}</td>
                  <td>
                    {t(task.task, lang)}
                    {flip && task.why && (
                      <span className="ms-why">
                        <b>{t(bench.whyWord, lang)}:</b> {t(task.why, lang)}
                      </span>
                    )}
                  </td>
                  <td className="ms-check">{t(task.check, lang)}</td>
                  <td>
                    <span className={ok ? "mark-pass" : "mark-fail"}>
                      {ok ? "✓ " : "✕ "}
                      {t(ok ? bench.pass : bench.fail, lang)}
                    </span>
                    {flip && (
                      <span className={`ms-flip ${task.v2 ? "mark-pass" : "mark-fail"}`}>
                        {t(task.v2 ? bench.fixedTag : bench.brokeTag, lang)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Workbench>

      <Prose block={blocks[2]} lang={lang} />

      <Takeaway text={meta.takeaway} lang={lang} />


      <StopNav lang={lang} />
    </main>
  );
}
