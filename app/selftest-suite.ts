// The assertions themselves. See app/selftest.tsx for why this exists.

import { STOPS } from "@/lib/stops";
import { scenarios, stateAt } from "@/lib/scenarios";
import { ASSUMPTIONS, MAX_ROUNDS, money, runCost } from "@/lib/cost";
import { blanks, normalize } from "@/lib/build";
import type { Lang } from "@/lib/i18n";

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

const over = (fg: RGBA, bg: RGBA): RGBA => [
  fg[0] * fg[3] + bg[0] * (1 - fg[3]),
  fg[1] * fg[3] + bg[1] * (1 - fg[3]),
  fg[2] * fg[3] + bg[2] * (1 - fg[3]),
  1,
];

/**
 * Composite every translucent background between the element and the page.
 *
 * A gradient has no single background-colour, so when one is painted the stops
 * are read out of the resolved background-image and the lightest is used: for
 * light text that is the hardest stop to sit on, which is the number worth
 * reporting.
 */
function backdrop(el: Element): RGBA {
  const stack: RGBA[] = [];
  let node: Element | null = el;
  while (node) {
    const cs = getComputedStyle(node);
    const image = cs.backgroundImage;
    if (image && image !== "none") {
      const stops = [...image.matchAll(/rgba?\([^)]+\)/g)]
        .map((m) => parseColor(m[0]))
        .filter((c): c is RGBA => c !== null && c[3] > 0);
      if (stops.length) {
        const lightest = stops.reduce((a, b) => (luminance(a) >= luminance(b) ? a : b));
        stack.push([lightest[0], lightest[1], lightest[2], 1]);
        break;
      }
    }
    const c = parseColor(cs.backgroundColor);
    if (c && c[3] > 0) {
      stack.push(c);
      if (c[3] === 1) break;
    }
    node = node.parentElement;
  }
  let base: RGBA = [255, 255, 255, 1];
  for (let i = stack.length - 1; i >= 0; i--) base = over(stack[i], base);
  return base;
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
    const o = parseFloat(getComputedStyle(node).opacity);
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
function effectiveContrast(el: Element): number | null {
  const disabled =
    (el as HTMLElement).closest?.("[disabled], [aria-disabled='true']") != null;
  if (disabled) return null;
  const fg = parseColor(getComputedStyle(el).color);
  if (!fg) return null;
  const bg = backdrop(el);
  const dimmed: RGBA = [fg[0], fg[1], fg[2], fg[3] * inheritedOpacity(el)];
  return contrast(dimmed, bg);
}

/** Run every animation to its end so what is measured is the resting state. */
function settleAnimations() {
  for (const a of document.getAnimations()) {
    try {
      a.finish();
    } catch {
      /* an infinite animation cannot be finished; it is decorative */
    }
  }
}

/** WCAG lets large text pass at 3:1. Everything else needs 4.5:1. */
function required(el: Element): number {
  const cs = getComputedStyle(el);
  const px = parseFloat(cs.fontSize);
  const weight = Number(cs.fontWeight) || 400;
  const large = px >= 24 || (px >= 18.66 && weight >= 700);
  return large ? 3 : 4.5;
}


/**
 * Every text surface worth measuring. The list is deliberately long: a palette
 * regression shows up on one selector at a time, and the ones that go first are
 * always the quiet ones — a caption, a line number, a code comment.
 */
const TEXT_SELECTORS = [
  ".lsn-p", ".n-body", ".page-title", ".lsn-h", ".subtitle", ".lsn-note",
  ".card-tag", ".card-body", ".card-idx", ".chip", ".side-label", ".ctx-role",
  ".lsn-stat-k", ".lsn-stat-v", ".lsn-stat-sub", ".scn-line", ".scn-tag",
  ".n-step", ".lsn-take p", ".lsn-take-tag", ".ms-check", ".lsn-choice-hint",
  ".tl-k", ".code-file", ".ln", ".hint", ".len", ".meter-head", ".lsn-sim",
  ".btn", ".btn-primary", ".faq summary", ".tr-bar", ".dl-k", ".lsn-table th",
  ".lsn-table td", ".lang-switch button.on", ".side-link.active .side-label",
  ".f-agent", ".tool-pending", ".card-weight", ".q-lesson", ".ctx-warn",
  ".tr-tag", ".mark-pass", ".mark-fail", ".blank-done", ".run-line",
  ".tk-cmt", ".tk-str", ".tk-kw", ".cl.on .ct", ".sc-caption", ".code-note",
  ".bubble-user", ".bubble-assistant", ".bubble-aside", ".tool-output",
  ".tool-chip-head", ".empty", ".q-feedback", ".cmdk-hint", ".eyebrow",
];

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
  const lowContrast: string[] = [];
  const missingStops: string[] = [];

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
    settleAnimations();
    for (const sel of TEXT_SELECTORS) {
      const el = $(sel);
      if (!el) continue;
      const ratio = effectiveContrast(el);
      if (ratio === null) continue;
      const need = required(el);
      if (ratio < need) {
        lowContrast.push(
          `${doc.dataset.theme}/${sel} ${ratio.toFixed(2)}:1 (needs ${need})`,
        );
      }
    }
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

  // ---- both themes ------------------------------------------------------
  const root = document.documentElement;
  const startedIn = root.dataset.theme;
  for (const theme of ["dark", "light"]) {
    root.dataset.theme = theme;
    await settle(3);
    for (const stop of STOPS.map((x) => x.href)) {
      await go(stop);
      settleAnimations();
      for (const sel of TEXT_SELECTORS) {
        const node = $(sel);
        if (!node) continue;
        const r = effectiveContrast(node);
        if (r === null) continue;
        const need = required(node);
        if (r < need) lowContrast.push(`${theme}${stop}${sel} ${r.toFixed(2)}:1 (needs ${need})`);
      }
    }
  }
  if (startedIn) root.dataset.theme = startedIn;
  const unique = [...new Set(lowContrast)];
  ok(
    unique.length === 0,
    "body text, headings and accents clear their contrast requirement in both themes",
    unique.slice(0, 6).join("; ") || "all pairs pass",
  );

  // ---- window surface ---------------------------------------------------
  const added = Object.keys(window).filter(
    (k) => !globalsBefore.has(k) && k !== "__selftest",
  );
  ok(added.length === 0, "the suite adds nothing to window but its report", added.join(", ") || "none");

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
