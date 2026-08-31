#!/usr/bin/env node
//
// Runs the in-page suite (?selftest=1) in a real browser and reports the score.
//
// WHY THIS FILE IS IN THE REPOSITORY
//
// It was written once before and thrown away as scratch, on the reasoning that
// the shipped instrument is the flag and this only presses the button. That
// reasoning was wrong. With the driver gone nobody could run 110 assertions, so
// five pull requests merged without them ever executing — including ones that
// renumbered every stop and moved the main landmark. The sibling project in this
// family lost eighteen assertions the same way. A test you cannot run is not a
// test, and the thing that runs it is part of the project.
//
// HOW IT WORKS, AND WHY THERE IS NO DEPENDENCY
//
// Node 22 ships a WebSocket client, and Chrome speaks the DevTools Protocol over
// one. So: launch Chrome with a debugging port, read the target list over HTTP,
// open the socket, and drive the page with Runtime.evaluate. That is the whole
// mechanism, and it is why this needs nothing from npm.
//
// Playwright would also do this and is deliberately not used: it pins a browser
// build, and a version mismatch between it and the browser on the machine turns
// into a hang rather than an error. A dependency that couples the test runner to
// a browser build is worse than no dependency for this job.
//
// USAGE
//
//   node scripts/drive-selftest.mjs                 # serves a build, all three widths
//   node scripts/drive-selftest.mjs --url http://localhost:3000
//   node scripts/drive-selftest.mjs --width 390
//   CHROME_PATH=/path/to/chrome node scripts/drive-selftest.mjs
//
// Exits non-zero if any assertion fails, and prints the failures in a form that
// can be pasted into a pull request body.

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// The three widths the course is checked at: a desktop, a tablet, and the
// narrowest phone worth supporting.
const WIDTHS = [
  { width: 1440, height: 900 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
];

// ---------------------------------------------------------------- arguments

function parseArgs(argv) {
  const args = { url: null, widths: WIDTHS, port: 3210, keep: false, inject: null, injectJs: null, expect: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--url") args.url = argv[++i];
    else if (a === "--port") args.port = Number(argv[++i]);
    else if (a === "--width") {
      const w = Number(argv[++i]);
      const known = WIDTHS.find((x) => x.width === w);
      args.widths = [known ?? { width: w, height: 900 }];
    } else if (a === "--inject") args.inject = readFileSync(argv[++i], "utf8");
    else if (a === "--inject-js") args.injectJs = readFileSync(argv[++i], "utf8");
    else if (a === "--expect-assertions") args.expect = { ...(args.expect ?? {}), assertions: Number(argv[++i]) };
    else if (a === "--expect-coverage") args.expect = { ...(args.expect ?? {}), coverage: Number(argv[++i]) };
    else if (a === "--keep-open") args.keep = true;
    else if (a === "--help" || a === "-h") {
      console.log(
        "usage: node scripts/drive-selftest.mjs [--url URL] [--width 1440|768|390]\n" +
          "                                       [--port N] [--inject FILE.css]\n" +
          "                                       [--inject-js FILE.js]\n" +
          "                                       [--expect-assertions N] [--expect-coverage F]",
      );
      process.exit(0);
    }
  }
  return args;
}

// ---------------------------------------------------------------- chrome

/**
 * Find a Chrome to drive.
 *
 * CHROME_PATH wins, so a machine with an unusual install or a CI image with a
 * pinned browser needs no edit here. After that: the macOS application paths,
 * then the usual Linux command names on PATH. Nothing about this file should
 * need changing to run on a Linux runner.
 */
function findChrome() {
  if (process.env.CHROME_PATH) {
    if (!existsSync(process.env.CHROME_PATH)) {
      fail(`CHROME_PATH is set to ${process.env.CHROME_PATH}, which does not exist`);
    }
    return process.env.CHROME_PATH;
  }

  const appPaths = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ];
  for (const p of appPaths) if (existsSync(p)) return p;

  const commands = [
    "google-chrome",
    "google-chrome-stable",
    "chromium",
    "chromium-browser",
    "chrome",
  ];
  for (const cmd of commands) {
    const found = spawnSync("which", [cmd], { encoding: "utf8" });
    if (found.status === 0 && found.stdout.trim()) return found.stdout.trim();
  }

  fail(
    "no Chrome found. Set CHROME_PATH, or install one of: " + commands.join(", "),
  );
}

function fail(message) {
  console.error(`drive-selftest: ${message}`);
  process.exit(2);
}

// ---------------------------------------------------------------- devtools

async function connect(port) {
  let targets;
  for (let i = 0; i < 150; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      targets = await res.json();
      if (targets.length) break;
    } catch {
      /* not up yet */
    }
    await sleep(100);
  }
  if (!targets?.length) fail("Chrome did not open a debugging port in 15 seconds");

  const target = targets.find((t) => t.type === "page") ?? targets[0];
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = () => reject(new Error("could not open the DevTools socket"));
  });

  let nextId = 0;
  const pending = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (!msg.id || !pending.has(msg.id)) return;
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(`${msg.method ?? "cdp"}: ${msg.error.message}`));
    else resolve(msg.result);
  };

  // A dead socket used to be silent. Chrome exiting left every request in flight
  // waiting for an answer that was never coming, and since the wait loop only
  // checks its deadline between awaits, one unanswered request suspended the
  // deadline as well. A run sat for forty-nine minutes against a ten-minute
  // limit. Both halves are fixed: the socket closing rejects what is pending, and
  // every request carries its own timeout.
  const abandon = (why) => {
    for (const [id, { reject }] of pending) {
      pending.delete(id);
      reject(new Error(why));
    }
  };
  ws.onclose = () => abandon("the DevTools socket closed while a request was in flight");
  ws.onerror = () => abandon("the DevTools socket errored while a request was in flight");

  // Sixty seconds. The page is single-threaded and the suite measures twelve
  // thousand nodes in one synchronous pass, so an evaluate can legitimately wait
  // several seconds behind it. Nothing legitimately waits a minute.
  const CALL_TIMEOUT_MS = 60 * 1000;

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++nextId;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`${method} did not answer within ${CALL_TIMEOUT_MS / 1000}s`));
      }, CALL_TIMEOUT_MS);
      pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
      });
      ws.send(JSON.stringify({ id, method, params }));
    });

  return { ws, send };
}

async function evaluate(send, expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(
      result.exceptionDetails.exception?.description ??
        result.exceptionDetails.text ??
        "evaluate failed",
    );
  }
  return result.result.value;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- serving

/** Is something already listening here? */
async function portInUse(port) {
  try {
    await fetch(`http://localhost:${port}`, { signal: AbortSignal.timeout(1500) });
    return true;
  } catch {
    return false;
  }
}

/**
 * Serve a production build unless a URL was given. `next start` is used rather
 * than `next dev` so the suite runs against what actually ships.
 *
 * The port is checked first, and an occupied one is a hard error rather than
 * something to work around. Without that check a leftover server keeps the port,
 * the spawned `next start` fails to bind, `fetch` succeeds against the leftover,
 * and the run reports a score for a build that is not the one on disk. A test
 * harness that can quietly grade the wrong code is worse than one that refuses
 * to start.
 */
async function serve(port) {
  if (await portInUse(port)) {
    fail(
      `something is already listening on port ${port}. Stop it, or pass --port, ` +
        `or point at it directly with --url http://localhost:${port} if that is ` +
        `deliberate. Refusing to run in case it is serving a different build.`,
    );
  }

  // Spawned in its own process group and killed as a group. Going through npx
  // and killing only the wrapper leaves the real next-server orphaned, holding
  // the port — which the check above then reports on the next run instead of the
  // score. Ask how that was discovered.
  const proc = spawn(
    process.execPath,
    [join(ROOT, "node_modules", "next", "dist", "bin", "next"), "start", "-p", String(port)],
    { cwd: ROOT, stdio: ["ignore", "ignore", "pipe"], detached: true },
  );
  let stderr = "";
  proc.stderr.on("data", (d) => (stderr += d));

  const stop = () => {
    try {
      process.kill(-proc.pid, "SIGKILL");
    } catch {
      try {
        proc.kill("SIGKILL");
      } catch {
        /* already gone */
      }
    }
  };

  const url = `http://localhost:${port}`;
  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (res.ok) return { url, stop };
    } catch {
      /* still starting */
    }
    if (proc.exitCode !== null) {
      stop();
      fail(`next start exited: ${stderr.trim() || `code ${proc.exitCode}`}`);
    }
    await sleep(500);
  }
  stop();
  fail("next start did not answer in 60 seconds; is there a build? (npx next build)");
}

// ---------------------------------------------------------------- one run

// What the suite last finished, for a run that produced no report. A timeout
// that says only "no report" is the same as no signal: a runner's own limit
// kills the browser and nobody learns which block was running.
async function lastBlock(send) {
  const at = await evaluate(send, "document.documentElement.dataset.selftestAt").catch(() => null);
  const stop = await evaluate(send, "document.body.dataset.stop").catch(() => null);
  if (!at) return `The suite published no progress at all, so it stopped before its first assertion${stop ? ` (on ${stop})` : ""}.`;
  return `Last completed assertion — ${at}${stop ? `, while on ${stop}` : ""}.`;
}

async function runAt(chrome, url, { width, height }, keepOpen, injectCss, injectJs) {
  const profile = mkdtempSync(join(tmpdir(), "agentlab-selftest-"));
  const port = 9200 + Math.floor(Math.random() * 700);
  // Detached, and killed as a group. Chrome used to be a plain child cleaned up
  // in a finally, which is skipped when this process is killed rather than
  // returning — and a headless Chrome with nine helpers left running competes
  // with the next run for the machine. That is not hypothetical: it is why one
  // width of one run took forty-nine minutes.
  const proc = spawn(
    chrome,
    [
      keepOpen ? "--headless=new" : "--headless=new",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-gpu",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "ignore"], detached: true },
  );

  const killChrome = () => {
    try {
      process.kill(-proc.pid, "SIGKILL");
    } catch {
      try {
        proc.kill("SIGKILL");
      } catch {
        /* already gone */
      }
    }
  };
  // A signal skips the finally below, so the same cleanup is attached to the
  // ways this process can be ended from outside.
  const onSignal = () => {
    killChrome();
    process.exit(130);
  };
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);

  let socket;
  try {
    const { ws, send } = await connect(port);
    socket = ws;

    await send("Page.enable");
    await send("Runtime.enable");

    // A headless window is never the focused window, so :focus-visible never
    // matches and every focus-ring assertion would pass vacuously — or fail,
    // depending on how it is written. Round two found this the hard way. Do not
    // remove: without it the accessibility half of the suite means nothing.
    //
    // And do not put the catch back. This used to swallow its own failure, which
    // on a laptop means somebody eventually notices the focus rings are wrong
    // and on a runner means nobody ever does: the assertions go green because
    // there is nothing to fail against. A browser that cannot emulate focus is a
    // browser this suite cannot be trusted in.
    try {
      await send("Emulation.setFocusEmulationEnabled", { enabled: true });
    } catch (err) {
      fail(
        `this Chrome would not enable focus emulation (${err.message}). Every ` +
          `focus assertion would pass without testing anything, so the run is ` +
          `stopping instead.`,
      );
    }

    // Override the metrics rather than resizing a window, so a result does not
    // depend on the host's screen or window chrome.
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });

    // A stylesheet applied before anything on the page runs. This exists for
    // scripts/prove-contrast-catches.mjs, which puts a repaired surface back the
    // way it was and checks that the suite notices — a detector nobody has seen
    // fire is not a detector. Injecting rather than editing app/globals.css means
    // no build, and no tracked file is touched.
    if (injectCss) {
      await send("Page.addScriptToEvaluateOnNewDocument", {
        source:
          `(() => { const s = document.createElement("style");` +
          ` s.id = "__injected"; s.textContent = ${JSON.stringify(injectCss)};` +
          ` const put = () => document.head && document.head.appendChild(s);` +
          ` if (document.head) put(); else addEventListener("DOMContentLoaded", put); })();`,
      });
    }

    // Script run before anything on the page. This is how a broken suite is
    // simulated from outside without editing it: scripts/check-the-counters.mjs
    // uses it to make the traversal return half the nodes it should, and checks
    // that the suite says so.
    if (injectJs) {
      await send("Page.addScriptToEvaluateOnNewDocument", { source: injectJs });
    }

    await send("Page.navigate", { url: `${url}/?selftest=1` });

    // Surface a thrown suite rather than waiting out the timeout on it.
    await evaluate(
      send,
      `window.__driverError = null;
       addEventListener("error", (e) => {
         window.__driverError = String((e.error && e.error.stack) || e.message);
       });
       addEventListener("unhandledrejection", (e) => {
         window.__driverError = String((e.reason && e.reason.stack) || e.reason);
       });
       1`,
    ).catch(() => {});

    // The suite walks fourteen stops several times over, in two themes.
    //
    // A window error used to end the run on the spot, and that threw away a
    // whole measurement for something the suite had not done. The listener above
    // catches every error on the page, including ones the framework raises and
    // recovers from — a ResizeObserver notification loop is reported as an error
    // event and is not a failure of anything. One width came back as "the suite
    // threw" while the same width passed on its own, twice.
    //
    // So an error no longer ends the run. It is recorded, the wait continues,
    // and if the report arrives it is reported alongside the score. Only when no
    // report follows within a minute is the error treated as the reason.
    const deadline = Date.now() + 10 * 60 * 1000;
    const GRACE_MS = 60 * 1000;
    let report = null;
    let pageError = null;
    let giveUpAt = null;
    while (Date.now() < deadline) {
      if (!pageError) {
        const thrown = await evaluate(send, "window.__driverError").catch(() => null);
        if (thrown) {
          pageError = thrown;
          giveUpAt = Date.now() + GRACE_MS;
        }
      }
      report = await evaluate(
        send,
        "window.__selftest ? JSON.stringify(window.__selftest) : null",
      ).catch(() => null);
      if (report) break;
      if (giveUpAt && Date.now() > giveUpAt) {
        const at = await lastBlock(send);
        return { width, threw: `${pageError}\n  (no report in the minute after. ${at})` };
      }
      await sleep(250);
    }

    if (!report) {
      const at = await lastBlock(send);
      return { width, threw: `no report after 10 minutes. ${at}` };
    }
    return { width, ...JSON.parse(report), pageError };
  } finally {
    try {
      socket?.close();
    } catch {
      /* already gone */
    }
    process.removeListener("SIGINT", onSignal);
    process.removeListener("SIGTERM", onSignal);
    killChrome();
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
    } catch {
      /* chrome sometimes holds a lock briefly; the temp dir is disposable */
    }
  }
}

// ---------------------------------------------------------------- main

const args = parseArgs(process.argv.slice(2));
const chrome = findChrome();
const served = args.url ? null : await serve(args.port);
const url = args.url ?? served.url;

console.log(`chrome:  ${chrome}`);
console.log(`url:     ${url}`);
console.log("");

const runs = [];
try {
  for (const size of args.widths) {
    const began = Date.now();
    const run = await runAt(chrome, url, size, args.keep, args.inject, args.injectJs);
    run.seconds = Math.round((Date.now() - began) / 1000);
    runs.push(run);
    if (run.threw) {
      console.log(`${run.width}px — the suite threw before reporting, after ${run.seconds}s`);
      // The whole thing, not the first line. A stack trace cut to one line is
      // how the last one of these went unexplained.
      for (const line of String(run.threw).split("\n")) console.log(`  ${line}`);
    } else {
      console.log(`${run.width}px — ${run.pass}/${run.total} passed in ${run.seconds}s`);
      // The coverage numbers, printed whether or not they failed. They are the
      // point of the rewrite and a number nobody sees is not a signal — the
      // previous mechanism reported a perfect score while measuring 72 per cent
      // of the surfaces, and nothing on screen said so.
      for (const r of run.results ?? []) {
        if (/^the traversal (measured|made)/.test(r.label)) console.log(`  ${r.note}`);
        if (/^the quietest text/.test(r.label)) console.log(`  quietest: ${r.note}`);
      }
      if (run.pageError) {
        // Reported, not swallowed: the page raised something while the suite was
        // running, and whoever reads this score should know that.
        console.log(`  note: the page raised an error during the run, and the suite finished anyway`);
        for (const line of String(run.pageError).split("\n").slice(0, 3)) console.log(`    ${line}`);
      }
      for (const r of run.results) {
        if (!r.ok) console.log(`  FAIL ${r.label}${r.note ? `  [${r.note}]` : ""}`);
      }
    }
    console.log("");
  }
} finally {
  served?.stop();
}

// A block that can be pasted straight into a pull request body.
console.log("--- for the pull request ---");
console.log("");
console.log("| Viewport | Score |");
console.log("|---|---|");
for (const run of runs) {
  const size = WIDTHS.find((w) => w.width === run.width);
  const label = size ? `${size.width} × ${size.height}` : `${run.width}px`;
  console.log(`| ${label} | ${run.threw ? "threw" : `**${run.pass} / ${run.total}**`} |`);
}

// The declared totals, checked against what actually ran.
//
// The suite already compares its own assertion count against its own constant,
// and verify.mjs compares that constant against the suite's source. Both of
// those move together if somebody edits both. This is the third opinion, and it
// lives in the workflow file, where lowering it is a line in a diff about CI
// rather than a line in a diff about a test. Zero failures is not the assertion:
// coverage quietly dropping is what the coverage floor exists to catch, and a
// run that measures less can still report every assertion it did make as green.
const expectationFailures = [];
if (args.expect) {
  for (const run of runs) {
    if (run.threw) continue;
    if (args.expect.assertions != null && run.total !== args.expect.assertions) {
      expectationFailures.push(
        `${run.width}px ran ${run.total} assertions, and ${args.expect.assertions} were expected. ` +
          `Either a block stopped running or the count was changed without changing the workflow.`,
      );
    }
    if (args.expect.coverage != null) {
      const note = (run.results ?? []).find((r) => /^the traversal measured/.test(r.label))?.note ?? "";
      const share = Number((note.match(/\(([\d.]+)%\)/) ?? [])[1]);
      if (!Number.isFinite(share)) {
        expectationFailures.push(`${run.width}px reported no coverage figure to check`);
      } else if (share / 100 < args.expect.coverage) {
        expectationFailures.push(
          `${run.width}px measured ${share}% of the text on the page, below the ` +
            `${(args.expect.coverage * 100).toFixed(0)}% this run was told to expect.`,
        );
      }
    }
  }
}

const failures = runs.flatMap((run) =>
  run.threw
    ? [{ width: run.width, label: "the suite threw", note: run.threw.split("\n")[0] }]
    : run.results.filter((r) => !r.ok).map((r) => ({ width: run.width, ...r })),
);

if (failures.length) {
  console.log("");
  console.log("```");
  for (const f of failures) {
    console.log(`${f.width}px  ${f.label}${f.note ? `  [${f.note}]` : ""}`);
  }
  console.log("```");
}

if (expectationFailures.length) {
  console.log("");
  console.log("the run did not match what it was told to expect:");
  for (const line of expectationFailures) console.log(`  ${line}`);
}

const wall = runs.reduce((sum, run) => sum + (run.seconds ?? 0), 0);
console.log("");
console.log(`wall time: ${wall}s across ${runs.length} viewport${runs.length === 1 ? "" : "s"}` +
  ` (${runs.map((r) => `${r.width}px ${r.seconds}s`).join(", ")})`);

process.exit(failures.length || expectationFailures.length ? 1 : 0);
