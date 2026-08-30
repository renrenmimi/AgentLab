"use client";

// 第 4 站往后各站共用的版面零件。三站以前的页面各自有很强的互动结构，
// 后面这几站的骨架是一样的：标题 → 若干段讲解 → 一块动手区 → 一句结论，
// 所以抽出来共用，省得每一页重写一遍外壳，也保证它们看起来是一套东西。

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { ui, useLang, t, type L, type Lang } from "@/lib/i18n";
import { STOPS } from "@/lib/stops";
import { RichText } from "@/lib/glossary";
import type { Block, LessonMeta } from "@/lib/lesson";

export function LessonHeader({ meta, lang }: { meta: LessonMeta; lang: Lang }) {
  return (
    <header className="header">
      <div>
        <h1 className="page-title">{t(meta.title, lang)}</h1>
        <p className="subtitle">{t(meta.subtitle, lang)}</p>
      </div>
    </header>
  );
}

// 一段讲解。正文按段落排，段落里的 [[术语]] 照常可以点开。
export function Prose({ block, lang }: { block: Block; lang: Lang }) {
  return (
    <section className="lsn-block">
      <h2 className="lsn-h">{t(block.title, lang)}</h2>
      {block.paras.map((p, i) => (
        <p key={i} className="lsn-p">
          <RichText text={t(p, lang)} lang={lang} />
        </p>
      ))}
      {block.faq && (
        <details className="faq">
          <summary>
            {t(ui.loop.faqLabel, lang)}
            {t(ui.loop.faqSep, lang)}
            {t(block.faq.q, lang)}
          </summary>
          <p>
            <RichText text={t(block.faq.a, lang)} lang={lang} />
          </p>
        </details>
      )}
    </section>
  );
}

// 动手区的外壳：一块面板，左上角有标题，右上角可放说明。
export function Workbench({
  title,
  note,
  lang,
  children,
}: {
  title: L;
  note?: L;
  lang: Lang;
  children: ReactNode;
}) {
  return (
    <section className="panel lsn-bench" aria-label={t(title, lang)}>
      <div className="panel-title">
        <span className="tdot tdot-chat" />
        {t(title, lang)}
        {note && <span className="len">{t(note, lang)}</span>}
      </div>
      <div className="lsn-bench-body">{children}</div>
    </section>
  );
}

// 这些页面上的模型行为都是写好的，不是现场调用。说在明处。
export function SimulatedNote({ lang }: { lang: Lang }) {
  return <p className="lsn-sim">{t(ui.lesson.simulatedNote, lang)}</p>;
}

export function Takeaway({ text, lang }: { text: L; lang: Lang }) {
  return (
    <section className="lsn-take">
      <div className="lsn-take-tag">{t(ui.lesson.takeaway, lang)}</div>
      <p>
        <RichText text={t(text, lang)} lang={lang} />
      </p>
    </section>
  );
}

// 上一站 / 下一站，顺序直接取自 lib/stops.ts，不用每页各写一份。
export function StopNav({ lang }: { lang: Lang }) {
  const path = usePathname();
  const i = STOPS.findIndex((s) => s.href === path);
  if (i === -1) return null;
  const prev = i > 0 ? STOPS[i - 1] : null;
  const next = i < STOPS.length - 1 ? STOPS[i + 1] : null;
  return (
    <nav className="lsn-nav" aria-label={t(ui.a11y.stops, lang)}>
      {prev ? (
        <Link className="btn" href={prev.href}>
          ← {t(prev.label, lang)}
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link className="btn btn-primary" href={next.href}>
          {t(next.label, lang)} →
        </Link>
      )}
    </nav>
  );
}

// 一组互斥的选项，键盘可达，选中态除了颜色还有文字标记。
export function Choices<T extends string>({
  options,
  value,
  onChange,
  lang,
  label,
}: {
  options: { id: T; label: L; hint?: L }[];
  value: T;
  onChange: (id: T) => void;
  lang: Lang;
  label: L;
}) {
  return (
    <div className="lsn-choices" role="group" aria-label={t(label, lang)}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className={`lsn-choice${o.id === value ? " on" : ""}`}
          aria-pressed={o.id === value}
          onClick={() => onChange(o.id)}
        >
          <span className="lsn-choice-name">{t(o.label, lang)}</span>
          {o.hint && <span className="lsn-choice-hint">{t(o.hint, lang)}</span>}
        </button>
      ))}
    </div>
  );
}
