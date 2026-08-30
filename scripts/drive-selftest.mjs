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
import { existsSync, mkdtempSync, rmSync } from "node:fs";
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
  const args = { url: null, widths: WIDTHS, port: 3210, keep: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--url") args.url = argv[++i];
    else if (a === "--port") args.port = Number(argv[++i]);
    else if (a === "--width") {
      const w = Number(argv[++i]);
      const known = WIDTHS.find((x) => x.width === w);
      args.widths = [known ?? { width: w, height: 900 }];
    } else if (a === "--keep-open") args.keep = true;
    else if (a === "--help" || a === "-h") {
      console.log(
        "usage: node scripts/drive-selftest.mjs [--url URL] [--width 1440|768|390] [--port N]",
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

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
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

async function runAt(chrome, url, { width, height }, keepOpen) {
  const profile = mkdtempSync(join(tmpdir(), "agentlab-selftest-"));
  const port = 9200 + Math.floor(Math.random() * 700);
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
    { stdio: ["ignore", "ignore", "ignore"] },
  );

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
    await send("Emulation.setFocusEmulationEnabled", { enabled: true }).catch(() => {});

    // Override the metrics rather than resizing a window, so a result does not
    // depend on the host's screen or window chrome.
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });

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
    const deadline = Date.now() + 10 * 60 * 1000;
    let report = null;
    while (Date.now() < deadline) {
      const thrown = await evaluate(send, "window.__driverError").catch(() => null);
      if (thrown) {
        return { width, threw: thrown };
      }
      report = await evaluate(
        send,
        "window.__selftest ? JSON.stringify(window.__selftest) : null",
      ).catch(() => null);
      if (report) break;
      await sleep(250);
    }

    if (!report) {
      const stop = await evaluate(send, "document.body.dataset.stop").catch(() => "?");
      return { width, threw: `no report after 10 minutes (last stop: ${stop})` };
    }
    return { width, ...JSON.parse(report) };
  } finally {
    try {
      socket?.close();
    } catch {
      /* already gone */
    }
    proc.kill("SIGKILL");
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
    const run = await runAt(chrome, url, size, args.keep);
    runs.push(run);
    if (run.threw) {
      console.log(`${run.width}px — the suite threw before reporting`);
      console.log(`  ${run.threw.split("\n")[0]}`);
    } else {
      console.log(`${run.width}px — ${run.pass}/${run.total} passed`);
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

process.exit(failures.length ? 1 : 0);
