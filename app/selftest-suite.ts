// The assertions themselves. See app/selftest.tsx for why this exists.

import { GROUPS, STOPS, VIEWS } from "@/lib/stops";
import { COURSE } from "@/lib/course";
import { search } from "@/lib/search";
import { scenarios, stateAt } from "@/lib/scenarios";
import { ASSUMPTIONS, MAX_ROUNDS, money, runCost } from "@/lib/cost";
import { blanks, normalize } from "@/lib/build";
import { checks } from "@/lib/checks";
import { t, type Lang } from "@/lib/i18n";

type Result = { ok: boolean; label: string; note?: string };

const frame = () =>
  new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
const settle = async (n = 3) => {
  for (let i = 0; i < n; i++) await frame();
};

const lang = (): Lang =>
  (document.documentElement.dataset.lang === "zh" ? "zh" : "en") as Lang;

const $ = <T extends Element = HTMLElement>(sel: string) =>
  document.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string) =>
  Array.from(document.querySelectorAll<T>(sel));

const text = (el: Element | null | undefined) => (el?.textContent ?? "").trim();

/** React listens for input events, so the value has to go through the setter. */
function setRange(el: HTMLInputElement, value: number) {
  const desc = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(el) as object,
    "value",
  );
  desc?.set?.call(el, String(value));
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function setText(el: HTMLInputElement, value: string) {
  const desc = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(el) as object,
    "value",
  );
  desc?.set?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

const press = (el: Element, key: string) =>
  el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));

// ---------------------------------------------------------------- colour

type RGBA = [number, number, number, number];

function parseColor(s: string): RGBA | null {
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
  if (p.length < 3 || p.some((n) => Number.isNaN(n))) return null;
  return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
}

/**
 * Computed styles, cached for the length of one measurement pass.
 *
 * Compositing a backdrop and multiplying inherited opacity both walk the same
 * ancestor chain, and a traversal reaches every element rather than one per
 * selector, so the same styles are asked for many times over. The cache is
 * cleared between passes because a theme flip changes every answer.
 */
let styleCache: Map<Element, CSSStyleDeclaration> | null = null;

function style(el: Element, pseudo?: string): CSSStyleDeclaration {
  if (pseudo) return getComputedStyle(el, pseudo);
  if (!styleCache) return getComputedStyle(el);
  const hit = styleCache.get(el);
  if (hit) return hit;
  const fresh = getComputedStyle(el);
  styleCache.set(el, fresh);
  return fresh;
}

const over = (fg: RGBA, bg: RGBA): RGBA => [
  fg[0] * fg[3] + bg[0] * (1 - fg[3]),
  fg[1] * fg[3] + bg[1] * (1 - fg[3]),
  fg[2] * fg[3] + bg[2] * (1 - fg[3]),
  1,
];

/**
 * Every backdrop the glyphs might be sitting on, with the translucent layers
 * between the element and the page composited into each.
 *
 * A gradient has no single background-colour. The previous version took its
 * lightest stop, which is the worst case for light text and the best case for
 * dark text — so a dark label on a gradient was measured against the stop that
 * flattered it. Every stop is returned instead, and the caller takes the worst
 * pairing, which is the number a reader can actually be given.
 */
function backdrops(el: Element, pseudo?: string): RGBA[] {
  const layers: RGBA[] = [];
  let bases: RGBA[] | null = null;

  // Returns true when this element paints something opaque, which ends the walk.
  const absorb = (cs: CSSStyleDeclaration): boolean => {
    // A background clipped to the text is painting the glyphs, not what is
    // behind them, so it is not a backdrop at all.
    const clipped = /text/.test(cs.backgroundClip ?? "") || /text/.test(cs.webkitBackgroundClip ?? "");
    if (!clipped) {
      const stops = gradientStops(cs.backgroundImage);
      if (stops.length) {
        bases = stops.map((c): RGBA => [c[0], c[1], c[2], 1]);
        return true;
      }
    }
    const c = parseColor(cs.backgroundColor);
    if (c && c[3] > 0) {
      if (c[3] === 1) {
        bases = [c];
        return true;
      }
      layers.push(c);
    }
    return false;
  };

  // A pseudo-element paints on top of its own element, so its background comes
  // first; when it has none the walk simply carries on up the tree.
  if (!(pseudo && absorb(style(el, pseudo)))) {
    let node: Element | null = el;
    while (node) {
      if (absorb(style(node))) break;
      node = node.parentElement;
    }
  }

  return (bases ?? [[255, 255, 255, 1] as RGBA]).map((base) => {
    let acc = base;
    for (let i = layers.length - 1; i >= 0; i--) acc = over(layers[i], acc);
    return acc;
  });
}

const channel = (v: number) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};
const luminance = (c: RGBA) =>
  0.2126 * channel(c[0]) + 0.7152 * channel(c[1]) + 0.0722 * channel(c[2]);

function contrast(fg: RGBA, bg: RGBA): number {
  const a = luminance(over(fg, bg));
  const b = luminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Opacity on an ancestor fades the text toward whatever is behind it, so a
 * colour that passes on its own can fail once it is dimmed. Ignoring this is
 * how a contrast checker reports a number the eye disagrees with.
 */
function inheritedOpacity(el: Element): number {
  let alpha = 1;
  let node: Element | null = el;
  while (node) {
    const o = parseFloat(style(node).opacity);
    if (!Number.isNaN(o)) alpha *= o;
    node = node.parentElement;
  }
  return alpha;
}

/**
 * The contrast a reader actually gets: colour, backdrop, and any dimming.
 *
 * Returns null where the requirement does not apply — a disabled control is
 * exempt under WCAG 1.4.3, and an element still animating is being measured
 * mid-transition rather than at rest.
 */
function effectiveContrast(el: Element, pseudo?: string): number | null {
  const fgs = foregrounds(el, pseudo);
  if (!fgs.length) return null;
  const bgs = backdrops(el, pseudo);
  const alpha = inheritedOpacity(el);
  // Neither side is necessarily one colour: the text may be a gradient painted
  // through the glyphs, the backdrop may be a gradient behind them. Every
  // pairing is measured and the worst is the answer, because the worst pairing
  // is a place on the screen where a reader is actually standing.
  let worst = Infinity;
  for (const fg of fgs) {
    const dimmed: RGBA = [fg[0], fg[1], fg[2], fg[3] * alpha];
    for (const bg of bgs) worst = Math.min(worst, contrast(dimmed, bg));
  }
  return Number.isFinite(worst) ? worst : null;
}

/**
 * The colour or colours the glyphs are actually painted in.
 *
 * Usually one: the computed `color`. Two cases are not.
 *
 * SVG text takes its colour from `fill`, which `color` does not report, so the
 * axis labels on the cost chart would be read as whatever `color` happened to
 * inherit. And text painted through its own background — `background-clip: text`
 * with a transparent `color`, which is how the wordmark is drawn — has no single
 * foreground colour at all. Reading `color` there returns rgba(0,0,0,0), which
 * would look like text nobody can see rather than text drawn in a gradient.
 */
function foregrounds(el: Element, pseudo?: string): RGBA[] {
  const cs = style(el, pseudo);

  if (!pseudo && el.namespaceURI === "http://www.w3.org/2000/svg") {
    const fill = parseColor(cs.fill);
    return fill && fill[3] > 0 ? [fill] : [];
  }

  const clipped = /text/.test(cs.backgroundClip ?? "") ||
    /text/.test(cs.webkitBackgroundClip ?? "");
  const own = parseColor(cs.color);
  if (clipped && (!own || own[3] === 0)) {
    const stops = gradientStops(cs.backgroundImage);
    if (stops.length) return stops;
    const solid = parseColor(cs.backgroundColor);
    return solid && solid[3] > 0 ? [solid] : [];
  }

  return own ? [own] : [];
}

/** Every colour named in a resolved background-image, in source order. */
function gradientStops(image: string | null): RGBA[] {
  if (!image || image === "none") return [];
  return [...image.matchAll(/rgba?\([^)]+\)/g)]
    .map((m) => parseColor(m[0]))
    .filter((c): c is RGBA => c !== null && c[3] > 0);
}

/**
 * Every skip a measurement pass is allowed to make.
 *
 * Enumerating them is the point. A traversal that quietly steps over an element
 * loses coverage without turning anything red, which is the same failure the
 * selector list had: measuring less than it claimed and reporting a pass. A
 * reason that is not on this list is itself a failure, so a new one has to be
 * added here deliberately, in a diff somebody reads.
 */
const SKIP_REASONS = [
  "not-rendered",
  "invisible",
  "clipped-to-nothing",
  "fully-transparent",
  "disabled",
  "unreadable-colour",
] as const;
type SkipReason = (typeof SKIP_REASONS)[number];

type Measurement = { id: string; ratio: number; need: number };
type Skip = { id: string; reason: SkipReason };
type Pass = { measured: Measurement[]; skipped: Skip[] };

/** A short, stable name for a surface, for the report rather than for matching. */
function describe(el: Element, pseudo?: string): string {
  const raw = typeof el.className === "string" ? el.className : (el.getAttribute("class") ?? "");
  const classes = raw.trim().split(/\s+/).filter(Boolean).slice(0, 3).map((c) => `.${c}`).join("");
  return `${el.tagName.toLowerCase()}${classes}${pseudo ?? ""}`;
}

const NEVER_PAINTS = /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|TITLE|HEAD|META|LINK)$/;

/** Does this element paint text of its own, rather than inherit it from a child? */
function paintsOwnText(el: Element): boolean {
  if (NEVER_PAINTS.test(el.tagName)) return false;
  for (const node of el.childNodes) {
    if (node.nodeType === 3 && (node.nodeValue ?? "").trim() !== "") return true;
  }
  return false;
}

/** Does this pseudo-element paint a string? url() is an image and counts as none. */
function paintsPseudoText(el: Element, pseudo: string): boolean {
  const content = style(el, pseudo).content;
  if (!content || content === "none" || content === "normal") return false;
  if (content.startsWith("url(")) return false;
  return content.replace(/^["']|["']$/g, "").trim() !== "";
}

/**
 * Measure every text surface on the page as it currently stands.
 *
 * This replaced a hand-written list of sixty selectors. That list reported a
 * perfect score while seventeen of its entries matched no element at all: it was
 * measuring forty-three surfaces and passing sixty, and three published contrast
 * defects sat in the gap. A list does not go red when it goes stale, which is
 * the same disease as a check that has quietly stopped running.
 *
 * Traversal has the mirror failure — skipping an element that is there — so
 * every skip is counted and named, and the caller asserts against both numbers.
 */
function measurePage(): Pass {
  const endless = settleAnimations();
  styleCache = new Map();
  const measured: Measurement[] = [];
  const skipped: Skip[] = [];
  // Kept alongside each measurement so an animated surface can be re-read at
  // other phases without being counted twice.
  const taken: { el: Element; pseudo?: string; m: Measurement }[] = [];

  const consider = (el: Element, pseudo?: string) => {
    const id = describe(el, pseudo);
    const box = el.getClientRects();
    const cs = style(el, pseudo);

    if (box.length === 0 || cs.display === "none") return skipped.push({ id, reason: "not-rendered" });
    if (cs.visibility !== "visible") return skipped.push({ id, reason: "invisible" });

    const rect = (el as HTMLElement).getBoundingClientRect();
    if (rect.width <= 1 || rect.height <= 1) return skipped.push({ id, reason: "clipped-to-nothing" });

    if ((el as HTMLElement).closest?.("[disabled], [aria-disabled='true']") != null) {
      return skipped.push({ id, reason: "disabled" });
    }

    const fgs = foregrounds(el, pseudo);
    if (!fgs.length) return skipped.push({ id, reason: "unreadable-colour" });
    if (inheritedOpacity(el) === 0 || fgs.every((c) => c[3] === 0)) {
      return skipped.push({ id, reason: "fully-transparent" });
    }

    const ratio = effectiveContrast(el, pseudo);
    if (ratio === null) return skipped.push({ id, reason: "unreadable-colour" });
    const m: Measurement = { id, ratio, need: required(el, pseudo) };
    measured.push(m);
    taken.push({ el, pseudo, m });
  };

  const all: Element[] = [document.body, ...document.body.querySelectorAll("*")];
  for (const el of all) {
    if (paintsOwnText(el)) consider(el);
    for (const pseudo of ["::before", "::after"]) {
      if (paintsPseudoText(el, pseudo)) consider(el, pseudo);
    }
  }

  // An endless animation has no resting state, so the surfaces it paints are
  // read again at three more points in its cycle and the worst reading is kept.
  // Only those surfaces are re-read: a shimmer changes one badge, not the page,
  // and re-walking everything three more times would triple a run that already
  // measures ten thousand surfaces.
  if (endless.length) {
    const touched = new Set<Element>();
    for (const a of endless) {
      const target = animationTarget(a);
      if (!target) continue;
      touched.add(target.el);
      for (const kid of target.el.querySelectorAll("*")) touched.add(kid);
    }
    const affected = taken.filter((t) => touched.has(t.el));
    if (affected.length) {
      for (const phase of PHASES) {
        for (const a of endless) {
          const span = Number(a.effect?.getComputedTiming().duration ?? 0);
          if (span > 0) a.currentTime = span * phase;
        }
        styleCache = new Map();
        for (const t of affected) {
          const again = effectiveContrast(t.el, t.pseudo);
          if (again !== null && again < t.m.ratio) t.m.ratio = again;
        }
      }
      for (const a of endless) {
        try {
          a.currentTime = 0;
        } catch {
          /* already detached */
        }
      }
    }
  }

  styleCache = null;
  return { measured, skipped };
}

/**
 * Bring every animation to a state that can be measured, and hand back the ones
 * that have no such state.
 *
 * A finite animation is run to its end, which is the resting appearance. An
 * infinite one cannot be finished — `finish()` throws — and the previous version
 * swallowed that and moved on, which left the animation running while the page
 * was being measured. Anything under a `pulse` or a `shimmer` was therefore read
 * at whatever phase the clock happened to be in: a caret whose opacity cycles
 * between 1 and 0.4 returned a different number on every run, and a failure
 * could appear or vanish without anything changing. They are paused at phase
 * zero here and sampled deliberately by the caller instead.
 */
function settleAnimations(): Animation[] {
  const endless: Animation[] = [];
  for (const a of document.getAnimations()) {
    try {
      a.finish();
    } catch {
      a.pause();
      try {
        a.currentTime = 0;
      } catch {
        /* an animation with no timeline cannot be positioned */
      }
      endless.push(a);
    }
  }
  return endless;
}

/** Where in its cycle an endless animation is measured. Zero is already done. */
const PHASES = [0.25, 0.5, 0.75];

/** The element and pseudo-element an animation paints, if it paints one. */
function animationTarget(a: Animation): { el: Element; pseudo?: string } | null {
  const effect = a.effect as KeyframeEffect | null;
  const el = effect?.target;
  if (!el) return null;
  const pseudo = effect?.pseudoElement ?? undefined;
  return { el, pseudo: pseudo ?? undefined };
}

/** WCAG lets large text pass at 3:1. Everything else needs 4.5:1. */
function required(el: Element, pseudo?: string): number {
  const cs = style(el, pseudo);
  const px = parseFloat(cs.fontSize);
  const weight = Number(cs.fontWeight) || 400;
  const large = px >= 24 || (px >= 18.66 && weight >= 700);
  return large ? 3 : 4.5;
}


// The total this suite reports when every block ran. Declared here so the suite
// can compare it against the assertions that actually executed, and read out of
// this file by verify.mjs so CI notices a change even though CI cannot run the
// suite itself. Changing an assertion means changing this number.
const EXPECTED_ASSERTIONS = 118;

// The share of text-bearing nodes a run has to actually measure.
//
// Enumeration failed by measuring air: sixty selectors, forty-three of which
// matched something. Traversal fails the other way, by stepping over an element
// that is there — text in a collapsed section, a node behind display:none at the
// moment of the walk, a surface that only paints after a transition nobody
// waited for. Neither failure turns anything red on its own, so coverage is a
// number the suite asserts rather than a property it hopes for.
const COVERAGE_FLOOR = 0.88;

/**
 * The smallest number of measurements a whole run may make, by layout.
 *
 * The ratio above cannot catch a traversal that returns fewer nodes than it
 * should, because such a traversal shrinks the numerator and the denominator
 * together and the ratio stays where it was. Only an absolute number notices.
 * These are set about five per cent under observed runs: wide enough that adding
 * a paragraph of prose does not fail the suite, narrow enough to catch a walk
 * that has stopped descending into part of the page.
 */
function measurementFloor(width: number): number {
  if (width >= 1200) return 10200;
  if (width >= 700) return 10100;
  return 10000;
}

// ---------------------------------------------------------------- suite

export async function runSelfTest(nav: (href: string) => void): Promise<void> {
  const results: Result[] = [];
  const ok = (cond: boolean, label: string, note?: string) => {
    results.push({ ok: !!cond, label, note });
  };

  const globalsBefore = new Set(Object.keys(window));

  async function go(href: string) {
    if (document.body.dataset.stop === href) {
      await settle(2);
      return true;
    }
    nav(href);
    for (let i = 0; i < 120; i++) {
      if (document.body.dataset.stop === href) {
        await settle(3);
        return true;
      }
      await frame();
    }
    return false;
  }

  const width = window.innerWidth;

  // ---- every stop -------------------------------------------------------
  // Cheap checks that have to hold everywhere: nothing spilling sideways,
  // every control named and reachable, status never carried by colour alone.
  const overflow: string[] = [];
  const nameless: string[] = [];
  const positiveTab: string[] = [];
  const colourOnly: string[] = [];
  const lowContrast: { id: string; where: string; ratio: number; need: number }[] = [];
  // Traversal reports two numbers, not one. How many surfaces failed is the
  // obvious one; how many were measured at all is the one that went wrong last
  // round, when a list of sixty selectors matched forty-three elements and
  // reported a pass on all sixty.
  let measuredCount = 0;
  const skipTally = new Map<string, number>();
  const measuredIn = new Set<string>();
  const missingStops: string[] = [];

  // One measurement pass, folded into the running totals. `where` names the page
  // and the state it was driven into, so a failure says where to look.
  const sweep = (where: string) => {
    const theme = document.documentElement.dataset.theme ?? "?";
    const pass = measurePage();
    measuredCount += pass.measured.length;
    if (pass.measured.length > 0) measuredIn.add(`${theme}${where}`);
    for (const s of pass.skipped) skipTally.set(s.reason, (skipTally.get(s.reason) ?? 0) + 1);
    for (const m of pass.measured) {
      if (m.ratio < m.need) {
        lowContrast.push({ id: m.id, where: `${theme}${where}`, ratio: m.ratio, need: m.need });
      }
    }
  };

  for (const stop of STOPS) {
    if (!(await go(stop.href))) {
      missingStops.push(stop.href);
      continue;
    }

    const doc = document.documentElement;
    if (doc.scrollWidth > window.innerWidth + 1) {
      overflow.push(`${stop.href} ${doc.scrollWidth}px > ${window.innerWidth}px`);
    }

    for (const el of $$<HTMLElement>(
      "button, a[href], input, select, textarea, summary, [tabindex]",
    )) {
      if (el.hasAttribute("aria-hidden")) continue;
      const name =
        (el.getAttribute("aria-label") ?? "") +
        text(el) +
        (el.id ? text(document.querySelector(`label[for="${el.id}"]`)) : "") +
        text(el.closest("label")) +
        (el.getAttribute("title") ?? "");
      if (name.trim() === "") nameless.push(`${stop.href} ${el.className || el.tagName}`);
      const ti = el.getAttribute("tabindex");
      if (ti && Number(ti) > 0) positiveTab.push(`${stop.href} ${el.className}`);
    }

    // Anything that reports a state has to say so in words as well as in hue.
    for (const el of $$(
      ".mark-pass, .mark-fail, .chip-end, .chip-bad, .chip-tool, .scn-tag, .tr-tag, .lsn-col-h, .tool-out-tag",
    )) {
      if (text(el).replace(/[✓✕✗→←·]/g, "").trim() === "") {
        colourOnly.push(`${stop.href} ${el.className}`);
      }
    }

    // Contrast, in whichever theme the page is currently in.
    sweep(stop.href);
  }

  ok(missingStops.length === 0, "every stop in the sidebar is reachable", missingStops.join(", ") || `${STOPS.length} stops`);
  ok(overflow.length === 0, `nothing overflows sideways at ${width}px`, overflow.join("; ") || "none");
  ok(nameless.length === 0, "every control has an accessible name", nameless.slice(0, 4).join("; ") || "none");
  ok(positiveTab.length === 0, "no positive tabindex disturbs the tab order", positiveTab.join("; ") || "none");
  ok(colourOnly.length === 0, "no state is signalled by colour alone", colourOnly.slice(0, 4).join("; ") || "none");

  // ---- focus ------------------------------------------------------------
  await go("/loop");
  const focusRule = [...document.styleSheets].some((sheet) => {
    try {
      return [...(sheet.cssRules ?? [])].some(
        (r) =>
          r instanceof CSSStyleRule &&
          r.selectorText.includes(":focus-visible") &&
          r.style.outlineStyle !== "none" &&
          r.style.outlineWidth !== "0px" &&
          r.style.outline !== "none",
      );
    } catch {
      return false;
    }
  });
  ok(focusRule, "a :focus-visible rule draws a visible outline");

  // Measuring the painted ring needs an element that is in the focus-visible
  // state. A script cannot put the browser into keyboard modality — a synthetic
  // key event is not trusted — but a text field matches :focus-visible on any
  // focus, so the ring on one is the real thing rather than a stylesheet claim.
  const firstBtn = $<HTMLButtonElement>(".scn-tab");
  firstBtn?.focus();
  ok(document.activeElement === firstBtn, "controls take focus programmatically");

  await go("/build");
  const probe = $<HTMLInputElement>(".q-input");
  probe?.focus();
  await settle(2);
  const visible = probe?.matches(":focus-visible") ?? false;
  const cs = probe ? getComputedStyle(probe) : null;
  const ringWidth = cs ? parseFloat(cs.outlineWidth) : 0;
  const painted = cs ? cs.outlineStyle !== "none" && ringWidth > 0 : false;
  const shadowed = cs ? cs.boxShadow !== "none" : false;
  ok(
    visible && (painted || shadowed),
    "a focused field paints a visible ring",
    `focus-visible=${visible} outline=${cs?.outlineStyle ?? "?"} ${ringWidth}px shadow=${shadowed}`,
  );
  await go("/loop");

  // ---- reduced motion ---------------------------------------------------
  let reduced = false;
  for (const sheet of [...document.styleSheets]) {
    try {
      for (const rule of [...(sheet.cssRules ?? [])]) {
        if (rule instanceof CSSMediaRule && rule.conditionText.includes("prefers-reduced-motion")) {
          reduced = true;
        }
      }
    } catch {
      /* a cross-origin sheet cannot be read; none of ours are */
    }
  }
  ok(reduced, "the stylesheet honours prefers-reduced-motion");

  // ---- /loop: the picker is a real tablist ------------------------------
  // go() returns early when the page is already the current stop, so this block
  // inherits whatever the previous one left behind rather than a fresh mount.
  // The arrow-key assertions below are relative moves and are meaningless from
  // the wrong starting tab, so the state is asserted first and then normalised:
  // a leak fails here, in one line that names it, instead of turning into four
  // mysterious failures about arrow keys.
  await go("/loop");
  const tablist = $('[role="tablist"]');
  const tabs = $$<HTMLButtonElement>('[role="tab"]');
  ok(!!tablist, "the scenario picker is a tablist");
  ok(tabs.length === scenarios.length, "one tab per scenario", `${tabs.length} of ${scenarios.length}`);
  ok(
    tabs.filter((t) => t.getAttribute("aria-selected") === "true").length === 1,
    "exactly one tab is selected",
  );
  ok(
    tabs.every((t) => Number(t.tabIndex) === (t.getAttribute("aria-selected") === "true" ? 0 : -1)),
    "only the selected tab is in the tab order",
  );

  const title = () => text($(".n-head h2"));
  const selected = () => tabs.findIndex((t) => t.getAttribute("aria-selected") === "true");

  ok(
    selected() === 0,
    "precondition: the picker is on the first scenario before the keyboard tests",
    selected() === 0 ? "as mounted" : `an earlier block left it on tab ${selected()}`,
  );
  if (selected() !== 0) {
    tabs[0].click();
    await settle(3);
  }

  tabs[0].focus();
  const before = title();
  press(document.activeElement ?? tabs[0], "ArrowRight");
  await settle(3);
  ok(selected() === 1, "ArrowRight moves to the next scenario", `now ${selected()}`);
  ok(title() !== before, "the panel changed with the tab", `${before} → ${title()}`);
  ok(document.activeElement === tabs[1], "focus follows the selection");

  press(document.activeElement ?? tabs[1], "ArrowLeft");
  await settle(3);
  ok(selected() === 0, "ArrowLeft moves back", `now ${selected()}`);

  press(document.activeElement ?? tabs[0], "End");
  await settle(3);
  ok(selected() === tabs.length - 1, "End jumps to the last scenario", `now ${selected()}`);

  press(document.activeElement ?? tabs[tabs.length - 1], "Home");
  await settle(3);
  ok(selected() === 0, "Home jumps to the first scenario", `now ${selected()}`);

  // ---- /loop: the UI agrees with stateAt() ------------------------------
  const chatCount = () => $$(".panel").at(0)?.querySelectorAll(".panel-body > *").length ?? 0;
  const cardCount = () => $$(".card").length;
  const emptyPanel = () => $$(".panel").at(0)?.querySelector(".empty") != null;

  let mismatches: string[] = [];
  for (let s = 0; s < scenarios.length; s++) {
    tabs[s].click();
    await settle(3);
    const steps = scenarios[s].steps;
    const advance = () => $$<HTMLButtonElement>(".controls .btn-primary")[0];
    const backBtn = () => $$<HTMLButtonElement>(".controls .btn")[1];

    // forward through every step
    for (let i = 0; i < steps.length; i++) {
      if (i > 0) {
        advance()?.click();
        await settle(2);
      }
      const want = stateAt(steps, i);
      const chat = emptyPanel() ? 0 : chatCount();
      if (chat !== want.chat.length || cardCount() !== want.msgs.length) {
        mismatches.push(
          `${scenarios[s].id}#${i} forward: chat ${chat}/${want.chat.length}, cards ${cardCount()}/${want.msgs.length}`,
        );
      }
    }
    // and back again
    for (let i = steps.length - 1; i >= 0; i--) {
      const want = stateAt(steps, i);
      const chat = emptyPanel() ? 0 : chatCount();
      if (chat !== want.chat.length || cardCount() !== want.msgs.length) {
        mismatches.push(
          `${scenarios[s].id}#${i} back: chat ${chat}/${want.chat.length}, cards ${cardCount()}/${want.msgs.length}`,
        );
      }
      if (i > 0) {
        backBtn()?.click();
        await settle(2);
      }
    }
  }
  ok(
    mismatches.length === 0,
    "stepping forward and back matches stateAt() at every step of every scenario",
    mismatches.slice(0, 3).join("; ") || `${scenarios.reduce((n, s) => n + s.steps.length, 0)} steps checked twice`,
  );

  // ---- /cost ------------------------------------------------------------
  await go("/cost");
  const slider = $<HTMLInputElement>('input[type="range"]');
  ok(!!slider, "the cost stop has a slider");
  const switches = $$<HTMLInputElement>('input[type="checkbox"]');
  ok(switches.length === 2, "two switches: caching and the pasted document", `${switches.length}`);

  const totalShown = () => text($$(".lsn-stat-v").at(0));
  if (slider) {
    setRange(slider, 5);
    await settle(3);
    const at5 = totalShown();
    setRange(slider, MAX_ROUNDS);
    await settle(3);
    const at40 = totalShown();
    ok(at5 !== at40, "dragging the slider changes the rendered numbers", `${at5} → ${at40}`);
    ok(
      at40 === money(runCost(ASSUMPTIONS, MAX_ROUNDS, { cached: false }).total),
      "the rendered total is the total the model computes",
      `page ${at40}, model ${money(runCost(ASSUMPTIONS, MAX_ROUNDS, { cached: false }).total)}`,
    );

    // Cheaper from turn two, dearer at turn one — what the prose claims.
    setRange(slider, 1);
    await settle(3);
    const plain1 = totalShown();
    switches[0].click();
    await settle(3);
    const cached1 = totalShown();
    ok(
      parseFloat(cached1.slice(1)) > parseFloat(plain1.slice(1)),
      "caching costs more at one round, as the page says",
      `${plain1} → ${cached1}`,
    );
    setRange(slider, 2);
    await settle(3);
    const cached2 = parseFloat(totalShown().slice(1));
    switches[0].click();
    await settle(3);
    const plain2 = parseFloat(totalShown().slice(1));
    ok(cached2 < plain2, "caching wins from two rounds on", `cached ${cached2} < plain ${plain2}`);

    // The curve bends: the last round costs far more than the first.
    setRange(slider, MAX_ROUNDS);
    await settle(3);
    const stats = $$(".lsn-stat-v").map(text);
    const ratio = stats.find((s) => s.endsWith("×"));
    ok(
      ratio != null && parseFloat(ratio) > 4,
      "the last round costs several times the first, so the curve is not linear",
      ratio ?? "no ratio shown",
    );

    // The 20,000-token document: paid for on every round.
    const before40 = parseFloat(totalShown().slice(1));
    switches[1].click();
    await settle(3);
    const withDoc = parseFloat(totalShown().slice(1));
    const expected =
      runCost(ASSUMPTIONS, MAX_ROUNDS, { cached: false, extra: 20000 }).total;
    ok(
      Math.abs(withDoc - expected) < 0.005,
      "the pasted document matches the model",
      `page ${withDoc}, model ${expected.toFixed(4)}`,
    );
    ok(
      withDoc > before40 * 2,
      "a document pasted once is paid for on every round",
      `${before40} → ${withDoc}`,
    );
    switches[1].click();
    await settle(2);
  }

  const paths = $$('.chart-svg path').length;
  ok(paths >= 2, "the chart draws the curve against a reference line", `${paths} paths`);

  // ---- /build -----------------------------------------------------------
  await go("/build");
  const input = () => $<HTMLInputElement>(".q-input");
  const submit = () => $$<HTMLButtonElement>(".q-form .btn-primary")[0];
  const feedback = () => text($(".q-feedback"));
  const question = () => text($(".n-head h2"));

  ok(!!input(), "the build stop asks for an answer");
  const blank0 = blanks[0];
  const wrongInput = "{}";
  const wrongHint = blank0.wrong?.find((w) => w.test.test(normalize(wrongInput)));
  ok(!!wrongHint, "the first blank has a correction for {}");

  const q0 = question();
  const el = input();
  if (el && wrongHint) {
    setText(el, wrongInput);
    submit()?.click();
    await settle(3);
    ok(
      feedback().includes(wrongHint.hint[lang()].slice(0, 24)),
      "a wrong answer produces its own specific correction",
      feedback().slice(0, 60),
    );
    ok(question() === q0, "a wrong answer does not advance");

    setText(input()!, blank0.answers[0]);
    submit()?.click();
    await settle(4);
    // the page waits before moving on, so give it time
    for (let i = 0; i < 120 && question() === q0; i++) await frame();
    ok(question() !== q0, "a correct answer advances to the next blank", question().slice(0, 40));
    ok(
      $$(".blank-done").length >= 1,
      "the filled answer appears in the code panel",
      `${$$(".blank-done").length} filled`,
    );
  }

  // three wrong answers unlock the answer
  const q1 = question();
  for (let i = 0; i < 3; i++) {
    setText(input()!, "definitely wrong");
    submit()?.click();
    await settle(3);
  }
  const revealBtn = $$<HTMLButtonElement>(".q-form .btn").find(
    (b) => b !== submit() && !b.textContent?.includes("?"),
  );
  const buttons = $$<HTMLButtonElement>(".q-form .btn").length;
  ok(buttons >= 3, "three wrong answers unlock the answer button", `${buttons} buttons`);
  const reveal = $$<HTMLButtonElement>(".q-form .btn").at(-1);
  reveal?.click();
  await settle(4);
  for (let i = 0; i < 120 && question() === q1; i++) await frame();
  ok(question() !== q1, "showing the answer advances", question().slice(0, 40));
  void revealBtn;

  // ---- /permission: the decision changes the run ------------------------
  await go("/permission");
  const beats = () => $$(".pm-beat").length;
  const askButtons = () => $$<HTMLButtonElement>(".pm-buttons .btn");
  const base = beats();
  ok(askButtons().length === 3, "three answers are offered", `${askButtons().length}`);
  ok($$(".pm-waiting").length === 1, "the loop is visibly stopped on one beat");

  const seen: number[] = [];
  for (let i = 0; i < 3; i++) {
    askButtons()[i]?.click();
    await settle(3);
    seen.push(beats());
    ok(beats() > base, `choosing answer ${i + 1} continues the run`, `${base} → ${beats()}`);
    const again = $$<HTMLButtonElement>(".pm-after .btn").at(-1);
    again?.click();
    await settle(3);
  }
  ok(new Set(seen).size > 1, "the three answers do not produce the same run", seen.join(", "));

  askButtons()[1]?.click();
  await settle(3);
  ok(
    $$(".pm-bad").length > 0,
    "allowing always shows the step that happens without you",
    `${$$(".pm-bad").length} marked`,
  );

  // ---- /chance: sampling actually varies, and zero pins it --------------
  await go("/chance");
  const tempRange = $<HTMLInputElement>('input[type="range"]');
  const runBtn = () => $$<HTMLButtonElement>(".q-form .btn")[0];
  const tenBtn = () => $$<HTMLButtonElement>(".q-form .btn")[1];
  const counts = () => $$(".ch-num").map((e) => Number(text(e).split(" ")[0]));

  ok(!!tempRange, "the chance stop has a temperature control");
  if (tempRange) {
    // Warm: over many runs more than one path should appear.
    setRange(tempRange, 3);
    await settle(2);
    for (let i = 0; i < 5; i++) {
      tenBtn()?.click();
      await settle(2);
    }
    const warm = counts();
    ok(
      warm.filter((n) => n > 0).length > 1,
      "at a high temperature the same task takes more than one path",
      warm.join("/"),
    );
    ok(
      warm.reduce((a, b) => a + b, 0) === 50,
      "the tally counts every run",
      String(warm.reduce((a, b) => a + b, 0)),
    );

    // Cold: one path, every time.
    setRange(tempRange, 0);
    await settle(2);
    for (let i = 0; i < 5; i++) {
      tenBtn()?.click();
      await settle(2);
    }
    const cold = counts();
    ok(
      cold.filter((n) => n > 0).length === 1,
      "at temperature zero it takes the same path every time",
      cold.join("/"),
    );
    void runBtn;
  }

  // ---- /invent: tools change the answer and make it checkable ------------
  await go("/invent");
  const answers = () => $$(".iv-answer").map(text);
  const sound = () => $$(".iv-ok").length;
  const choices = () => $$<HTMLButtonElement>(".lsn-choice");
  const blind = answers();
  ok(sound() === 0, "without tools none of the three answers is sound", `${sound()} of 3`);
  choices()[1]?.click();
  await settle(3);
  ok(sound() === 3, "with tools all three are sound", `${sound()} of 3`);
  ok(
    answers().every((a, i) => a !== blind[i]),
    "every answer changed once it had somewhere to look",
  );

  // ---- /instructions: the tool list, not the sentence --------------------
  await go("/instructions");
  const setupBtns = () => $$<HTMLButtonElement>(".lsn-choice");
  ok(setupBtns().length === 3, "three conditions are offered", `${setupBtns().length}`);
  setupBtns()[0]?.click();
  await settle(3);
  ok($$(".pm-bad").length > 0, "with nothing said, the run does the thing you did not want");
  ok($$(".in-gone").length === 0, "the outbound tool is present in the first condition");
  setupBtns()[1]?.click();
  await settle(3);
  ok($$(".pm-bad").length === 0, "telling it not to changes the run");
  ok($$(".in-gone").length === 0, "and the tool is still in the list, which is the point");
  setupBtns()[2]?.click();
  await settle(3);
  ok($$(".in-gone").length === 1, "removing the tool shows it struck out of the list");
  ok($$(".pm-bad").length === 0, "and the run cannot do it at all");

  // ---- /again: the three failures are not interchangeable ---------------
  await go("/again");
  const failBtns = () => $$<HTMLButtonElement>(".lsn-choice");
  ok(failBtns().length === 3, "three failure modes are offered", `${failBtns().length}`);
  const certainty: string[] = [];
  for (let i = 0; i < 3; i++) {
    failBtns()[i]?.click();
    await settle(3);
    const mark = $(".ag-key .iv-k b");
    certainty.push(mark?.className ?? "?");
  }
  ok(
    certainty.filter((c) => c.includes("mark-pass")).length === 1,
    "exactly one failure mode tells you the work did not happen",
    certainty.join(", "),
  );
  ok(
    $$(".lsn-table .mark-fail").length >= 2 && $$(".lsn-table .mark-pass").length >= 2,
    "the tool table shows both repeatable and unrepeatable tools",
  );
  ok($$(".ag-fix").length >= 2, "every unrepeatable tool is shown with its fix", `${$$(".ag-fix").length}`);

  // ---- progress: the rail remembers where you have been -----------------
  // Every stop was visited by the sweep at the top of this run, so by now the
  // rail should be able to say so.
  await go("/");
  const groupHeads = $$(".side-group-name").length;
  ok(groupHeads === GROUPS.length, "the rail is grouped", `${groupHeads} groups`);
  ok(
    $$(".side-group-why").length === GROUPS.length,
    "every group says why it follows the one before it",
  );

  const readMarks = () => $$(".side-read").length;
  const statusLabel = () => text($(".side-status-label"));
  ok(
    readMarks() >= STOPS.length - 1,
    "every stop visited is marked as read",
    `${readMarks()} marked of ${STOPS.length}`,
  );
  ok(
    statusLabel().startsWith(String(STOPS.length)),
    "the progress card counts them",
    statusLabel(),
  );

  const resetBtn = $<HTMLButtonElement>(".side-reset");
  ok(!!resetBtn && !resetBtn.disabled, "progress can be cleared");
  resetBtn?.click();
  await settle(3);
  ok(readMarks() === 0, "clearing removes every mark", `${readMarks()} left`);
  ok(
    !localStorage.getItem("agentlab-visited"),
    "and clears what was stored on this device",
  );
  // Put the reader back where they were rather than leaving a wiped rail.
  await go("/loop");
  await go("/");

  // ---- the group checks -------------------------------------------------
  // The claim worth testing in a browser is that the correct answer cannot be
  // found without answering: no attribute, class or hidden text gives it away
  // before a reader commits.
  const leaked: string[] = [];
  const noCorrection: string[] = [];
  const wrongVerdicts: string[] = [];

  for (const check of checks) {
    if (!(await go(check.on))) continue;
    const blocks = $$(".gc-q");
    ok(
      blocks.length === check.questions.length,
      `${check.on} shows its ${check.questions.length} questions`,
      `${blocks.length} rendered`,
    );

    check.questions.forEach((q, qi) => {
      const block = blocks[qi];
      if (!block) return;
      const buttons = Array.from(block.querySelectorAll<HTMLButtonElement>(".gc-choice"));
      if (buttons.length !== q.options.length) {
        leaked.push(`${q.id}: ${buttons.length} of ${q.options.length} options rendered`);
        return;
      }
      // Nothing in the markup may separate the right answer from the rest.
      const fingerprint = buttons.map(
        (b) => `${b.className}|${b.getAttribute("aria-pressed")}|${b.disabled}`,
      );
      const correctAt = q.options.findIndex((o) => o.correct);
      const others = fingerprint.filter((_, i) => i !== correctAt);
      if (others.some((f) => f !== fingerprint[correctAt])) {
        leaked.push(`${q.id}: the correct option is distinguishable before answering`);
      }
      // And no correction text is in the DOM before it is earned.
      const html = block.innerHTML;
      for (const o of q.options) {
        const hint = o.correction ? t(o.correction, lang()).slice(0, 18) : null;
        if (hint && html.includes(hint)) {
          leaked.push(`${q.id}: the correction for "${o.id}" is in the DOM unanswered`);
        }
      }
    });

    // Answer the first question of each check wrongly, then correctly.
    const first = check.questions[0];
    const wrong = first.options.find((o) => !o.correct);
    const right = first.options.find((o) => o.correct);
    const block = blocks[0];
    if (block && wrong && right) {
      const at = (id: string) =>
        Array.from(block.querySelectorAll<HTMLButtonElement>(".gc-choice"))[
          first.options.findIndex((o) => o.id === id)
        ];
      at(wrong.id)?.click();
      await settle(3);
      const correction = text(block.querySelector(".gc-correction"));
      if (!correction.includes(t(wrong.correction!, lang()).slice(0, 18))) {
        noCorrection.push(`${check.on}/${first.id}`);
      }
      if (!text(block.querySelector(".gc-wrong .gc-verdict"))) {
        wrongVerdicts.push(`${check.on}/${first.id}`);
      }
      at(right.id)?.click();
      await settle(3);
      if (!block.classList.contains("gc-solved")) {
        wrongVerdicts.push(`${check.on}/${first.id}: correct answer not accepted`);
      }
    }
  }

  ok(leaked.length === 0, "no group check gives its answer away in the markup", leaked.slice(0, 3).join("; ") || `${checks.length} checks`);
  ok(noCorrection.length === 0, "a wrong answer shows that option's own correction", noCorrection.join("; ") || "all six");
  ok(wrongVerdicts.length === 0, "right and wrong are stated in words, not only in colour", wrongVerdicts.join("; ") || "all six");

  // No scoring anywhere on the page: that was a design constraint, not a
  // preference, so it is worth failing on.
  await go("/measure");
  const scoreish = $$(".gc *").filter((el) =>
    /\b\d+\s*\/\s*\d+\b|%/.test(text(el)) && el.children.length === 0,
  );
  ok(scoreish.length === 0, "the checks show no score", scoreish.slice(0, 2).map(text).join("; ") || "none");

  // ---- semantics --------------------------------------------------------
  // Computed rather than eyeballed. A screen reader cannot be run here, so what
  // is checked is everything a screen reader would read: the heading spine, the
  // landmarks, whether a graphic announces itself or stays quiet, and whether
  // the name of a control says what it does.
  const headingFaults: string[] = [];
  const landmarkFaults: string[] = [];
  const graphicFaults: string[] = [];
  const nameFaults: string[] = [];

  // Names that pass a presence check and fail a person.
  const EMPTY_NAMES = [
    "button", "click", "click here", "here", "link", "more", "read more",
    "go", "ok", "submit", "open", "close", "icon", "image", "svg",
    "按钮", "点击", "点这里", "这里", "更多", "打开", "关闭", "图标",
  ];

  const accessibleName = (el: Element): string => {
    const labelledby = el.getAttribute("aria-labelledby");
    if (labelledby) {
      const parts = labelledby
        .split(/\s+/)
        .map((id) => text(document.getElementById(id)))
        .filter(Boolean);
      if (parts.length) return parts.join(" ");
    }
    const aria = el.getAttribute("aria-label");
    if (aria?.trim()) return aria.trim();
    const own = text(el);
    if (own) return own;
    if (el.id) {
      const label = text(document.querySelector(`label[for="${el.id}"]`));
      if (label) return label;
    }
    const wrapping = text(el.closest("label"));
    if (wrapping) return wrapping;
    const title = el.getAttribute("title");
    if (title?.trim()) return title.trim();
    return text(el.querySelector("title"));
  };

  for (const stop of STOPS) {
    if (!(await go(stop.href))) continue;
    settleAnimations();

    const headings = $$("h1, h2, h3, h4, h5, h6");
    const levels = headings.map((h) => Number(h.tagName[1]));
    const h1s = levels.filter((n) => n === 1).length;
    if (h1s !== 1) headingFaults.push(`${stop.href}: ${h1s} h1 elements`);
    for (let i = 1; i < levels.length; i++) {
      if (levels[i] - levels[i - 1] > 1) {
        headingFaults.push(
          `${stop.href}: h${levels[i - 1]} then h${levels[i]} (${text(headings[i]).slice(0, 22)})`,
        );
      }
    }
    if (levels.length && levels[0] !== 1) {
      headingFaults.push(`${stop.href}: first heading is h${levels[0]}, not h1`);
    }
    for (const h of headings) {
      if (!text(h)) headingFaults.push(`${stop.href}: an empty ${h.tagName.toLowerCase()}`);
    }

    const mains = $$("main");
    if (mains.length !== 1) landmarkFaults.push(`${stop.href}: ${mains.length} main landmarks`);
    const navs = $$("nav");
    if (navs.length === 0) landmarkFaults.push(`${stop.href}: no nav landmark`);
    const navNames = navs.map((n) => accessibleName(n));
    if (new Set(navNames).size !== navNames.length) {
      landmarkFaults.push(`${stop.href}: two navs share a name (${navNames.join(" / ")})`);
    }
    if (navNames.some((n) => !n)) landmarkFaults.push(`${stop.href}: a nav has no name`);

    for (const g of $$("svg, img, canvas")) {
      const hidden =
        g.getAttribute("aria-hidden") === "true" || g.closest("[aria-hidden='true']") != null;
      if (hidden) continue;
      const name = accessibleName(g);
      const role = g.getAttribute("role");
      if (!name) {
        graphicFaults.push(`${stop.href}: <${g.tagName.toLowerCase()}> neither named nor hidden`);
      } else if (g.tagName.toLowerCase() === "svg" && role !== "img") {
        graphicFaults.push(`${stop.href}: named <svg> without role="img"`);
      }
    }

    for (const el of $$<HTMLElement>(
      "button, a[href], input, select, textarea, summary, [role='tab'], [role='slider']",
    )) {
      if (el.getAttribute("aria-hidden") === "true" || el.closest("[aria-hidden='true']")) continue;
      const name = accessibleName(el).replace(/\s+/g, " ").trim();
      if (!name) {
        nameFaults.push(`${stop.href}: unnamed ${el.tagName.toLowerCase()}.${el.className.split(" ")[0]}`);
      } else if (EMPTY_NAMES.includes(name.toLowerCase())) {
        nameFaults.push(`${stop.href}: "${name}" names nothing`);
      }
    }
  }

  ok(headingFaults.length === 0, "one h1 per stop and no heading level skipped", headingFaults.slice(0, 4).join("; ") || `${STOPS.length} stops`);
  ok(landmarkFaults.length === 0, "main and nav landmarks are present and distinct", landmarkFaults.slice(0, 4).join("; ") || `${STOPS.length} stops`);
  ok(graphicFaults.length === 0, "every graphic is either named or hidden from assistive technology", graphicFaults.slice(0, 4).join("; ") || "all clear");
  ok(nameFaults.length === 0, "every control has a name that says what it does", nameFaults.slice(0, 4).join("; ") || "all clear");

  // ---- widgets report their own state -----------------------------------
  await go("/loop");
  const tabs2 = $$<HTMLElement>('[role="tab"]');
  ok(tabs2.every((x) => x.hasAttribute("aria-selected")), "every tab reports whether it is selected");
  const tablistName = accessibleName($('[role="tablist"]')!);
  ok(!!tablistName, "the tablist is named", tablistName || "unnamed");

  // The rail's progress bar is a different thing from the run's meter, and only
  // the second one is supposed to move as the run advances.
  const rail = $(".side-status [role='progressbar']");
  ok(
    !!rail && Number.isFinite(Number(rail.getAttribute("aria-valuenow"))),
    "the reading-progress bar reports a numeric value",
    rail?.getAttribute("aria-valuenow") ?? "absent",
  );

  // Pick the scenario whose meter actually climbs.
  $$<HTMLButtonElement>('[role="tab"]')[1]?.click();
  await settle(3);
  const meterEl = $(".meter-track[role='progressbar']");
  ok(!!meterEl, "the run shows a meter", meterEl ? "present" : "no .meter-track on this scenario");
  if (meterEl) {
    const before = meterEl.getAttribute("aria-valuenow");
    for (let i = 0; i < 4; i++) {
      $$<HTMLButtonElement>(".controls .btn-primary")[0]?.click();
      await settle(2);
    }
    const node = $(".meter-track[role='progressbar']");
    const after = node?.getAttribute("aria-valuenow");
    ok(before !== after, "a progressbar's value changes when the run advances", `${before} → ${after}`);
    const now = Number(after);
    const max = Number(node?.getAttribute("aria-valuemax"));
    ok(
      Number.isFinite(now) && Number.isFinite(max) && now <= max,
      "a progressbar reports a value inside its range",
      `${now} of ${max}`,
    );
  }

  await go("/cost");
  const rangeEl = $<HTMLInputElement>('input[type="range"]');
  ok(!!rangeEl, "the cost stop still has a slider to report a value", rangeEl ? "present" : "absent");
  if (rangeEl) {
    const read = () => rangeEl.getAttribute("aria-valuenow") ?? rangeEl.value;
    setRange(rangeEl, 7);
    await settle(2);
    const a = read();
    setRange(rangeEl, 31);
    await settle(2);
    ok(a !== read(), "a slider's reported value follows the control", `${a} → ${read()}`);
    ok(!!accessibleName(rangeEl), "the slider is named", accessibleName(rangeEl) || "unnamed");
  }

  await go("/permission");
  const askLegend = $("fieldset.pm-ask legend");
  ok(!!text(askLegend), "the approval decision is announced as a question", text(askLegend));

  // ---- the charts say what they show ------------------------------------
  await go("/cost");
  const chart = $("svg.chart-svg");
  const chartName = chart ? accessibleName(chart) : "";
  ok(
    chart?.getAttribute("role") === "img",
    "the cost chart is exposed as an image rather than as its path data",
  );
  ok(
    chartName.length > 40,
    "the chart's text alternative carries its conclusion, not just a label",
    chartName.slice(0, 90),
  );
  const conclusion = $(".chart-conclusion");
  ok(!!text(conclusion), "the conclusion the chart shows is also written out", text(conclusion).slice(0, 80));

  // ---- the one-page view ------------------------------------------------
  // Someone who has read the course once comes back for one paragraph. The
  // claims worth testing are that every stop is there, that every heading can
  // be linked to, and that a link actually lands on the paragraph.
  await go("/all");
  const allStops = $$(".all-stop").length;
  ok(allStops === COURSE.length, "the one-page view carries every stop", `${allStops} of ${COURSE.length}`);

  const expectedSections = COURSE.reduce((n, s) => n + s.sections.length, 0);
  const renderedSections = $$(".all-section").length;
  ok(
    renderedSections >= expectedSections,
    "every section of every stop is on the page",
    `${renderedSections} rendered, ${expectedSections} from the course`,
  );

  const anchors = $$(".all-heading[id]").map((h) => h.id);
  ok(anchors.length > 0 && new Set(anchors).size === anchors.length, "every heading has a unique anchor", `${anchors.length} anchors`);

  // Follow one and check the browser can find it.
  const target = anchors[Math.floor(anchors.length / 2)];
  location.hash = `#${target}`;
  await settle(3);
  const landed = document.getElementById(target);
  ok(!!landed, "an anchor resolves to a heading on the page", target);
  history.replaceState(null, "", location.pathname);

  ok(
    $$(".all-static").length > 0,
    "sections that replaced an interaction say so",
    `${$$(".all-static").length} marked`,
  );

  // ---- search -----------------------------------------------------------
  // No dependency and no network: the index is the course view, flattened.
  const hits = search("idempotent", lang());
  const zhHits = search("幂等", "zh");
  ok(hits.length > 0, "searching the prose finds a term the course teaches", `${hits.length} hits for "idempotent"`);
  ok(zhHits.length > 0, "and finds it in Chinese too", `${zhHits.length} hits for 幂等`);
  ok(
    hits.every((h) => STOPS.some((s) => s.href === h.href)),
    "every hit points at a real stop",
  );
  ok(
    hits.every((h) => h.snippet.includes("[[") === false && h.snippet.includes("**") === false),
    "search snippets carry no markup the reader never sees",
  );
  ok(search("z", lang()).length === 0, "a single character does not search the prose");

  // And through the palette, which is where a reader would actually look.
  await go("/loop");
  window.dispatchEvent(
    new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
  );
  await settle(3);
  const palette = $<HTMLInputElement>(".cmdk-input");
  ok(!!palette, "the command palette opens");
  if (palette) {
    setText(palette, "idempotent");
    await settle(4);
    const rows = $$(".cmdk-item");
    const snippets = $$(".cmdk-snippet").length;
    ok(rows.length > 0 && snippets > 0, "the palette shows prose results", `${rows.length} rows, ${snippets} snippets`);
    ok($$(".cmdk-snippet mark").length > 0, "the matched words are marked in the snippet");
    palette.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await settle(2);
  }
  void VIEWS;

  // ---- both themes ------------------------------------------------------
  const root = document.documentElement;
  const startedIn = root.dataset.theme;
  for (const theme of ["dark", "light"]) {
    root.dataset.theme = theme;
    await settle(3);
    for (const stop of STOPS.map((x) => x.href)) {
      await go(stop);
      sweep(stop);
    }
  }
  if (startedIn) root.dataset.theme = startedIn;
  // ---- surfaces that only exist mid-interaction --------------------------
  // The sweep above visits each stop at rest, so a chat bubble, a wrong-answer
  // correction, a filled blank and a run transcript were never on screen when it
  // measured. Seventeen of the sixty selectors it names had never matched
  // anything, and the check passed anyway because a selector that matches
  // nothing is skipped rather than reported.
  //
  // Each state below is reached once and then measured in both themes in place,
  // because reaching it is the expensive part and flipping data-theme is not.
  const measureHere = async (where: string) => {
    for (const theme of ["dark", "light"]) {
      root.dataset.theme = theme;
      await settle(2);
      sweep(where);
    }
    root.dataset.theme = startedIn ?? "dark";
    await settle(1);
  };

  const stepRun = async (times: number) => {
    for (let i = 0; i < times; i++) {
      $$<HTMLButtonElement>(".controls .btn-primary")[0]?.click();
      await settle(2);
    }
  };

  // A run in progress: chat bubbles, tool output, a pending tool, a meter.
  await go("/loop");
  $$<HTMLButtonElement>('[role="tab"]')[1]?.click();
  await settle(3);
  await stepRun(3);
  await measureHere("/loop+3");

  // The scenario that annotates an oversized card.
  $$<HTMLButtonElement>('[role="tab"]')[3]?.click();
  await settle(3);
  await stepRun(4);
  await measureHere("/loop-oversized");

  // A pending tool call, which only exists between a request and its result.
  await go("/loop");
  $$<HTMLButtonElement>('[role="tab"]')[0]?.click();
  await settle(3);
  await stepRun(2);
  await measureHere("/loop-pending");

  // The closing scene of the opening animation carries the formula badge.
  // Stepping to it is not an option: on the last scene the advance control
  // becomes a link to the next stop, so one click too many leaves the page.
  // Each scene of the opening animation is its own screen of prose, and only the
  // active one is painted: the rest sit at opacity 0, which the traversal counts
  // as skipped rather than measured. Visiting them is the difference between
  // measuring one sixth of that stop and measuring all of it.
  await go("/");
  const scenes = $$<HTMLButtonElement>(".progress .pdot");
  for (let i = 0; i < scenes.length; i++) {
    scenes[i].click();
    await settle(4);
    await measureHere(`/-scene${i + 1}`);
  }

  // A blank answered wrongly and then correctly: the feedback and the fill.
  await go("/build");
  const buildInput = () => $<HTMLInputElement>(".q-input");
  const buildSubmit = () => $$<HTMLButtonElement>(".q-form .btn-primary")[0];
  if (buildInput()) {
    setText(buildInput()!, "definitely wrong");
    buildSubmit()?.click();
    await settle(3);
    await measureHere("/build-wrong");

    for (let i = 0; i < blanks.length; i++) {
      const field = buildInput();
      if (!field) break;
      setText(field, blanks[i].answers[0]);
      buildSubmit()?.click();
      // The page pauses on a correct answer before moving on.
      for (let f = 0; f < 140 && buildInput() === field; f++) await frame();
      await settle(2);
    }
    await measureHere("/build-filled");

    // The run transcript prints a line at a time; a few are enough to measure.
    $$<HTMLButtonElement>(".q-form .btn-primary")[0]?.click();
    await settle(3);
    for (let f = 0; f < 200 && $$(".run-line").length < 3; f++) await frame();
    await measureHere("/build-running");
  }

  // A group check with one answer wrong and one right.
  await go("/measure");
  const firstQuestion = $(".gc-q");
  if (firstQuestion) {
    const choices = Array.from(
      firstQuestion.querySelectorAll<HTMLButtonElement>(".gc-choice"),
    );
    const wrongAt = checks
      .find((c) => c.on === "/measure")
      ?.questions[0].options.findIndex((o) => !o.correct);
    const rightAt = checks
      .find((c) => c.on === "/measure")
      ?.questions[0].options.findIndex((o) => o.correct);
    if (wrongAt !== undefined && wrongAt >= 0) {
      choices[wrongAt]?.click();
      await settle(3);
      await measureHere("/measure-wrong");
    }
    if (rightAt !== undefined && rightAt >= 0) {
      choices[rightAt]?.click();
      await settle(3);
      await measureHere("/measure-right");
    }
  }

  // The palette, which owns its own hint line.
  window.dispatchEvent(
    new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
  );
  await settle(3);
  await measureHere("/palette");
  document
    .querySelector(".cmdk-input")
    ?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await settle(2);

  // What replaced the selector list. The number of surfaces measured is now a
  // property of the pages rather than of a list somebody maintained, so it is
  // reported here and asserted against a floor rather than left to be inferred
  // from a score that could be perfect and wrong at the same time.
  const skippedCount = [...skipTally.values()].reduce((a, b) => a + b, 0);
  const present = measuredCount + skippedCount;
  const ratio = present === 0 ? 0 : measuredCount / present;
  const breakdown =
    [...skipTally.entries()].sort((a, b) => b[1] - a[1]).map(([r, n]) => `${r} ${n}`).join(", ") ||
    "nothing skipped";

  ok(
    ratio >= COVERAGE_FLOOR,
    `the traversal measured at least ${Math.round(COVERAGE_FLOOR * 100)} per cent of the text on the page`,
    `${measuredCount} of ${present} (${(ratio * 100).toFixed(1)}%) — skipped: ${breakdown}`,
  );

  // A ratio cannot see a traversal that stopped descending: fewer nodes found is
  // fewer nodes skipped as well, and the ratio does not move. This can.
  const floor = measurementFloor(width);
  ok(
    measuredCount >= floor,
    `the traversal made at least ${floor} measurements at ${width}px`,
    `${measuredCount} measurements across ${measuredIn.size} passes`,
  );

  // Every reason a surface can go unmeasured is written down in SKIP_REASONS.
  // TypeScript keeps the set closed at compile time; this keeps it closed at run
  // time, so a reason introduced by some other route still has to be declared.
  const undeclared = [...skipTally.keys()].filter((r) => !SKIP_REASONS.includes(r as SkipReason));
  ok(
    undeclared.length === 0,
    "every surface skipped was skipped for a declared reason",
    undeclared.join(", ") || `${skipTally.size} of ${SKIP_REASONS.length} reasons used`,
  );

  // A stop that contributes nothing is the seventeen dead selectors again, in a
  // different hat: the run would still pass, and that stop would be unmeasured.
  const expectedPasses = STOPS.flatMap((s) => ["dark", "light"].map((t) => `${t}${s.href}`));
  const silent = expectedPasses.filter((key) => !measuredIn.has(key));
  ok(
    silent.length === 0,
    "every stop was measured in both themes",
    silent.join(", ") || `${expectedPasses.length} stop-and-theme pairs`,
  );

  // Grouped by surface, worst first, rather than listed as found.
  //
  // Traversal reports a failing surface once for every element and every pass it
  // appears in, so a single bad token can produce dozens of entries. Listing the
  // first few of those then hides every other surface behind it: reverting one
  // colour pair made three surfaces fail, and the report showed two of them
  // because the third was thirty entries down. The detector had detected it.
  const bySurface = new Map<string, { worst: number; need: number; where: string; seen: number }>();
  for (const f of lowContrast) {
    const held = bySurface.get(f.id);
    if (!held) bySurface.set(f.id, { worst: f.ratio, need: f.need, where: f.where, seen: 1 });
    else {
      held.seen++;
      if (f.ratio < held.worst) {
        held.worst = f.ratio;
        held.where = f.where;
      }
    }
  }
  const worstFirst = [...bySurface.entries()].sort((a, b) => a[1].worst - b[1].worst);
  const shown = worstFirst
    .slice(0, 10)
    .map(([id, v]) => `${id} ${v.worst.toFixed(2)}:1 (needs ${v.need}) at ${v.where}`);
  if (worstFirst.length > 10) shown.push(`and ${worstFirst.length - 10} more surfaces`);
  ok(
    bySurface.size === 0,
    "body text, headings and accents clear their contrast requirement in both themes",
    shown.join("; ") || "all pairs pass",
  );

  // ---- window surface ---------------------------------------------------
  const added = Object.keys(window).filter(
    (k) => !globalsBefore.has(k) && k !== "__selftest",
  );
  ok(added.length === 0, "the suite adds nothing to window but its report", added.join(", ") || "none");

  // ---- the count itself -------------------------------------------------
  // A block that never runs cannot fail, so the number of assertions that did
  // run is itself asserted. The sibling project lost eighteen assertions for a
  // full round to exactly this: they stopped executing, nothing turned red, and
  // the only trace was a total that had quietly stopped moving.
  //
  // This assertion counts itself, which is why the comparison adds one:
  // EXPECTED_ASSERTIONS is the total the driver should print, this one included.
  // Its twin lives in verify.mjs, which reads this file as text on every push
  // and refuses to let the two numbers drift apart.
  ok(
    results.length + 1 === EXPECTED_ASSERTIONS,
    `all ${EXPECTED_ASSERTIONS} assertions ran`,
    results.length + 1 === EXPECTED_ASSERTIONS
      ? "none skipped"
      : `${results.length + 1} ran; a block was skipped, or one was added without updating the number`,
  );

  report(results, width);
}

function report(results: Result[], width: number): void {
  const pass = results.filter((r) => r.ok).length;
  const lines = results.map(
    (r) => (r.ok ? "  ok   " : "  FAIL ") + r.label + (r.note ? "  [" + r.note + "]" : ""),
  );
  const body = `AgentLab self-test at ${width}px — ${pass}/${results.length} passed\n\n${lines.join("\n")}`;
  (window as unknown as Record<string, unknown>).__selftest = {
    pass,
    total: results.length,
    width,
    results,
  };
  document.title = `selftest ${pass}/${results.length}`;
  const pre = document.createElement("pre");
  pre.className = "selftest-report";
  pre.id = "selftest-report";
  pre.textContent = body;
  document.body.appendChild(pre);
  // eslint-disable-next-line no-console
  console.log(body);
}
