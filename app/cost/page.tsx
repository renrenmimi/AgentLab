"use client";

import { useMemo, useState } from "react";
import {
  ASSUMPTIONS,
  MAX_ROUNDS,
  blocks,
  bench,
  linearReference,
  meta,
  money,
  promptTokens,
  runCost,
} from "@/lib/cost";
import { useLang, t } from "@/lib/i18n";
import {
  LessonHeader,
  Prose,
  SimulatedNote,
  StopNav,
  Takeaway,
  Workbench,
} from "@/app/lesson";

export default function CostStop() {
  const { lang } = useLang();
  const [rounds, setRounds] = useState(12);
  const [cached, setCached] = useState(false);
  const [doc, setDoc] = useState(false);

  const extra = doc ? 20000 : 0;

  const series = useMemo(() => {
    const plain = runCost(ASSUMPTIONS, rounds, { cached: false, extra });
    const cache = runCost(ASSUMPTIONS, rounds, { cached: true, extra });
    const linear = linearReference(ASSUMPTIONS, rounds, extra);
    // Y 轴按 40 轮的最坏情况固定住，这样拖滑块时曲线是长出来的，
    // 而不是被重新缩放——不然「越来越陡」这件事会被自动缩放抹掉。
    const ceiling = runCost(ASSUMPTIONS, MAX_ROUNDS, { cached: false, extra }).total;
    return { plain, cache, linear, ceiling };
  }, [rounds, extra]);

  const shown = cached ? series.cache : series.plain;
  const last = shown.perRound[shown.perRound.length - 1] ?? 0;
  const first = shown.perRound[0] ?? 0;
  const ratio = first > 0 ? last / first : 0;

  return (
    <main className="page">
      <LessonHeader meta={meta} lang={lang} />
      <SimulatedNote lang={lang} />

      <Prose block={blocks[0]} lang={lang} />

      <Workbench title={bench.title} note={bench.note} lang={lang}>
        <div className="lsn-slider">
          <label htmlFor="rounds">{t(bench.rounds, lang)}</label>
          <input
            id="rounds"
            type="range"
            min={1}
            max={MAX_ROUNDS}
            value={rounds}
            onChange={(e) => setRounds(Number(e.target.value))}
          />
          <span className="lsn-slider-v">{rounds}</span>
        </div>

        <div className="lsn-switches">
          <label className="lsn-switch">
            <input
              type="checkbox"
              checked={cached}
              onChange={(e) => setCached(e.target.checked)}
            />
            <span>{t(bench.cacheOn, lang)}</span>
          </label>
          <label className="lsn-switch">
            <input
              type="checkbox"
              checked={doc}
              onChange={(e) => setDoc(e.target.checked)}
            />
            <span>{t(bench.docOn, lang)}</span>
          </label>
        </div>

        <CostChart
          rounds={rounds}
          plain={series.plain.cumulative}
          cache={series.cache.cumulative}
          linear={series.linear}
          ceiling={series.ceiling}
          showCache={cached}
          lang={lang}
        />

        <div className="lsn-readout">
          <div className="lsn-stat">
            <span className="lsn-stat-k">{t(bench.statTotal, lang)}</span>
            <span className="lsn-stat-v">{money(shown.total)}</span>
            <span className="lsn-stat-sub">
              {rounds} {t(bench.axisRounds, lang)}
            </span>
          </div>
          <div className="lsn-stat">
            <span className="lsn-stat-k">{t(bench.statFirstRound, lang)}</span>
            <span className="lsn-stat-v">{money(first)}</span>
            <span className="lsn-stat-sub">
              {promptTokens(ASSUMPTIONS, 1, extra).toLocaleString()} tokens
            </span>
          </div>
          <div className={`lsn-stat${ratio >= 4 ? " lsn-stat-bad" : ""}`}>
            <span className="lsn-stat-k">{t(bench.statLast, lang)}</span>
            <span className="lsn-stat-v">{money(last)}</span>
            <span className="lsn-stat-sub">
              {promptTokens(ASSUMPTIONS, rounds, extra).toLocaleString()} tokens
            </span>
          </div>
          <div className={`lsn-stat${ratio >= 4 ? " lsn-stat-bad" : ""}`}>
            <span className="lsn-stat-k">{t(bench.statRatio, lang)}</span>
            <span className="lsn-stat-v">{ratio.toFixed(1)}×</span>
          </div>
          <div className="lsn-stat">
            <span className="lsn-stat-k">{t(bench.statTokens, lang)}</span>
            <span className="lsn-stat-v">
              {Math.round(shown.inputTokens / 1000).toLocaleString()}k
            </span>
          </div>
        </div>

        <p className="lsn-note">{t(bench.assumptions, lang)}</p>
      </Workbench>

      <Prose block={blocks[1]} lang={lang} />
      <Prose block={blocks[2]} lang={lang} />

      <Takeaway text={meta.takeaway} lang={lang} />
      <StopNav lang={lang} />
    </main>
  );
}

// 累计花费曲线。三条线：不用缓存、用缓存、以及一条「每轮都跟第 1 轮一样贵」
// 的直线参照——二次增长偏离直线这件事，画出来比说出来清楚。
function CostChart({
  rounds,
  plain,
  cache,
  linear,
  ceiling,
  showCache,
  lang,
}: {
  rounds: number;
  plain: number[];
  cache: number[];
  linear: number[];
  ceiling: number;
  showCache: boolean;
  lang: ReturnType<typeof useLang>["lang"];
}) {
  const W = 640;
  const H = 260;
  const PAD = { l: 52, r: 14, t: 14, b: 30 };
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;

  const x = (i: number) => PAD.l + (i / (MAX_ROUNDS - 1)) * iw;
  const y = (v: number) => PAD.t + ih - (v / ceiling) * ih;

  const path = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * ceiling);

  return (
    <figure className="chart">
      <figcaption className="chart-cap">
        {t(bench.chartTitle, lang)}
        <span className="chart-key">
          <i className="k-plain" /> {t(bench.seriesPlain, lang)}
          {showCache && (
            <>
              <i className="k-cache" /> {t(bench.seriesCached, lang)}
            </>
          )}
          <i className="k-linear" /> {t(bench.seriesLinear, lang)}
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="chart-svg"
        role="img"
        aria-label={`${t(bench.chartTitle, lang)}. ${t(bench.chartAlt, lang)} ${t(
          bench.chartSays,
          lang,
        )}${showCache ? " " + t(bench.chartCached, lang) : ""} ${rounds} ${t(
          bench.axisRounds,
          lang,
        )}: ${money((showCache ? cache : plain)[rounds - 1] ?? 0)}.`}
      >
        {ticks.map((v, i) => (
          <g key={i}>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={y(v)}
              y2={y(v)}
              className="chart-grid"
            />
            <text x={PAD.l - 8} y={y(v) + 3.5} className="chart-tick" textAnchor="end">
              {money(v)}
            </text>
          </g>
        ))}
        {[1, 10, 20, 30, 40].map((r) => (
          <text key={r} x={x(r - 1)} y={H - 10} className="chart-tick" textAnchor="middle">
            {r}
          </text>
        ))}

        <path d={path(linear)} className="chart-line chart-linear" />
        <path d={path(plain)} className="chart-line chart-plain" />
        {showCache && <path d={path(cache)} className="chart-line chart-cache" />}

        <circle
          cx={x(rounds - 1)}
          cy={y((showCache ? cache : plain)[rounds - 1] ?? 0)}
          r={4.5}
          className="chart-dot"
        />
      </svg>
      <p className="chart-conclusion">
        {t(bench.chartSays, lang)}
        {showCache ? " " + t(bench.chartCached, lang) : ""}
      </p>
    </figure>
  );
}
