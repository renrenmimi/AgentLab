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

// ------------------------------------------------------------- counted guards
//
// The sibling project found a block of assertions appended after this file's
// process.exit. Nothing failed, because nothing ran. The only symptom was that
// the printed count did not move, and nobody was reading the count. A check that
// does not run has to be louder than that, so the numbers are declared here and
// compared against both what the source contains and what actually executed.
//
// Editing an assertion means editing a number below. That is deliberate: the
// change then appears in the diff, where a reviewer can see it.
const EXPECTED = {
  // Counted as they run, so a check nobody calls lowers this.
  checks: 21,
  // Counted out of this file's own source, so an assertion appended after the
  // exit below raises this even though it never executes. This went from 137 to
  // 150 without an assertion being added: the tokenizer used to lose sync on a
  // regular expression containing a quote and stopped counting from there. The
  // guard was under-counting itself.
  failSites: 154,
  // The same two ideas for the in-page suite, which CI cannot run. Its source is
  // read as text here; its own copy of the total is compared at run time.
  suiteOkSites: 112,
  suiteAssertions: 119,
};

// Count call sites of a named function, ignoring comments, string literals and
// regular expressions, so that prose about ok() or fail() is not mistaken for a
// call. Written by hand rather than with one big regular expression because both
// files discuss their own assertions in their own comments.
//
// Regular expressions are skipped because they are the case that broke this. A
// literal such as /^["']|["']$/ contains a quote, and a tokenizer that does not
// know it is inside a regex reads that quote as the start of a string and loses
// sync with the rest of the file. The count then came back as zero, which the
// guard reported honestly and uselessly. A zero is now its own message.
function callSites(source, name) {
  let code = "";
  let previous = "";
  const canPrecedeRegex = /[(,=:[!&|?{};+\-*%~^<>\n]/;
  for (let i = 0; i < source.length; ) {
    const c = source[i];
    const d = source[i + 1];
    if (c === "/" && d === "/") {
      while (i < source.length && source[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && d === "*") {
      i += 2;
      while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    if (c === "/" && (previous === "" || canPrecedeRegex.test(previous))) {
      i++;
      let inClass = false;
      while (i < source.length) {
        const ch = source[i];
        if (ch === "\\") {
          i += 2;
          continue;
        }
        if (ch === "[") inClass = true;
        else if (ch === "]") inClass = false;
        else if (ch === "/" && !inClass) break;
        else if (ch === "\n") break;
        i++;
      }
      i++;
      code += "0";
      previous = "0";
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      i++;
      while (i < source.length && source[i] !== c) i += source[i] === "\\" ? 2 : 1;
      i++;
      code += '""';
      previous = '"';
      continue;
    }
    code += c;
    if (c.trim() !== "") previous = c;
    i++;
  }
  const found = (code.match(new RegExp(`(?<![\\w.$])${name}\\(`, "g")) || []).length;
  if (found === 0 && source.includes(`${name}(`)) {
    throw new Error(
      `callSites lost sync counting ${name}(): the source plainly contains it and ` +
        `the tokenizer found none. A construct in that file is being read as a string.`,
    );
  }
  return found;
}

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
  measure: await load("lib/measure.ts"),
  permission: await load("lib/permission.ts"),
  chance: await load("lib/chance.ts"),
  invent: await load("lib/invent.ts"),
  instructions: await load("lib/instructions.ts"),
  again: await load("lib/again.ts"),
  next: await load("lib/next.ts"),
  checks: await load("lib/checks.ts"),
  course: await load("lib/course.ts"),
  meta: await load("lib/meta.ts"),
  order: await load("lib/order.ts"),
};

// Every exported value, rooted at a readable name for error messages.
const roots = [
  ["ui", modules.i18n.ui],
  ["glossary", modules.glossary.glossary],
  ["stops", modules.stops.STOPS],
  ["groups", modules.stops.GROUPS],
  ["checks", modules.checks.checks],
  ["seo", modules.meta.SEO],
  ["site", modules.meta.SITE],
  ["intro.scenes", modules.intro.scenes],
  ["intro.stage", modules.intro.stage],
  ["scenarios", modules.scenarios.scenarios],
  ["build.codeTemplate", modules.build.codeTemplate],
  ["build.blanks", modules.build.blanks],
  ["build.runScript", modules.build.runScript],
];

// 第 4 站往后的每一站结构相同：meta + blocks + bench，外加自己的数据。
const LESSON_STOPS = [
  "chance", "invent", "instructions", "tools",
  "cost", "context",
  "trust", "permission", "again", "measure", "next",
];
for (const name of LESSON_STOPS) {
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

check("every [[term:label]] and [[stop:/href]] reference resolves", () => {
  const known = new Set(Object.keys(modules.glossary.glossary));
  const hrefs = new Set(modules.stops.STOPS.map((s) => s.href));
  for (const [name, value] of roots) {
    walk(value, name, (v, path) => {
      if (typeof v !== "string") return;
      for (const m of v.matchAll(TERM_RE)) {
        // A cross-reference to another stop, whose number is computed from the
        // reading order rather than written down.
        if (m[1] === "stop") {
          if (!hrefs.has(m[2])) fail(path, `cross-reference to "${m[2]}", which is not a stop`);
          continue;
        }
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

// 2d. No stop number written by hand ------------------------------------------
// Reordering the course once already left twelve page titles and a hundred-odd
// references pointing at the wrong stop. Numbers are computed from lib/stops.ts
// now, and prose that writes one down is the way that comes back.
check("no prose writes a stop number by hand", () => {
  const BARE = /第\s*\d+\s*站|\bstops?\s+\d+\b/i;
  for (const [name, value] of roots) {
    walk(value, name, (v, path) => {
      if (typeof v !== "string") return;
      if (BARE.test(v)) {
        fail(path, "writes a stop number by hand; use [[stop:/href]] so it follows the order");
      }
    });
  }
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
  for (const name of LESSON_STOPS) {
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

  // /permission: the whole stop turns on the run diverging, so the three
  // branches have to actually differ and one of them has to overshoot.
  const pm = modules.permission;
  if (!pm.prelude.at(-1)?.effect) {
    fail("permission.prelude", "the run should stop on a beat marked as having a side effect");
  }
  const ids = pm.branches.map((b) => b.id).sort().join(",");
  if (ids !== "always,once,refuse") fail("permission.branches", `branch ids are ${ids}`);
  for (const b of pm.branches) {
    if (!b.beats?.length) fail(`permission "${b.id}"`, "no beats, so choosing it changes nothing");
    if (!b.commits) fail(`permission "${b.id}"`, "does not say what was approved");
    if (!b.verdict) fail(`permission "${b.id}"`, "does not say what it costs");
  }
  if (pm.branches.filter((b) => b.tone === "bad").length !== 1) {
    fail("permission.branches", "exactly one branch should be the one that overshoots");
  }
  if (!pm.branches.find((b) => b.id === "always")?.beats.some((x) => x.bad)) {
    fail("permission.always", "the always branch needs the beat that happens without you");
  }

  // /chance: the whole stop rests on the distribution behaving as described —
  // deterministic at zero, and never certain above it.
  const ch = modules.chance;
  const atZero = ch.distribution(0);
  if (atZero.filter((p) => p > 0).length !== 1) {
    fail("chance", "at temperature 0 the page says one path is always taken");
  }
  for (const temp of [0.3, 0.7, 1]) {
    const d = ch.distribution(temp);
    const sum = d.reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1) > 1e-9) fail("chance", `distribution at ${temp} sums to ${sum}`);
    if (d.some((p) => p <= 0)) fail("chance", `at ${temp} some path is impossible; the page says all are reachable`);
  }
  // Warmer has to mean flatter, or the temperature control means nothing.
  const top = (temp) => Math.max(...ch.distribution(temp));
  if (!(top(0.3) > top(0.7) && top(0.7) > top(1))) {
    fail("chance", "raising the temperature does not flatten the distribution");
  }
  if (!ch.outcomes.some((o) => o.kind === "wrong") || !ch.outcomes.some((o) => o.kind === "good")) {
    fail("chance.outcomes", "the tally needs both a good path and a bad one to make its point");
  }
  // The sampler has to be reproducible, or the page and this check disagree.
  if (ch.sample(0.7, 12).id !== ch.sample(0.7, 12).id) {
    fail("chance.sample", "the same seed gives different answers");
  }

  // /invent: every question needs a wrong answer without tools and a checkable
  // one with them, or the comparison the stop is built on does not exist.
  for (const q of modules.invent.questions) {
    if (q.without.ok) fail(`invent "${q.id}"`, "the no-tools answer is marked as sound");
    if (!q.with.ok) fail(`invent "${q.id}"`, "the with-tools answer is not marked as sound");
    if (!q.with.via) fail(`invent "${q.id}"`, "does not say which tool it looked at");
  }

  // /instructions: the three conditions have to differ in the way the prose
  // claims — one sends the mail, one is told not to, one cannot.
  const ins = modules.instructions;
  const loose = ins.setups.find((x) => x.id === "loose");
  const told = ins.setups.find((x) => x.id === "told");
  const removed = ins.setups.find((x) => x.id === "removed");
  if (!loose?.beats.some((b) => b.bad)) fail("instructions.loose", "nothing goes wrong in the loose run");
  if (told?.beats.some((b) => b.bad)) fail("instructions.told", "the told run should not go wrong");
  if (!loose?.tools.includes("send_email")) fail("instructions.loose", "needs the outbound tool");
  if (!told?.tools.includes("send_email")) {
    fail("instructions.told", "the point is that the tool is still there");
  }
  if (removed?.tools.includes("send_email")) {
    fail("instructions.removed", "the point is that the tool is gone");
  }
  const bill = ins.systemBill(40);
  if (!(bill.dollars > 0) || bill.sentTimes !== 40) {
    fail("instructions.systemBill", `bill is ${JSON.stringify(bill)}`);
  }

  // /again: the stop turns on one failure mode being certain and two not, and
  // on there being both kinds of tool to compare.
  const ag = modules.again;
  const certain = ag.failures.filter((f) => f.certain);
  if (certain.length !== 1) {
    fail("again.failures", `${certain.length} failures are certain; the stop says exactly one is`);
  }
  if (!ag.tools.some((x) => x.idempotent) || !ag.tools.some((x) => !x.idempotent)) {
    fail("again.tools", "the comparison needs both a repeatable tool and one that is not");
  }
  for (const tool of ag.tools) {
    if (!tool.idempotent && !tool.fix) {
      fail(`again "${tool.name}"`, "is unsafe to repeat and offers no fix");
    }
    if (tool.idempotent && tool.fix) {
      fail(`again "${tool.name}"`, "is safe to repeat but offers a fix, which reads as a contradiction");
    }
  }
  // Backing off has to actually back off.
  for (let n = 1; n < ag.MAX_ATTEMPTS - 1; n++) {
    if (!(ag.backoffMs(n + 1) > ag.backoffMs(n))) {
      fail("again.backoffMs", `attempt ${n + 1} does not wait longer than ${n}`);
    }
  }
  if (!(ag.totalWaitMs(ag.MAX_ATTEMPTS) > ag.backoffMs(1))) {
    fail("again.totalWaitMs", "the cumulative wait is not the sum of the gaps");
  }

  // /next: a closing stop that does not say why something was left out is a
  // list of links rather than an ending.
  for (const area of modules.next.areas) {
    for (const key of ["what", "why", "where"]) {
      if (!area[key]) fail(`next "${area.id}"`, `does not say ${key}`);
    }
  }
  if (!modules.next.areas.some((a) => a.link)) {
    fail("next.areas", "nothing to actually go and look at");
  }

  // /trust: the page divides measures into wording and structural, and says
  // there are some of each.
  const strengths = new Set(modules.trust.mitigations.map((m) => m.strength));
  for (const s of ["text", "structural"]) {
    if (!strengths.has(s)) fail("trust", `no mitigation marked "${s}", but the prose contrasts the two`);
  }
});

// 5d. The reading order ---------------------------------------------------------
// Fourteen stops is a path rather than a list, and a path has to be complete:
// every stop in exactly one group, every group naming a reason it follows the
// one before it, and no href in a group that is not a stop.
check("every stop sits in exactly one group, and every group says why it follows", () => {
  const { GROUPS, STOPS } = modules.stops;
  const seen = new Map();
  for (const [i, group] of GROUPS.entries()) {
    if (!group.name) fail(`groups[${i}]`, "no name");
    if (!group.why) fail(`groups[${i}]`, "does not say why it follows the group before it");
    if (!group.hrefs.length) fail(`groups[${i}]`, "is empty");
    for (const href of group.hrefs) {
      if (seen.has(href)) fail(`groups[${i}]`, `"${href}" is also in group ${seen.get(href)}`);
      seen.set(href, i);
    }
  }
  for (const stop of STOPS) {
    if (!seen.has(stop.href)) fail(`stops "${stop.href}"`, "is in no group");
    if (!stop.label) fail(`stops "${stop.href}"`, "has no label");
  }
  if (seen.size !== STOPS.length) {
    fail("groups", `groups cover ${seen.size} hrefs for ${STOPS.length} stops`);
  }
  // The numbers a reader sees have to run 1..n in order.
  const glyphs = STOPS.map((s) => s.glyph).join(",");
  const expected = STOPS.map((_, i) => String(i + 1)).join(",");
  if (glyphs !== expected) fail("stops", `numbering is ${glyphs}`);
});

// 5e. Figures written into the prose ------------------------------------------
// Several stops quote a number in a sentence — a total, a token count, a score.
// Those were computed once, by hand, and then the model changed underneath them
// twice. Each claim below names the sentence and the function that produces the
// figure, so the prose cannot drift away from the page.
check("every figure quoted in prose is the figure the page computes", () => {
  const claims = [];

  // /cost — the caching paragraph and the pasted-document paragraph.
  {
    const { ASSUMPTIONS, MAX_ROUNDS, runCost, money } = modules.cost;
    const plain = runCost(ASSUMPTIONS, MAX_ROUNDS, { cached: false }).total;
    const cached = runCost(ASSUMPTIONS, MAX_ROUNDS, { cached: true }).total;
    const doc = runCost(ASSUMPTIONS, MAX_ROUNDS, { cached: false, extra: 20000 }).total;
    const docAlone = (20000 * ASSUMPTIONS.priceIn) / 1e6;
    const caching = modules.cost.blocks[1].paras[1];
    const paste = modules.cost.blocks[2].paras[0];
    claims.push(
      ["cost caching, zh", caching.zh, [money(plain), money(cached)]],
      ["cost caching, en", caching.en, [money(plain), money(cached)]],
      ["cost document, zh", paste.zh, [money(plain), money(doc), money(doc - plain)]],
      ["cost document, en", paste.en, [money(plain), money(doc), money(doc - plain)]],
    );
    // The "about four and a half times" claim, checked as a ratio.
    const ratio = plain / cached;
    if (!(ratio > 4.3 && ratio < 4.8)) {
      fail("cost", `caching saves ${ratio.toFixed(2)}x; the prose says about four and a half`);
    }
    if (Math.abs(docAlone - 0.06) > 0.005) {
      fail("cost", `the document costs ${docAlone.toFixed(3)} once; the prose says six cents`);
    }
  }

  // /context — the conversation is 1,210 tokens against a 1,000 window.
  {
    const total = modules.context.totalTokens(modules.context.conversation);
    const limit = modules.context.LIMIT;
    const p = modules.context.blocks[1].paras[0];
    claims.push(
      ["context sizes, zh", p.zh, [total.toLocaleString("en-US"), limit.toLocaleString("en-US")]],
      ["context sizes, en", p.en, [total.toLocaleString("en-US"), limit.toLocaleString("en-US")]],
    );
  }

  // /measure — the net result of the prompt change.
  {
    const v1 = modules.measure.score("v1");
    const v2 = modules.measure.score("v2");
    const p = modules.measure.blocks[2].paras[1];
    claims.push(
      ["measure score, zh", p.zh, [`${v1} → ${v2}`]],
      ["measure score, en", p.en, [`${v1} to ${v2}`]],
    );
  }

  // /instructions — the length of the system prompt it prices.
  {
    const tokens = modules.instructions.SYSTEM_TOKENS;
    const p = modules.instructions.blocks[1].paras[0];
    claims.push(
      ["instructions prompt length, zh", p.zh, [String(tokens)]],
      ["instructions prompt length, en", p.en, [String(tokens)]],
    );
  }

  for (const [label, text, wanted] of claims) {
    if (typeof text !== "string") {
      fail(label, "the sentence this claim points at is missing");
      continue;
    }
    for (const figure of wanted) {
      if (!text.includes(figure)) {
        fail(label, `does not contain ${figure}, which is what the page computes`);
      }
    }
  }
});

// 5f. Links to stops that no longer exist --------------------------------------
// Folding a stop into another leaves references behind. The content walk catches
// [[stop:…]] markers, but a plain href in a component would survive, and so
// would a stale route directory. Both are swept here.
check("nothing links to a route that is not a stop", () => {
  const stops = new Set([
    ...modules.stops.STOPS.map((s) => s.href),
    ...modules.stops.VIEWS,
  ]);
  const external = /^(https?:|mailto:|#|\/api\/)/;
  const sweep = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (![".next", "node_modules", ".git"].includes(entry.name)) sweep(full);
        continue;
      }
      if (!/\.tsx?$/.test(entry.name)) continue;
      const lines = readFileSync(full, "utf8").split("\n");
      lines.forEach((line, i) => {
        for (const m of line.matchAll(/href=(?:"([^"]+)"|\{"([^"]+)"\})/g)) {
          const href = m[1] ?? m[2];
          if (external.test(href)) continue;
          if (!href.startsWith("/")) continue;
          if (!stops.has(href)) {
            fail(`${relative(ROOT, full)}:${i + 1}`, `links to "${href}", which is not a stop`);
          }
        }
      });
    }
  };
  sweep(join(ROOT, "app"));
  sweep(join(ROOT, "lib"));
});

// 5g. The group checks ---------------------------------------------------------
// The rule these questions live by is that a reader who skimmed gets them
// wrong, which is not checkable. What is checkable is everything that would
// make a question useless: no correct answer, two correct answers, a wrong
// answer with nothing to say, or a distractor that repeats the right one.
check("every group check is answerable and every wrong answer says why", () => {
  const { checks } = modules.checks;
  const stops = modules.stops.STOPS.map((s) => s.href);
  const groups = modules.stops.GROUPS;

  if (checks.length !== groups.length) {
    fail("checks", `${checks.length} checks for ${groups.length} groups`);
  }

  const seenIds = new Set();
  for (const c of checks) {
    const at = `checks "${c.id}"`;
    if (seenIds.has(c.id)) fail(at, "duplicate id");
    seenIds.add(c.id);
    if (!stops.includes(c.on)) fail(at, `sits on "${c.on}", which is not a stop`);

    // A group's check belongs at the end of that group, not in the middle of
    // it. The closing stop is the exception: /next says where the course stops
    // and where to go, so it is an epilogue rather than a lesson, and a check
    // after it would be testing material it does not teach.
    const EPILOGUE = "/next";
    const group = groups.find((g) => g.hrefs.includes(c.on));
    if (!group) fail(at, `"${c.on}" is in no group`);
    else {
      const teaching = group.hrefs.filter((h) => h !== EPILOGUE);
      if (teaching[teaching.length - 1] !== c.on) {
        fail(at, `"${c.on}" is not the last teaching stop of its group`);
      }
    }

    if (c.questions.length < 2 || c.questions.length > 3) {
      fail(at, `${c.questions.length} questions; the design says two or three`);
    }
    if (!c.questions.some((q) => q.kind === "judgement")) {
      fail(at, "no judgement question, so skimming would be enough to pass it");
    }

    const qIds = new Set();
    for (const q of c.questions) {
      const qAt = `${at}.${q.id}`;
      if (qIds.has(q.id)) fail(qAt, "duplicate question id");
      qIds.add(q.id);

      const correct = q.options.filter((o) => o.correct);
      if (correct.length !== 1) fail(qAt, `${correct.length} correct answers; exactly one is required`);
      if (q.options.length < 3) fail(qAt, `${q.options.length} options is not a choice`);
      if (!q.afterward) fail(qAt, "nothing said after a correct answer");

      const optIds = new Set();
      for (const o of q.options) {
        if (optIds.has(o.id)) fail(qAt, `duplicate option id "${o.id}"`);
        optIds.add(o.id);
        if (o.correct) {
          if (o.correction) fail(`${qAt}.${o.id}`, "the correct answer carries a correction");
          continue;
        }
        if (!o.correction) {
          fail(`${qAt}.${o.id}`, 'a wrong answer with nothing to say teaches nothing');
        }
      }

      // A distractor that reads the same as the right answer in either
      // language is not a distractor. Both languages are checked because a
      // translation can collapse a distinction the original kept.
      for (const lang of ["zh", "en"]) {
        const seen = new Map();
        for (const o of q.options) {
          const text = (o.text?.[lang] ?? "").trim();
          if (!text) fail(`${qAt}.${o.id}`, `empty option text in ${lang}`);
          if (seen.has(text)) {
            fail(qAt, `options "${o.id}" and "${seen.get(text)}" read identically in ${lang}`);
          }
          seen.set(text, o.id);
        }
      }
    }
  }

  // No scoring anywhere: the design says a reader should find something out,
  // not collect a number.
  for (const [key, value] of Object.entries(modules.i18n.ui.check)) {
    const text = `${value.zh ?? ""} ${value.en ?? ""}`;
    if (/\bscore\b|\bstreak\b|得分|连对|积分/i.test(text)) {
      fail(`ui.check.${key}`, "reads as scoring, which this is deliberately not");
    }
  }
});

// 5h. The glossary keeps up with the course -----------------------------------
// A glossary is easy to leave behind: the course grows, the dictionary does not.
// Each entry declares the stop where its term first appears, and this check
// insists that the marker is actually there — and that nothing marks it earlier,
// which would mean the entry names the wrong stop.
check("every glossary term is marked where it first appears", () => {
  const { glossary } = modules.glossary;
  const order = modules.stops.STOPS.map((s) => s.href);

  // Which stops mark which terms, taken from the same course view /all uses.
  const marks = new Map();
  const record = (href, text) => {
    for (const m of String(text).matchAll(/\[\[(\w+):/g)) {
      if (m[1] === "stop") continue;
      if (!marks.has(m[1])) marks.set(m[1], new Set());
      marks.get(m[1]).add(href);
    }
  };
  for (const stop of modules.course.COURSE) {
    for (const section of stop.sections) {
      for (const para of section.paras) {
        record(stop.href, para.zh);
        record(stop.href, para.en);
      }
      record(stop.href, section.heading.zh);
      record(stop.href, section.heading.en);
    }
  }

  for (const [key, entry] of Object.entries(glossary)) {
    if (!entry.firstAt) {
      fail(`glossary.${key}`, "does not say where the term first appears");
      continue;
    }
    if (!order.includes(entry.firstAt)) {
      fail(`glossary.${key}`, `firstAt "${entry.firstAt}" is not a stop`);
      continue;
    }
    const seen = marks.get(key);
    if (!seen || seen.size === 0) {
      fail(`glossary.${key}`, "is defined but never marked in the prose");
      continue;
    }
    const earliest = order.find((href) => seen.has(href));
    if (earliest !== entry.firstAt) {
      fail(
        `glossary.${key}`,
        `first marked at "${earliest}" but declares firstAt "${entry.firstAt}"`,
      );
    }
  }
});

// 5i. What a shared link says -------------------------------------------------
// A title and a description are the only thing anyone sees before deciding to
// open a page. Templated ones ("AgentLab — /cost") say nothing, so each is
// written by hand — and the way to keep them written by hand is to fail when
// two of them read alike.
check("every stop has its own title and description, and none is a template", () => {
  const { SEO } = modules.meta;
  const routes = [...modules.stops.STOPS.map((s) => s.href), ...modules.stops.VIEWS];

  for (const href of routes) {
    const seo = SEO[href];
    if (!seo) {
      fail(`meta.SEO`, `"${href}" has no title or description`);
      continue;
    }
    for (const lang of ["zh", "en"]) {
      const d = seo.description?.[lang] ?? "";
      if (d.length < 40) {
        fail(`meta.SEO["${href}"].description.${lang}`, `${d.length} characters is a label, not a reason to open it`);
      }
      if (d.includes(href)) {
        fail(`meta.SEO["${href}"].description.${lang}`, "repeats the route, which reads as a template");
      }
    }
  }

  for (const lang of ["zh", "en"]) {
    for (const field of ["title", "description"]) {
      const seen = new Map();
      for (const href of routes) {
        const value = SEO[href]?.[field]?.[lang];
        if (!value) continue;
        if (seen.has(value)) {
          fail(`meta.SEO`, `"${href}" and "${seen.get(value)}" share a ${field} in ${lang}`);
        }
        seen.set(value, href);
      }
    }
  }

  // The reading order lives in one place, and lib/stops.ts builds on it.
  const fromOrder = modules.order.HREFS.join(",");
  const fromStops = modules.stops.STOPS.map((s) => s.href).join(",");
  if (fromOrder !== fromStops) {
    fail("order", `lib/order.ts and lib/stops.ts disagree:\n    ${fromOrder}\n    ${fromStops}`);
  }
});

// 7. No going back to a hand-written list of surfaces --------------------------
// The contrast check used to be fed by TEXT_SELECTORS, sixty class names typed
// out by hand. It reported a perfect score while seventeen of them matched no
// element, because a selector that matches nothing is skipped rather than
// reported: it was measuring forty-three surfaces and passing sixty, and three
// published defects sat in the gap. A list does not go red when it goes stale.
//
// It has been replaced by a traversal, and the danger now is that it comes back
// as a second opinion — a fallback, a belt-and-braces pass, a short list of
// "important" surfaces checked twice. Two mechanisms mean the stale one keeps
// voting. So a list of appearance selectors in that file is a failure here, by
// shape rather than by name, and the exceptions are written down.
//
// A name may be added to this table, but adding it is an edit to this file, in a
// diff somebody reads, with a reason attached.
const SELECTOR_LISTS_ALLOWED = {
  STATE_SELECTORS:
    "elements that report a state, which cannot be traversed for because a tag " +
    "carrying a meaning is structurally identical to one carrying none. Covered " +
    "by an assertion that every name in it still matches something.",
};

check("the contrast check is not fed by a list of selectors again", () => {
  const suite = readFileSync(join(ROOT, "app", "selftest-suite.ts"), "utf8");

  if (/\bTEXT_SELECTORS\b/.test(suite)) {
    fail(
      "app/selftest-suite.ts",
      "TEXT_SELECTORS is back. That list reported sixty surfaces while measuring " +
        "forty-three; the traversal in measurePage() replaced it and must not be " +
        "given a second opinion to disagree with.",
    );
  }

  // Any array of class or id selectors, found by shape: a declaration whose
  // entries are string literals beginning with . or #.
  for (const m of suite.matchAll(/const\s+([A-Za-z_$][\w$]*)\s*=\s*\[([^\]]*)\]/g)) {
    const [, name, body] = m;
    const entries = [...body.matchAll(/["'`]\s*([.#][^"'`]*)["'`]/g)].map((e) => e[1]);
    if (entries.length < 5) continue;

    const reason = SELECTOR_LISTS_ALLOWED[name];
    if (!reason) {
      fail(
        "app/selftest-suite.ts",
        `${name} is a hand-written list of ${entries.length} appearance selectors. ` +
          `A list like that passes for every name that matches nothing. Traverse ` +
          `instead, or add ${name} to SELECTOR_LISTS_ALLOWED in verify.mjs with a reason.`,
      );
      continue;
    }
    // An allowed list still has to be checked against what it matched, or the
    // exception reintroduces exactly the failure it was granted despite.
    if (!suite.includes(`${name}.filter(`)) {
      fail(
        "app/selftest-suite.ts",
        `${name} is allowed as a hand-written list, but nothing checks that its ` +
          `names still match anything. The exception was granted on that condition.`,
      );
    }
  }

  // The same list written as one string rather than an array is the same list.
  for (const m of suite.matchAll(/["'`]([^"'`\n]{40,})["'`]/g)) {
    const parts = m[1].split(",").map((x) => x.trim());
    const selectors = parts.filter((x) => /^[.#][\w-]/.test(x));
    if (selectors.length >= 5 && selectors.length === parts.length) {
      fail(
        "app/selftest-suite.ts",
        `a string of ${selectors.length} appearance selectors ("${selectors[0]}, ` +
          `${selectors[1]}, ...") is the same hand-written list with different ` +
          `punctuation, and fails the same way.`,
      );
    }
  }
});

// 8. The counters themselves --------------------------------------------------
// Everything above trusts that it ran. This does not. It reads both assertion
// files as text and compares what they contain against the numbers declared at
// the top, which is the only way to notice an assertion that was added, deleted,
// or written somewhere it can never execute.
check("every assertion in both files is accounted for", () => {
  const here = readFileSync(join(ROOT, "verify.mjs"), "utf8");
  const fails = callSites(here, "fail");
  if (fails !== EXPECTED.failSites) {
    fail(
      "verify.mjs",
      `${fails} fail() call sites, but EXPECTED.failSites says ${EXPECTED.failSites}. ` +
        `If you added or removed one, update the number. If you did not, an assertion ` +
        `has moved somewhere it will not run.`,
    );
  }

  const suitePath = join(ROOT, "app", "selftest-suite.ts");
  const suite = readFileSync(suitePath, "utf8");
  const oks = callSites(suite, "ok");
  if (oks !== EXPECTED.suiteOkSites) {
    fail(
      "app/selftest-suite.ts",
      `${oks} ok() call sites, but EXPECTED.suiteOkSites says ${EXPECTED.suiteOkSites}. ` +
        `An assertion written after the report call would raise this and still never run.`,
    );
  }

  // The suite carries its own copy of the total, because it is the only one that
  // can compare it against assertions that actually executed. CI cannot run the
  // suite, but it can read that number and refuse to let the two drift apart.
  const declared = suite.match(/EXPECTED_ASSERTIONS\s*=\s*(\d+)/);
  if (!declared) {
    fail("app/selftest-suite.ts", "no EXPECTED_ASSERTIONS declaration; the suite cannot count itself");
  } else if (Number(declared[1]) !== EXPECTED.suiteAssertions) {
    fail(
      "app/selftest-suite.ts",
      `the suite expects ${declared[1]} assertions, this file expects ${EXPECTED.suiteAssertions}`,
    );
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
    if (modules.stops.VIEWS.includes(href)) continue;
    if (!listed.has(href)) fail(`app/${entry.name}/page.tsx`, `route ${href} is not in the sidebar`);
  }
  if (existsSync(join(appDir, "page.tsx")) && !listed.has("/")) {
    fail("app/page.tsx", "route / is not in the sidebar");
  }
});

// --------------------------------------------------------------------- summary

// Counted as the checks ran, not read out of the source: a check defined but
// never called, or one that returned early, shows up here and nowhere else.
if (checksRun !== EXPECTED.checks) {
  fail(
    "verify.mjs",
    `${checksRun} checks ran, but EXPECTED.checks says ${EXPECTED.checks}. ` +
      `A check that is defined and never called fails here and nowhere else.`,
  );
}

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
