"use client";

// 不存在的地址。Next 自带的那一页只有英文，也没有 <main>；
// 这一页用课程自己的版面，两种语言都写，并指回两个最可能要去的地方。

import Link from "next/link";
import { ui, useLang, t, type L } from "@/lib/i18n";

const COPY: Record<"title" | "body", L> = {
  title: { zh: "没有这一页", en: "There is no page here" },
  body: {
    zh: "这个地址不在课程里。可能是链接写错了，也可能是这一页改过名字。",
    en: "This address is not part of the course. The link may be mistyped, or the page may have been renamed.",
  },
};

export default function NotFound() {
  const { lang } = useLang();
  return (
    <main className="page">
      <header className="header">
        <div>
          <h1 className="page-title">{t(COPY.title, lang)}</h1>
          <p className="subtitle">{t(COPY.body, lang)}</p>
        </div>
      </header>
      <nav className="lsn-nav" aria-label={t(ui.a11y.stops, lang)}>
        <Link className="btn btn-primary" href="/">
          {t(ui.nav.whatIs, lang)} →
        </Link>
        <Link className="btn" href="/all">
          {t(ui.all.link, lang)} →
        </Link>
      </nav>
    </main>
  );
}
