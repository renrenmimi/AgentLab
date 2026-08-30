"use client";

// ?selftest=1 — the assertions a screenshot cannot make.
//
// verify.mjs checks the content; it cannot see behaviour. Everything
// interesting about this site is behavioural: that the scenario picker is a
// real tablist, that stepping through a run and stepping back leaves the panels
// where stateAt() says they should be, that dragging the cost slider changes
// numbers which still satisfy the arithmetic, that a wrong answer at stop 3
// produces its own correction, and that all of it is reachable by keyboard and
// legible in both themes.
//
// Nothing here runs without the flag, and nothing is put on window except the
// report itself.

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

let armed = false;

export default function SelfTest() {
  const router = useRouter();
  const path = usePathname();

  // The suite navigates between stops and has to know when it has arrived.
  // The flag is only in the URL of the first page: router.push drops the query,
  // so arm once on mount and keep writing the attribute after that. Nothing is
  // written during an ordinary visit.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).has("selftest")) armed = true;
    if (armed) document.body.dataset.stop = path;
  }, [path]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!new URLSearchParams(window.location.search).has("selftest")) return;
    let cancelled = false;
    const id = window.setTimeout(async () => {
      // Loaded on demand so the suite is not in the bundle of an ordinary visit.
      const { runSelfTest } = await import("./selftest-suite");
      if (!cancelled) await runSelfTest((href) => router.push(href));
    }, 500);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
    // Deliberately once: the suite drives navigation itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
