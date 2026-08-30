"use client";

// Global command palette (ported from SYSDesigner). Open with ⌘K / Ctrl+K
// (or the toolbar trigger). Type to filter every stop in both languages,
// ↑/↓ to move, Enter to navigate, Esc / overlay click to close. Rendered in a portal.

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ui, useLang, t, type L } from "@/lib/i18n";
import { useShell } from "./theme-provider";
import { STOPS, VIEWS } from "@/lib/stops";
import { search, type Hit } from "@/lib/search";

type Dest = { href: string; label: L };

const DESTINATIONS: Dest[] = STOPS.map((s) => ({ href: s.href, label: s.label }));

export default function CommandPalette() {
  const router = useRouter();
  const { lang } = useLang();
  const { cmdkOpen, setCmdkOpen } = useShell();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Global ⌘K / Ctrl+K toggle + Esc to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdkOpen((o) => !o);
      } else if (e.key === "Escape") {
        setCmdkOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setCmdkOpen]);

  // Reset + focus when opened.
  useEffect(() => {
    if (!cmdkOpen) return;
    setQuery("");
    setActive(0);
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [cmdkOpen]);

  // 站点名先匹配，再搜正文。索引在第一次搜索时才建，不影响任何一页的加载。
  const stopHits = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = [
      ...DESTINATIONS,
      { href: "/all", label: ui.all.link },
    ].filter((d) => VIEWS.includes(d.href) || STOPS.some((s) => s.href === d.href));
    if (!q) return all;
    return all.filter((d) =>
      [d.href, d.label.zh, d.label.en].join(" ").toLowerCase().includes(q),
    );
  }, [query]);

  const proseHits = useMemo<Hit[]>(
    () => (query.trim().length >= 2 ? search(query, lang) : []),
    [query, lang],
  );

  // 两组结果拼成一个可以上下走的列表。
  const results = useMemo(
    () => [
      ...stopHits.map((d) => ({ kind: "stop" as const, href: d.href, label: d.label })),
      ...proseHits.map((h) => ({ kind: "prose" as const, href: `${h.href}#${h.anchor}`, hit: h })),
    ],
    [stopHits, proseHits],
  );

  // Keep the active index in range as the result set changes.
  useEffect(() => {
    setActive((i) => (i >= results.length ? 0 : i));
  }, [results.length]);

  // Scroll the active row into view.
  useEffect(() => {
    if (!cmdkOpen) return;
    const el = listRef.current?.querySelector<HTMLElement>(".cmdk-item.active");
    el?.scrollIntoView({ block: "nearest" });
  }, [active, cmdkOpen]);

  const go = useCallback(
    (href: string) => {
      setCmdkOpen(false);
      router.push(href);
    },
    [router, setCmdkOpen],
  );

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) =>
        results.length ? (i - 1 + results.length) % results.length : 0,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const dest = results[active];
      if (dest) go(dest.href);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setCmdkOpen(false);
    }
  };

  if (!cmdkOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="cmdk-overlay"
      role="presentation"
      onClick={() => setCmdkOpen(false)}
    >
      <div
        className="cmdk"
        role="dialog"
        aria-modal="true"
        aria-label={t(ui.cmdk.placeholder, lang)}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          className="cmdk-input"
          type="text"
          value={query}
          placeholder={t(ui.cmdk.placeholder, lang)}
          aria-label={t(ui.cmdk.placeholder, lang)}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onInputKey}
        />

        {results.length === 0 ? (
          <div className="cmdk-empty">{t(ui.cmdk.empty, lang)}</div>
        ) : (
          <ul className="cmdk-list" role="listbox" ref={listRef}>
            {results.map((r, i) => {
              const firstProse =
                r.kind === "prose" && results.findIndex((x) => x.kind === "prose") === i;
              const firstStop =
                r.kind === "stop" && i === 0 && proseHits.length > 0;
              return (
                <li
                  key={`${r.kind}-${r.href}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  className={`cmdk-item${i === active ? " active" : ""}${
                    firstProse || firstStop ? " cmdk-first" : ""
                  }`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(r.href)}
                >
                  {(firstStop || firstProse) && (
                    <span className="cmdk-group">
                      {t(firstProse ? ui.cmdk.proseHeading : ui.cmdk.stopsHeading, lang)}
                    </span>
                  )}
                  {r.kind === "stop" ? (
                    <span className="cmdk-item-title">{t(r.label, lang)}</span>
                  ) : (
                    <>
                      <span className="cmdk-item-title">
                        {t(r.hit.heading, lang)}
                        <span className="cmdk-where">{t(r.hit.stop, lang)}</span>
                      </span>
                      <span className="cmdk-snippet">
                        {r.hit.snippet.slice(0, r.hit.at[0])}
                        <mark>{r.hit.snippet.slice(r.hit.at[0], r.hit.at[1])}</mark>
                        {r.hit.snippet.slice(r.hit.at[1])}
                      </span>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="cmdk-hint">
          {t(ui.cmdk.navHint, lang)}
          {query.trim().length < 2 && (
            <span className="cmdk-hint2">{t(ui.cmdk.hint2, lang)}</span>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
