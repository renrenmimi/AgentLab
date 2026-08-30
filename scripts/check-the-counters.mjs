#!/usr/bin/env node
// check-the-counters.mjs — negative tests for the assertion counters.
//
// verify.mjs and the in-page suite both declare how many assertions they expect
// and fail when the real number differs. That guard is worth exactly as much as
// the proof that it fires, so this file breaks it on purpose, four ways, and
// fails if any of the four goes unnoticed.
//
// Nothing here edits a tracked file. Each case writes a mutated copy of
// verify.mjs into the repository root — the same directory, so that the copy
// resolves ROOT to the same place — runs it, reads the output, and deletes the
// copy. A mutated copy of the suite goes beside it under a dotted name, and the
// mutant verify is pointed at that instead of the real one.
//
//   node scripts/check-the-counters.mjs

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const VERIFY = join(ROOT, "verify.mjs");
const SUITE = join(ROOT, "app", "selftest-suite.ts");
const MUTANT_VERIFY = join(ROOT, ".counters-mutant.mjs");
const MUTANT_SUITE = join(ROOT, "app", ".counters-mutant-suite.ts");

const verifySource = readFileSync(VERIFY, "utf8");
const suiteSource = readFileSync(SUITE, "utf8");

// Run a mutated verify and return everything it printed. A non-zero exit is the
// expected outcome for every case here, so it is captured rather than thrown.
function run(source) {
  writeFileSync(MUTANT_VERIFY, source);
  try {
    return execFileSync(process.execPath, [MUTANT_VERIFY], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (err) {
    return `${err.stdout ?? ""}${err.stderr ?? ""}`;
  } finally {
    rmSync(MUTANT_VERIFY, { force: true });
  }
}

// The mutant reads itself by name, so every case has to redirect that read at
// the copy, or it would measure the original and pass for the wrong reason.
const readsItself = (s) => s.replace('join(ROOT, "verify.mjs")', 'join(ROOT, ".counters-mutant.mjs")');
// Every read of the suite, not the first. verify.mjs reads that file in more
// than one check now, and redirecting only the first left the counter check
// reading the real file and passing while this script thought it was mutated.
const readsMutantSuite = (s) =>
  s.replaceAll('join(ROOT, "app", "selftest-suite.ts")', 'join(ROOT, "app", ".counters-mutant-suite.ts")');

const cases = [];

// 1. The shape that started this: a block of assertions appended after the exit.
//    It never runs, so nothing turns red on its own account. The static count is
//    the only thing that can see it.
cases.push({
  name: "an assertion appended after process.exit",
  expect: "fail() call sites",
  build: () =>
    readsItself(verifySource) +
    '\n\ncheck("this can never run", () => {\n  fail("nowhere", "and nothing would have said so");\n});\n',
});

// 2. The same counter the other way: an assertion deleted.
cases.push({
  name: "an assertion deleted",
  expect: "fail() call sites",
  build: () => {
    // Deleted by line index, not by a string replace: several fail() calls span
    // more than one line, and replacing a bare opener would produce a file that
    // does not parse, which would pass this test for the wrong reason.
    const lines = readsItself(verifySource).split("\n");
    const complete = lines.map((l, i) => [l, i]).filter(([l]) => /^\s*fail\(.*\);\s*$/.test(l));
    const [, at] = complete[complete.length - 1];
    lines[at] = "    ;";
    return lines.join("\n");
  },
});

// 3. A whole check that is defined and never called. The static count cannot see
//    this one, because the source still contains every assertion. Only the count
//    taken as the checks ran can.
cases.push({
  name: "a check that is defined and never called",
  expect: "checks ran",
  build: () =>
    readsItself(verifySource).replace(
      'check("nothing links to a route that is not a stop"',
      'const neverCalled = () => check("nothing links to a route that is not a stop"',
    ).replace(
      "// 6. Routes ---",
      "void neverCalled;\n\n// 6. Routes ---",
    ),
});

// 4. The in-page suite gaining an assertion without updating its own total. CI
//    cannot run that suite, so this is the only place the drift is visible.
cases.push({
  name: "the in-page suite gains an assertion without updating its total",
  expect: "ok() call sites",
  build: () => {
    writeFileSync(
      MUTANT_SUITE,
      suiteSource.replace(
        "  report(results, width);",
        '  ok(true, "an assertion nobody counted");\n  report(results, width);',
      ),
    );
    return readsMutantSuite(readsItself(verifySource));
  },
});

let failures = 0;
console.log("");
for (const c of cases) {
  const source = c.build();
  const out = run(source);
  rmSync(MUTANT_SUITE, { force: true });
  const caught = out.includes(c.expect) && /\d+ problem/.test(out);
  console.log(`  ${caught ? "✓" : "✗"} ${c.name}`);
  if (!caught) {
    failures++;
    console.log(`      expected a problem mentioning "${c.expect}", got:`);
    for (const line of out.trim().split("\n").slice(-6)) console.log(`      ${line}`);
  }
}

// The point of all four is that a guard nobody has seen fire is not a guard, so
// this file is worthless if it can pass while doing nothing. An unmutated run
// has to come back clean, or the cases above prove nothing.
const clean = run(readsItself(verifySource));
const stillGreen = /checks passed/.test(clean);
console.log(`  ${stillGreen ? "✓" : "✗"} an unmutated copy still passes`);
if (!stillGreen) failures++;

console.log("");
if (failures) {
  console.log(`${failures} of the counters did not fire. The guard is not guarding.\n`);
  process.exit(1);
}
console.log("all four counters fire, and a clean copy still passes.\n");
process.exit(0);
