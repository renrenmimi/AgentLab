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
  scenario: await load("lib/scenario.ts"),
  build: await load("lib/build.ts"),
};

// Every exported value, rooted at a readable name for error messages.
const roots = [
  ["ui", modules.i18n.ui],
  ["glossary", modules.glossary.glossary],
  ["stops", modules.stops.STOPS],
  ["intro.scenes", modules.intro.scenes],
  ["intro.stage", modules.intro.stage],
  ["scenario.agentCode", modules.scenario.agentCode],
  ["scenario.steps", modules.scenario.steps],
  ["build.codeTemplate", modules.build.codeTemplate],
  ["build.blanks", modules.build.blanks],
  ["build.runScript", modules.build.runScript],
];

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

  // Counters that only ever move forward.
  let round = -1;
  let tokens = -1;
  steps.forEach((step, i) => {
    if (step.round !== undefined) {
      if (step.round < round) fail(`${label}.steps[${i}]`, `round goes backwards (${round} → ${step.round})`);
      round = step.round;
    }
    if (step.tokens !== undefined) {
      if (step.tokens < tokens) fail(`${label}.steps[${i}]`, `tokens go backwards (${tokens} → ${step.tokens})`);
      tokens = step.tokens;
    }
  });
}

check("no scenario step highlights a line outside its code snippet", () => {
  checkScenario("scenario", modules.scenario.agentCode, modules.scenario.steps);
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
