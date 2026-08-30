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
import { STOPS } from "@/lib/stops";

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

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DESTINATIONS;
    return DESTINATIONS.filter((d) =>
      [d.href, d.label.zh, d.label.en].join(" ").toLowerCase().includes(q),
    );
  }, [query]);

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
            {results.map((d, i) => (
              <li
                key={d.href}
                role="option"
                aria-selected={i === active}
                className={`cmdk-item${i === active ? " active" : ""}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(d.href)}
              >
                <span className="cmdk-item-title">{t(d.label, lang)}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="cmdk-hint">{t(ui.cmdk.navHint, lang)}</div>
      </div>
    </div>,
    document.body,
  );
}
