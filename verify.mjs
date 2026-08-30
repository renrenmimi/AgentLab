#!/usr/bin/env node
// verify.mjs — static checks over the hand-written bilingual content of AgentLab.
//
// The course is roughly 1,500 lines of prose written twice, once in Chinese and
// once in English, plus the machinery that ties prose to code: line ranges the
// loop page highlights, blanks the build page grades, glossary terms the prose
// refers to. None of that is checked by the TypeScript compiler, and all of it
// is the kind of thing a proofreader misses. This file catches it instead.
//
// Run it with plain `node verify.mjs`. It imports the real content modules
// rather than reading them as text, so a check here fails for the same reason
// the page would break. TypeScript is compiled with the compiler already in
// devDependencies; no new dependency is introduced.

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const ROOT = dirname(fileURLToPath(import.meta.url));
const CACHE = join(ROOT, "node_modules", ".cache", "agentlab-verify");

// ---------------------------------------------------------------- compilation

// Transpile a TS/TSX module and everything it imports into plain .mjs inside a
// cache directory, rewriting local specifiers to point at the compiled copies.
// The cache lives under node_modules so that bare specifiers such as "react"
// still resolve by walking up to the project's own node_modules.
const compiled = new Map();

function resolveSource(spec, fromDir) {
  const base = spec.startsWith("@/")
    ? join(ROOT, spec.slice(2))
    : resolve(fromDir, spec);
  for (const ext of [".ts", ".tsx", ".mjs", ".js", "/index.ts", "/index.tsx"]) {
    if (existsSync(base + ext)) return base + ext;
  }
  return existsSync(base) ? base : null;
}

function compile(absSrc) {
  const done = compiled.get(absSrc);
  if (done) return done;

  const rel = relative(ROOT, absSrc).replace(/\.tsx?$/, ".mjs");
  const outPath = join(CACHE, rel);
  compiled.set(absSrc, outPath); // set before recursing so cycles terminate

  const source = readFileSync(absSrc, "utf8");
  const { outputText } = ts.transpileModule(source, {
    fileName: absSrc,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      verbatimModuleSyntax: false,
    },
  });

  // Rewrite `from "x"` and bare `import "x"` for local modules only.
  const rewritten = outputText.replace(
    /((?:from|import)\s*\(?\s*)(['"])([^'"]+)\2/g,
    (whole, lead, quote, spec) => {
      if (!spec.startsWith("@/") && !spec.startsWith(".")) return whole;
      const depSrc = resolveSource(spec, dirname(absSrc));
      if (!depSrc) return whole;
      const depOut = compile(depSrc);
      let next = relative(dirname(outPath), depOut).split("\\").join("/");
      if (!next.startsWith(".")) next = "./" + next;
      return `${lead}${quote}${next}${quote}`;
    },
  );

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, rewritten);
  return outPath;
}

async function load(relSrc) {
  const out = compile(join(ROOT, relSrc));
  return import(pathToFileURL(out).href);
}

// --------------------------------------------------------------------- report

const problems = [];
const notes = [];
let checksRun = 0;

const fail = (where, message) => problems.push({ where, message });
const note = (message) => notes.push(message);

function check(label, fn) {
  checksRun++;
  const before = problems.length;
  fn();
  const found = problems.length - before;
  const mark = found === 0 ? "\u2713" : "\u2717";
  const tail = found === 0 ? "" : `  (${found} problem${found === 1 ? "" : "s"})`;
  console.log(`  ${mark} ${label}${tail}`);
}

// ----------------------------------------------------------------- generic walk

// Depth-first walk over exported data, tracking a readable path for messages.
function walk(value, path, visit, seen = new WeakSet()) {
  visit(value, path);
  if (value === null || typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);
  if (value instanceof RegExp || value instanceof Date) return;
  if (Array.isArray(value)) {
    value.forEach((v, i) => walk(v, `${path}[${i}]`, visit, seen));
    return;
  }
  for (const [k, v] of Object.entries(value)) {
    walk(v, `${path}.${k}`, visit, seen);
  }
}

const isPlainObject = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v) && !(v instanceof RegExp);

// A value is treated as a bilingual pair if it carries either language key.
const looksBilingual = (v) => isPlainObject(v) && ("zh" in v || "en" in v);

// ------------------------------------------------------------------ the checks

const modules = {
  i18n: await load("lib/i18n.tsx"),
  glossary: await load("lib/glossary.tsx"),
  stops: await load("lib/stops.ts"),
  intro: await load("lib/intro.ts"),
  scenarios: await load("lib/scenarios/index.ts"),
  build: await load("lib/build.ts"),
  cost: await load("lib/cost.ts"),
  context: await load("lib/context.ts"),
  tools: await load("lib/tools.ts"),
  trust: await load("lib/trust.ts"),
  delegate: await load("lib/delegate.ts"),
  measure: await load("lib/measure.ts"),
};

// Every exported value, rooted at a readable name for error messages.
const roots = [
  ["ui", modules.i18n.ui],
  ["glossary", modules.glossary.glossary],
  ["stops", modules.stops.STOPS],
  ["intro.scenes", modules.intro.scenes],
  ["intro.stage", modules.intro.stage],
  ["scenarios", modules.scenarios.scenarios],
  ["build.codeTemplate", modules.build.codeTemplate],
  ["build.blanks", modules.build.blanks],
  ["build.runScript", modules.build.runScript],
];

// 第 4 站往后的每一站结构相同：meta + blocks + bench，外加自己的数据。
for (const name of ["cost", "context", "tools", "trust", "delegate", "measure"]) {
  const mod = modules[name];
  for (const [key, value] of Object.entries(mod)) {
    if (typeof value === "function") continue;
    roots.push([`${name}.${key}`, value]);
  }
}

console.log("AgentLab content checks\n");

// 1. Bilingual completeness ---------------------------------------------------
// Two shapes carry both languages: prose pairs ({ zh: string, en: string }) and
// code snippets ({ zh: string[], en: string[] }). Blank lines are meaningful in
// a snippet, so only prose is required to be non-empty.
check("every bilingual pair has both zh and en, and neither is empty", () => {
  for (const [name, value] of roots) {
    walk(value, name, (v, path) => {
      if (!looksBilingual(v)) return;

      const missing = ["zh", "en"].filter((lang) => !(lang in v));
      if (missing.length) {
        fail(path, `missing ${missing.map((l) => `"${l}"`).join(" and ")} (has ${Object.keys(v).join(", ")})`);
        return;
      }

      const kind = (x) => (Array.isArray(x) ? "lines" : typeof x);
      if (kind(v.zh) !== kind(v.en)) {
        fail(path, `zh is ${kind(v.zh)} but en is ${kind(v.en)}`);
        return;
      }

      if (kind(v.zh) === "lines") {
        if (v.zh.length !== v.en.length) {
          fail(path, `zh has ${v.zh.length} lines, en has ${v.en.length}`);
        }
        for (const lang of ["zh", "en"]) {
          if (v[lang].some((line) => typeof line !== "string")) {
            fail(path, `"${lang}" contains a non-string line`);
          }
          if (v[lang].length === 0) fail(path, `"${lang}" has no lines`);
        }
        return;
      }

      for (const lang of ["zh", "en"]) {
        if (typeof v[lang] !== "string") {
          fail(path, `"${lang}" is ${typeof v[lang]}, expected a string`);
        } else if (v[lang].trim() === "") {
          fail(path, `"${lang}" is empty`);
        }
      }
    });
  }
});

// 2. Glossary ------------------------------------------------------------------
const TERM_RE = /\[\[(\w+):([^\]]+)\]\]/g;
const referencedTerms = new Set();

check("every [[term:label]] reference resolves to a glossary entry", () => {
  const known = new Set(Object.keys(modules.glossary.glossary));
  for (const [name, value] of roots) {
    walk(value, name, (v, path) => {
      if (typeof v !== "string") return;
      for (const m of v.matchAll(TERM_RE)) {
        referencedTerms.add(m[1]);
        if (!known.has(m[1])) fail(path, `unknown glossary term "${m[1]}"`);
        if (m[2].trim() === "") fail(path, `glossary term "${m[1]}" has an empty label`);
      }
      // A malformed marker renders as literal brackets on the page.
      const opens = (v.match(/\[\[/g) || []).length;
      const wellFormed = (v.match(TERM_RE) || []).length;
      if (opens !== wellFormed) {
        fail(path, `malformed glossary marker (${opens} "[[" but ${wellFormed} valid)`);
      }
    });
  }
});

// 2b. Markers, emoji and exclamation marks -------------------------------------
// RichText renders exactly two markers, [[term:label]] and **bold**. Half of
// one of them reaches the reader as literal characters, which is how **bold**
// shipped as asterisks. The voice also rules out emoji and exclamation marks,
// and a rule nobody checks is a rule that comes back.
const TERM_MARKER = /\[\[(\w+):([^\]]+)\]\]/g;
const BOLD_MARKER = /\*\*([^*]+)\*\*/g;
// A gear and a play triangle are interface glyphs rather than emoji; ✓ ✕ ✗ →
// are not pictographic at all and never match this in the first place.
const ALLOWED_GLYPHS = new Set(["⚙", "▶"]);

check("prose carries no unparsed marker, no emoji and no exclamation mark", () => {
  for (const [name, value] of roots) {
    walk(value, name, (v, path) => {
      if (typeof v !== "string") return;

      const stripped = v.replace(TERM_MARKER, "$2").replace(BOLD_MARKER, "$1");
      if (stripped.includes("**")) {
        fail(path, "an unpaired ** would reach the reader as asterisks");
      }
      if (stripped.includes("[[") || stripped.includes("]]")) {
        fail(path, "a malformed [[…]] would reach the reader as brackets");
      }
      // A literal backslash-n is usually a newline someone meant to write and
      // did not, reaching the reader as two characters. Inside a quoted
      // fragment it is the opposite: a line of displayed source code where the
      // escape is the point. So quoted spans are removed before looking.
      const unquoted = v.replace(/"[^"]*"/g, "");
      if (/\\n/.test(unquoted)) {
        fail(path, "a literal \\n outside any quoted code would reach the reader as two characters");
      }

      for (const ch of stripped) {
        if (ALLOWED_GLYPHS.has(ch)) continue;
        if (/\p{Extended_Pictographic}/u.test(ch)) {
          fail(path, `emoji ${JSON.stringify(ch)}; the voice does not use them`);
        }
      }

      // Full-width always; the ASCII one only where it is punctuation rather
      // than part of !== in a line of code.
      if (stripped.includes("！")) fail(path, "an exclamation mark");
      if (/!(?![=])/.test(stripped)) fail(path, "an exclamation mark");
    });
  }
});

// 2c. Emoji in the source, not just in the content ----------------------------
// The content walk sees strings in lib/. A decorative emoji dropped into a
// component would slip past it, so the source files are swept as well. The
// allowed set is small and deliberate: four interface glyphs, and the six
// pictograms that make up the illustrations on stop 1 — a brain for the model,
// padlocks for the things it cannot reach, a hammer for tools. Those are the
// picture rather than the tone, which is the distinction the voice draws.
const SOURCE_GLYPHS = new Set([
  "⚙", "▶", "☾", "☀",
  "🧠", "📁", "🌐", "⌨", "🔒", "🛠",
]);

check("no emoji has crept into a component or a stylesheet", () => {
  const sweep = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (![".next", "node_modules", ".git"].includes(entry.name)) sweep(full);
        continue;
      }
      if (!/\.(tsx?|css)$/.test(entry.name)) continue;
      const lines = readFileSync(full, "utf8").split("\n");
      lines.forEach((line, i) => {
        for (const ch of line) {
          if (SOURCE_GLYPHS.has(ch)) continue;
          if (/\p{Extended_Pictographic}/u.test(ch)) {
            fail(`${relative(ROOT, full)}:${i + 1}`, `emoji ${JSON.stringify(ch)}`);
          }
        }
      });
    }
  };
  sweep(join(ROOT, "app"));
  sweep(join(ROOT, "lib"));
});

// 3. Scenario: prose against code ---------------------------------------------
function checkScenario(label, code, steps) {
  if (code.zh.length !== code.en.length) {
    fail(`${label}.agentCode`, `zh has ${code.zh.length} lines, en has ${code.en.length}`);
  }
  const lineCount = Math.min(code.zh.length, code.en.length);

  steps.forEach((step, i) => {
    const at = `${label}.steps[${i}]`;
    if (!Array.isArray(step.focus) || step.focus.length === 0) {
      fail(at, "focus is empty; the code panel would highlight nothing");
      return;
    }
    for (const range of step.focus) {
      const [a, b] = range;
      if (!Number.isInteger(a) || !Number.isInteger(b)) {
        fail(at, `focus range [${a}, ${b}] is not a pair of integers`);
      } else if (a < 1 || b < a || b > lineCount) {
        fail(at, `focus range [${a}, ${b}] is outside the snippet (1..${lineCount})`);
      }
    }
    // The page advances by rendering steps[cursor + 1].action as the button
    // label, so every step after the first needs one.
    if (i > 0 && !step.action) fail(at, "missing action; the advance button would have no label");
    if (i === 0 && step.action) fail(at, "first step should not have an action");
  });

  // Counters only ever move forward, except across a reset, which is an
  // explicit "same task, different approach, replayed from the start".
  let round = -1;
  let tokens = -1;
  steps.forEach((step, i) => {
    if (step.reset) {
      round = -1;
      tokens = -1;
    }
    if (step.round !== undefined) {
      if (step.round < round) fail(`${label}.steps[${i}]`, `round goes backwards (${round} -> ${step.round})`);
      round = step.round;
    }
    if (step.tokens !== undefined) {
      if (step.tokens < tokens) fail(`${label}.steps[${i}]`, `tokens go backwards (${tokens} -> ${step.tokens})`);
      tokens = step.tokens;
    }
    // A reset clears both panels, so the step doing it has to refill them.
    if (step.reset && !step.chat && !step.msgs) {
      fail(`${label}.steps[${i}]`, "reset clears both panels but this step adds nothing back");
    }
    if (step.meter) {
      const { used, limit } = step.meter;
      if (!(limit > 0)) fail(`${label}.steps[${i}]`, `meter limit is ${limit}`);
      if (used < 0) fail(`${label}.steps[${i}]`, `meter used is ${used}`);
    }
    if (step.stopTone && !step.stopReason) {
      fail(`${label}.steps[${i}]`, "stopTone set without a stopReason to label it");
    }
    if (step.stopTone && !["wait", "done", "bad"].includes(step.stopTone)) {
      fail(`${label}.steps[${i}]`, `unknown stopTone "${step.stopTone}"`);
    }
  });
}

check("no scenario step highlights a line outside its code snippet", () => {
  const seen = new Set();
  modules.scenarios.scenarios.forEach((scenario, i) => {
    const label = `scenarios[${i}] "${scenario.id ?? "?"}"`;
    if (!scenario.id) fail(label, "no id");
    else if (seen.has(scenario.id)) fail(label, `duplicate id "${scenario.id}"`);
    seen.add(scenario.id);

    if (scenario.outcome !== "clean" && scenario.outcome !== "fault") {
      fail(label, `outcome is "${scenario.outcome}", expected "clean" or "fault"`);
    }
    if (!scenario.steps || scenario.steps.length < 2) {
      fail(label, "a scenario needs at least two steps");
      return;
    }
    checkScenario(label, scenario.code, scenario.steps);
  });

  // The default scenario is the one a first-time reader lands on.
  const first = modules.scenarios.scenarios[0];
  if (first && first.outcome !== "clean") {
    fail("scenarios[0]", "the default scenario should be the clean run");
  }
});

// 3b. Prose that cites a line number ------------------------------------------
// The narration says things like "look at line 5" and "lines 24 to 27". Those
// numbers are written by hand against a snippet that gets edited, so they drift.
// Only the range is checkable, not whether the line is the right one.
//
// The narration also cites lines of *other* files ("lib/cart.test.ts line 31"),
// which are not this snippet and must not be checked. Those always follow a
// filename, so a match preceded by something ending in a file extension or a
// colon is skipped.
const LINE_REF_RE = /第\s*(\d+)\s*(?:到\s*(\d+)\s*)?行|lines?\s+(\d+)(?:\s*(?:to|and|-|–)\s*(\d+))?/gi;
const FILE_BEFORE_RE = /(?:\.[a-z]{2,4}|:)\s*$/i;

check("no narration cites a line number the snippet does not have", () => {
  for (const scenario of modules.scenarios.scenarios) {
    const lineCount = Math.min(scenario.code.zh.length, scenario.code.en.length);
    scenario.steps.forEach((step, i) => {
      const prose = [step.narration, step.faq?.a, step.faq?.q].filter(Boolean);
      for (const pair of prose) {
        for (const lang of ["zh", "en"]) {
          const text = pair[lang];
          if (typeof text !== "string") continue;
          for (const m of text.matchAll(LINE_REF_RE)) {
            if (FILE_BEFORE_RE.test(text.slice(Math.max(0, m.index - 24), m.index))) continue;
            for (const raw of [m[1], m[2], m[3], m[4]]) {
              if (raw === undefined) continue;
              const num = Number(raw);
              if (num < 1 || num > lineCount) {
                fail(
                  `scenarios "${scenario.id}".steps[${i}].${lang}`,
                  `prose cites line ${num}, snippet has ${lineCount}`,
                );
              }
            }
          }
        }
      }
    });
  }
});

// 3c. Walking each scenario ---------------------------------------------------
// The loop page shows whatever stateAt() returns for the current step. Walking
// every step of every scenario through the same function is the closest thing
// to pressing the button five times without opening a browser.
check("every scenario step leaves both panels in a sensible state", () => {
  const { stateAt } = modules.scenarios;
  for (const scenario of modules.scenarios.scenarios) {
    let sawContent = false;
    scenario.steps.forEach((step, i) => {
      const at = `scenarios "${scenario.id}".steps[${i}]`;
      const state = stateAt(scenario.steps, i);

      // The array panel numbers its cards messages[0], messages[1], … so the
      // non-system cards have to be countable.
      const indexed = state.msgs.filter((m) => !m.sys).length;
      if (indexed < 0) fail(at, "negative message count");
      if (state.msgs.length > 0) sawContent = true;

      // Once anything has been sent, the chat panel should not be empty again;
      // an empty panel mid-run reads as a bug rather than as a beat.
      if (i > 0 && sawContent && state.msgs.length === 0) {
        fail(at, "the array panel is empty in the middle of a run");
      }
      if (state.tokens < 0) fail(at, `tokens is ${state.tokens}`);
    });

    const last = stateAt(scenario.steps, scenario.steps.length - 1);
    if (last.chat.length === 0) fail(`scenarios "${scenario.id}"`, "the run ends with an empty chat panel");
    if (last.msgs.length === 0) fail(`scenarios "${scenario.id}"`, "the run ends with an empty array panel");
  }
});

// 4. Intro --------------------------------------------------------------------
check("every intro scene after the first has a button label", () => {
  modules.intro.scenes.forEach((scene, i) => {
    if (i > 0 && !scene.action) fail(`intro.scenes[${i}]`, "missing action");
    if (i === 0 && scene.action) fail("intro.scenes[0]", "first scene should not have an action");
  });
});

// 5. Build blanks --------------------------------------------------------------
check("every build blank has an answer, a hint and a wrong-answer correction", () => {
  const { blanks, codeTemplate, normalize } = modules.build;

  const holes = (lines) => {
    const found = [];
    for (const line of lines) {
      for (const m of line.matchAll(/\{\{(\d+)\}\}/g)) found.push(Number(m[1]));
    }
    return found;
  };
  const zhHoles = holes(codeTemplate.zh);
  const enHoles = holes(codeTemplate.en);
  if (zhHoles.join(",") !== enHoles.join(",")) {
    fail("build.codeTemplate", `zh holes [${zhHoles}] do not match en holes [${enHoles}]`);
  }
  const expected = blanks.map((_, i) => i).join(",");
  if ([...zhHoles].sort((a, b) => a - b).join(",") !== expected) {
    fail("build.codeTemplate", `holes [${zhHoles}] do not cover blanks 0..${blanks.length - 1}`);
  }

  blanks.forEach((blank, i) => {
    const at = `build.blanks[${i}]`;
    if (!Array.isArray(blank.answers) || blank.answers.length === 0) {
      fail(at, "no accepted answers");
    } else if (blank.answers.some((a) => typeof a !== "string" || a.trim() === "")) {
      fail(at, "an accepted answer is empty");
    }
    if (!blank.hint) fail(at, "no hint");
    if (!blank.display || blank.display.trim() === "") fail(at, "no display form");
    if (!Array.isArray(blank.wrong) || blank.wrong.length === 0) {
      fail(at, "no wrong-answer correction");
    }

    // What gets written into the code after a correct answer must itself be a
    // correct answer, or the reader is shown something the grader would reject.
    const accepted = (blank.answers || []).map(normalize);
    if (blank.display && !accepted.includes(normalize(blank.display))) {
      fail(at, `display "${blank.display}" is not among the accepted answers`);
    }

    // A wrong-answer pattern that also matches a correct answer would tell a
    // reader who is right that they are wrong.
    for (const [w, wrong] of (blank.wrong || []).entries()) {
      for (const answer of accepted) {
        if (wrong.test.test(answer)) {
          fail(`${at}.wrong[${w}]`, `pattern ${wrong.test} matches the correct answer "${answer}"`);
        }
        wrong.test.lastIndex = 0;
      }
    }
  });
});

// 5b. Each stop from 4 onward has the same three parts ------------------------
check("every lesson stop has a title, a subtitle, a takeaway and some prose", () => {
  for (const name of ["cost", "context", "tools", "trust", "delegate", "measure"]) {
    const mod = modules[name];
    for (const key of ["title", "subtitle", "takeaway"]) {
      if (!mod.meta?.[key]) fail(`${name}.meta`, `missing ${key}`);
    }
    if (!Array.isArray(mod.blocks) || mod.blocks.length === 0) {
      fail(`${name}.blocks`, "no prose blocks");
      continue;
    }
    mod.blocks.forEach((b, i) => {
      if (!b.title) fail(`${name}.blocks[${i}]`, "no title");
      if (!Array.isArray(b.paras) || b.paras.length === 0) {
        fail(`${name}.blocks[${i}]`, "no paragraphs");
      }
    });
  }
});

// 5c. Claims the prose makes about its own numbers ----------------------------
// These pages state results out loud — the curve bends, caching wins from round
// two, truncation drops the task, the change is worth one point. Each of those
// is computed by an exported function, so each of them can be checked rather
// than believed.
check("the numbers each lesson claims are the numbers its own model produces", () => {
  // /cost: the cumulative curve is convex, with and without caching.
  const { ASSUMPTIONS, runCost, MAX_ROUNDS } = modules.cost;
  for (const cached of [false, true]) {
    const { cumulative } = runCost(ASSUMPTIONS, MAX_ROUNDS, { cached });
    const secondDiffs = cumulative
      .slice(2)
      .map((v, i) => v - 2 * cumulative[i + 1] + cumulative[i]);
    if (!secondDiffs.every((d) => d > 0)) {
      fail("cost", `the ${cached ? "cached" : "uncached"} curve is not convex; the page says it bends`);
    }
  }
  // The page says caching costs more at one round and less from two onward.
  const one = {
    plain: runCost(ASSUMPTIONS, 1, { cached: false }).total,
    cached: runCost(ASSUMPTIONS, 1, { cached: true }).total,
  };
  if (!(one.cached > one.plain)) fail("cost", "the page says caching costs more at round 1; it does not");
  for (const n of [2, 5, 40]) {
    const plain = runCost(ASSUMPTIONS, n, { cached: false }).total;
    const cached = runCost(ASSUMPTIONS, n, { cached: true }).total;
    if (!(cached < plain)) fail("cost", `the page says caching wins from round 2; at ${n} rounds it does not`);
  }

  // /context: refusing sends nothing; the other two have to fit, and the page
  // says in as many words that truncation is the one that loses the task.
  const ctx = modules.context;
  const truncated = ctx.apply("truncate", ctx.conversation, ctx.LIMIT);
  const summarised = ctx.apply("summarise", ctx.conversation, ctx.LIMIT);
  if (ctx.totalTokens(ctx.conversation) <= ctx.LIMIT) {
    fail("context", "the example conversation fits; the whole stop assumes it does not");
  }
  for (const [name, out] of [["truncate", truncated], ["summarise", summarised]]) {
    if (!out.fits) fail("context", `${name} does not bring the conversation under the limit`);
    if (out.total > ctx.LIMIT) fail("context", `${name} leaves ${out.total} tokens against a ${ctx.LIMIT} limit`);
  }
  if (!truncated.lostTask) fail("context", "the page says truncation drops the task; it does not");
  if (summarised.lostTask) fail("context", "the page says summarising keeps the task; it does not");

  // /measure: the arithmetic on the page has to be the arithmetic in the table.
  const ms = modules.measure;
  const v1 = ms.score("v1");
  const v2 = ms.score("v2");
  if (v2 - v1 !== ms.fixed().length - ms.broke().length) {
    fail("measure", `score delta ${v2 - v1} does not equal fixed ${ms.fixed().length} minus broken ${ms.broke().length}`);
  }
  if (ms.fixed().length === 0 || ms.broke().length === 0) {
    fail("measure", "the stop needs both a fix and a regression to make its point");
  }
  for (const task of ms.tasks) {
    if (task.v1 !== task.v2 && !task.why) {
      fail(`measure.tasks[#${task.id}]`, "flipped between versions with no explanation");
    }
    if (task.v1 === task.v2 && task.why) {
      fail(`measure.tasks[#${task.id}]`, "explains a change that did not happen");
    }
  }

  // /tools: each case needs one bad side and one good side to compare.
  for (const c of modules.tools.cases) {
    if (c.vague.good) fail(`tools "${c.id}"`, "the vague side is marked good");
    if (!c.precise.good) fail(`tools "${c.id}"`, "the precise side is not marked good");
  }

  // /trust: the page divides measures into wording and structural, and says
  // there are some of each.
  const strengths = new Set(modules.trust.mitigations.map((m) => m.strength));
  for (const s of ["text", "structural"]) {
    if (!strengths.has(s)) fail("trust", `no mitigation marked "${s}", but the prose contrasts the two`);
  }
});

// 6. Routes --------------------------------------------------------------------
check("every stop in the sidebar has a page, and every page is a stop", () => {
  const pageFor = (href) =>
    href === "/" ? join(ROOT, "app", "page.tsx") : join(ROOT, "app", href.slice(1), "page.tsx");

  const listed = new Set();
  for (const stop of modules.stops.STOPS) {
    listed.add(stop.href);
    if (!existsSync(pageFor(stop.href))) {
      fail(`stops "${stop.href}"`, `no page at ${relative(ROOT, pageFor(stop.href))}`);
    }
  }

  // The reverse: a page nobody can navigate to is a page nobody will read.
  const appDir = join(ROOT, "app");
  for (const entry of readdirSync(appDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (!existsSync(join(appDir, entry.name, "page.tsx"))) continue;
    const href = `/${entry.name}`;
    if (!listed.has(href)) fail(`app/${entry.name}/page.tsx`, `route ${href} is not in the sidebar`);
  }
  if (existsSync(join(appDir, "page.tsx")) && !listed.has("/")) {
    fail("app/page.tsx", "route / is not in the sidebar");
  }
});

// --------------------------------------------------------------------- summary

const unused = Object.keys(modules.glossary.glossary).filter((k) => !referencedTerms.has(k));
if (unused.length) note(`glossary entries never referenced in prose: ${unused.join(", ")}`);

console.log("");
for (const message of notes) console.log(`  note: ${message}`);
if (notes.length) console.log("");

rmSync(CACHE, { recursive: true, force: true });

if (problems.length === 0) {
  console.log(`${checksRun} checks passed.`);
  process.exit(0);
}

console.log(`${problems.length} problem${problems.length === 1 ? "" : "s"}:\n`);
for (const { where, message } of problems) console.log(`  ${where}: ${message}`);
console.log("");
process.exit(1);
