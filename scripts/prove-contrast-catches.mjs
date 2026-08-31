#!/usr/bin/env node
// prove-contrast-catches.mjs — put repaired surfaces back and check the suite
// notices.
//
// The contrast check was rewritten this round: a hand-written list of sixty
// selectors became a traversal of every node that paints text. The list had
// reported a perfect score while seventeen of its entries matched nothing, so
// the claim that the replacement is better needs evidence, not confidence.
//
// Each case below reverts a contrast fix that has already shipped, using a
// stylesheet injected into the page rather than an edit to app/globals.css, so
// nothing is rebuilt and no tracked file is touched. The suite then has to fail,
// and has to name the surface. A case that passes is a failure of this script.
//
// Two of the three surfaces could not have been caught by the old mechanism at
// all: .bubble-user was in the list but never matched, because a chat bubble
// only exists mid-interaction, and .sc-in was never in the list.
//
//   npx next build && node scripts/prove-contrast-catches.mjs
//
// Roughly ninety seconds a case. One width is enough: these are colour pairs,
// and a colour pair does not depend on the viewport.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const scratch = mkdtempSync(join(tmpdir(), "agentlab-prove-"));

// Each case names a defect that shipped, the CSS that puts it back, and the
// text the failure has to contain. `found` is what the suite reported when the
// defect was live, kept so the two numbers can be compared.
const CASES = [
  {
    name: "the accent surface reverted to the bright accent pair",
    story:
      "one revert, four surfaces. The old selector list named the button, matched " +
      "the chat bubble but never in a state where it existed, and did not contain " +
      "the scene bubble or the language switch at all.",
    css: `:root, [data-theme="dark"], [data-theme="light"] {
            --accent-solid-a: #a99cff;
            --accent-solid-b: #8a7cf6;
          }`,
    needs: ["--accent-solid-a", "--accent-solid-b"],
    expect: ["btn-primary", "bubble-user", "sc-in"],
    found: "2.36:1 dark, 3.34:1 light, three times over three rounds",
  },
  {
    name: "round four's .f-agent fix reverted",
    story: "the closing formula badge, white on a gradient whose lightest stop is the teal.",
    css: `.f-agent {
            background: linear-gradient(120deg, var(--accent-2), var(--teal), var(--accent-2)) !important;
          }`,
    needs: [".f-agent", "--accent-2"],
    expect: ["f-agent"],
    found: "2.10:1 dark, against the 3:1 large text needs",
  },
  {
    name: "round four's .tool-pending fix reverted",
    story: "the pending badge, on a teal-tinted chip in the light theme.",
    css: `[data-theme="light"] { --amber: #8f5f0e; }`,
    needs: ["--amber"],
    expect: ["tool-pending"],
    found: "4.35:1 light",
  },
];

function run(css) {
  const file = join(scratch, "revert.css");
  writeFileSync(file, css);
  try {
    return execFileSync(
      process.execPath,
      [join(ROOT, "scripts", "drive-selftest.mjs"), "--width", "1440", "--inject", file],
      { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch (err) {
    // A non-zero exit is the expected outcome: the suite is supposed to fail.
    return `${err.stdout ?? ""}${err.stderr ?? ""}`;
  }
}

// A revert that names something the stylesheet no longer has changes nothing,
// and a case that changes nothing tests nothing. That happened the first time
// this file outlived a rename: it reverted --btn-a, which had become
// --accent-solid-a, and reported that the suite had missed a defect it was never
// shown. It failed loudly, which is right, but it said the wrong thing. This
// says the right thing.
const css = readFileSync(join(ROOT, "app", "globals.css"), "utf8");

console.log("");
let failures = 0;
for (const c of CASES) {
  const gone = (c.needs ?? []).filter((name) => !css.includes(name));
  if (gone.length) {
    failures++;
    console.log(`  ✗ ${c.name}`);
    console.log(`      this case reverts ${gone.join(", ")}, which app/globals.css no`);
    console.log(`      longer contains. The case is stale, not the suite. Update it.`);
    console.log("");
    continue;
  }
  const out = run(c.css);
  const line =
    out.split("\n").find((l) => l.includes("clear their contrast requirement")) ?? "";
  const missed = c.expect.filter((surface) => !line.includes(surface));
  const caught = missed.length === 0;
  console.log(`  ${caught ? "✓" : "✗"} ${c.name}`);
  console.log(`      ${c.story}`);
  console.log(`      shipped at ${c.found}`);
  if (caught) {
    console.log(`      named: ${c.expect.join(", ")}`);
  } else {
    failures++;
    console.log(`      NOT named: ${missed.join(", ")}`);
    console.log(`      the suite said: ${line.trim() || "(no contrast failure at all)"}`);
  }
  console.log("");
}

// Without this the three cases above prove nothing: a suite that fails on
// everything would pass all of them.
const clean = run("/* nothing reverted */");
const green = /1440px — \d+\/\d+ passed/.test(clean) && !/clear their contrast/.test(clean);
console.log(`  ${green ? "✓" : "✗"} with nothing reverted, the suite is green`);
if (!green) failures++;

rmSync(scratch, { recursive: true, force: true });

console.log("");
if (failures) {
  console.log(`${failures} of the cases went unnoticed. The detector does not detect.\n`);
  process.exit(1);
}
console.log("every reverted fix was caught, and none of them had to be named.\n");
process.exit(0);
