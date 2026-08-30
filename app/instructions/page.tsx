"use client";

import { useState } from "react";
import { bench, blocks, meta, setups, systemBill, task } from "@/lib/instructions";
import { money } from "@/lib/cost";
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

export default function InstructionsStop() {
  const { lang } = useLang();
  const [id, setId] = useState(setups[0].id);
  const setup = setups.find((s) => s.id === id) ?? setups[0];
  const bill = systemBill(40);

  return (
    <main className="page">
      <LessonHeader meta={meta} lang={lang} />
      <SimulatedNote lang={lang} />

      <Workbench title={bench.title} note={bench.note} lang={lang}>
        <p className="lsn-note">
          <b>{t(bench.taskWord, lang)}:</b> {t(task, lang)}
        </p>

        <Choices
          options={setups.map((s) => ({ id: s.id, label: s.name, hint: s.hint }))}
          value={id}
          onChange={setId}
          lang={lang}
          label={bench.chooseLabel}
        />

        <div className="in-setup">
          <div className="in-field">
            <span className="iv-k">{t(bench.systemWord, lang)}</span>
            <p className="in-system">{t(setup.system, lang)}</p>
          </div>
          <div className="in-field">
            <span className="iv-k">{t(bench.toolsWord, lang)}</span>
            <p className="in-tools mono">
              {["read_file", "run_command", "send_email"].map((name) => {
                const has = setup.tools.includes(name);
                return (
                  <span key={name} className={has ? "in-tool" : "in-tool in-gone"}>
                    {name}
                    {!has && <i> ({t(bench.gone, lang)})</i>}
                  </span>
                );
              })}
            </p>
          </div>
        </div>

        <ol className={`pm-run in-run in-${setup.tone}`}>
          {setup.beats.map((beat, i) => (
            <li key={i} className={`pm-beat${beat.bad ? " pm-bad" : ""}`}>
              <span className="pm-who">{i + 1}</span>
              <span className="pm-body">
                <b>{t(beat.label, lang)}</b>
                {t(beat.body, lang)}
              </span>
            </li>
          ))}
        </ol>

        <div className={`lsn-col ${setup.tone === "ok" ? "lsn-col-good" : setup.tone === "bad" ? "lsn-col-bad" : ""}`}>
          <div className="lsn-col-h">{t(bench.verdictWord, lang)}</div>
          <p className="lsn-note">{t(setup.verdict, lang)}</p>
        </div>
      </Workbench>

      <Prose block={blocks[0]} lang={lang} />

      <Workbench title={bench.billTitle} lang={lang}>
        <div className="lsn-readout">
          <div className="lsn-stat">
            <span className="lsn-stat-k">{t(bench.billTokens, lang)}</span>
            <span className="lsn-stat-v">{bill.tokens.toLocaleString()}</span>
            <span className="lsn-stat-sub">tokens</span>
          </div>
          <div className="lsn-stat">
            <span className="lsn-stat-k">{t(bench.billSent, lang)}</span>
            <span className="lsn-stat-v">
              {bill.sentTimes} {t(bench.billTimes, lang)}
            </span>
          </div>
          <div className="lsn-stat lsn-stat-bad">
            <span className="lsn-stat-k">{t(bench.billCost, lang)}</span>
            <span className="lsn-stat-v">{money(bill.dollars)}</span>
          </div>
        </div>
      </Workbench>

      <Prose block={blocks[1]} lang={lang} />
      <Prose block={blocks[2]} lang={lang} />

      <Takeaway text={meta.takeaway} lang={lang} />
      <StopNav lang={lang} />
    </main>
  );
}
