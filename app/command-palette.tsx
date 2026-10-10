"use client";

// Global command palette (ported from SYSDesigner). Open with ⌘K / Ctrl+K
// (or the toolbar trigger). Type to filter every stop in both languages,
// ↑/↓ to move, Enter to navigate, Esc / overlay click to close. Rendered in a portal.
//
// The prose index is the whole course in both languages, so it is loaded the
// first time the palette opens rather than with the page: the palette sits in
// the root layout, and a static import put every stop's text into every page's
// first load. Focus stays inside the dialog while it is open and goes back to
// where it came from when it closes.

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ui, useLang, t, type L, type Lang } from "@/lib/i18n";
import { useShell } from "./theme-provider";
import { STOPS, VIEWS } from "@/lib/stops";
import type { Hit } from "@/lib/search";

type SearchModule = typeof import("@/lib/search");
let searchModule: Promise<SearchModule> | null = null;
const loadSearch = () => (searchModule ??= import("@/lib/search"));

// A query written in Chinese is looked up in the Chinese text whatever the
// interface language is; anything else is looked up in the current language.
const HAN = /[\u3400-\u9fff]/;

type Dest = { href: string; label: L };

const DESTINATIONS: Dest[] = STOPS.map((s) => ({ href: s.href, label: s.label }));

export default function CommandPalette() {
  const router = useRouter();
  const { lang } = useLang();
  const { cmdkOpen, setCmdkOpen } = useShell();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [engine, setEngine] = useState<SearchModule | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // Where focus was before the palette opened, so closing can put it back.
  const returnTo = useRef<HTMLElement | null>(null);

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

  // Reset + focus when opened; load the index; give focus back when closed.
  useEffect(() => {
    if (!cmdkOpen) return;
    setQuery("");
    setActive(0);
    const before = document.activeElement;
    returnTo.current = before instanceof HTMLElement && before !== document.body ? before : null;
    let alive = true;
    loadSearch().then((m) => {
      if (alive) setEngine(m);
    });
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      alive = false;
      cancelAnimationFrame(id);
      const back = returnTo.current;
      if (back && back.isConnected) back.focus({ preventScroll: true });
    };
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

  const searchLang: Lang = HAN.test(query) ? "zh" : lang;
  const proseHits = useMemo<Hit[]>(
    () => (engine && query.trim().length >= 2 ? engine.search(query, searchLang) : []),
    [engine, query, searchLang],
  );

  // 两组结果拼成一个可以上下走的列表。
  const results = useMemo(
    () => [
      ...stopHits.map((d) => ({ kind: "stop" as const, href: d.href, label: d.label })),
      // Section anchors exist on the one-page view only: a stop renders one step,
      // one blank or one scene at a time, so most of its sections have no element
      // to land on there.
      ...proseHits.map((h) => ({ kind: "prose" as const, href: `/all#${h.anchor}`, hit: h })),
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
    } else if (e.key === "Tab") {
      // The field is the only stop in the dialog; Tab must not walk out of it
      // into the page behind the overlay.
      e.preventDefault();
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
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={results.length > 0}
          aria-controls="cmdk-list"
          aria-activedescendant={results.length > 0 ? `cmdk-opt-${active}` : undefined}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => {
            setQuery(e.target.value);
            // A new query is a new list; the highlight starts again at its top.
            setActive(0);
          }}
          onKeyDown={onInputKey}
        />

        {results.length === 0 ? (
          <div className="cmdk-empty">{t(ui.cmdk.empty, lang)}</div>
        ) : (
          <ul
            className="cmdk-list"
            id="cmdk-list"
            role="listbox"
            aria-label={t(ui.cmdk.placeholder, lang)}
            tabIndex={-1}
            ref={listRef}
          >
            {results.map((r, i) => {
              const firstProse =
                r.kind === "prose" && results.findIndex((x) => x.kind === "prose") === i;
              const firstStop =
                r.kind === "stop" && i === 0 && proseHits.length > 0;
              return (
                <li
                  key={`${r.kind}-${r.href}-${i}`}
                  id={`cmdk-opt-${i}`}
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
                        {t(r.hit.heading, searchLang)}
                        <span className="cmdk-where">{t(r.hit.stop, searchLang)}</span>
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
