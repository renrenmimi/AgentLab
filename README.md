# AgentLab — An Interactive Introduction to AI Agents

[![CI](https://github.com/renrenmimi/AgentLab/actions/workflows/ci.yml/badge.svg)](https://github.com/renrenmimi/AgentLab/actions/workflows/ci.yml)

**▶ [Open the course](https://agent-lab-blond.vercel.app)** — runs in your browser, nothing to install.

An interactive course on tool-using AI agents, in English and Chinese. It starts from a model
that can only turn text into text and ends at the questions that actually cost people time:
what a run costs, what happens when the history stops fitting, why a model picks the wrong
tool, whether a tool result can be trusted, and how you would know that a change helped.

Fourteen stops in six groups, each group saying in one line why it follows the one before it:

| Group | What it covers |
|---|---|
| **What it is** | An array, a loop, and then you write one yourself |
| **What the model is like** | It varies between runs, and it invents |
| **The text you write** | The system prompt and the tool descriptions, and what each can actually guarantee |
| **What it costs** | Money, the context ceiling, and what to do when neither leaves room |
| **When it goes wrong** | Text that lies to it, actions that cannot be undone, calls that fail |
| **How you know** | Ten saved tasks, a pass count, and where to go next |

Every stop is something you operate rather than read: step a run forward and watch the
`messages` array grow, drag a slider until the cost curve bends, refuse a write and see how
the agent adapts, answer a question wrongly and be told which idea the mistake came from.

![The agent loop, one step at a time](docs/loop.jpg)

*Stop 2 — five recorded runs, one clean and four that go wrong*

![The whole course on one page](docs/all.jpg)

*`/all` — the same prose in reading order, for coming back to*

## The stops

The numbers come from position in `lib/order.ts`; nothing writes one down.

1. **`/` — What an agent is.** From "a model only turns text into text" to "a program that
   loops and calls tools", without a line of code.
2. **`/loop` — Watch it run.** Five recorded runs: one clean, and four that go wrong — a
   loop that will not stop, a model that picks the wrong tool, a history that no longer
   fits, and a tool that fails. Each failing run ends by replaying itself with the mistake
   fixed.
3. **`/build` — Write one yourself.** Eight blanks in a small agent skeleton. Each teaches
   the concept before asking; every wrong answer gets a specific correction.
4. **`/chance` — Why answers differ.** Sampling and temperature. Press *run again* and watch
   the same task take a different path. Then the consequence: an agent is not a function,
   so "it worked when I tried it" is one sample, not evidence.
5. **`/invent` — Why it makes things up.** A fluent wrong answer and a fluent right one are
   the same kind of object inside the model. Three questions, asked with and without tools —
   including one about a function that does not exist.
6. **`/instructions` — The text outside the array.** The system prompt: where it sits, that
   it is re-sent and re-paid every round, and why "I told it to be careful" is an order of
   magnitude weaker than not giving it the tool. The same task under three conditions.
7. **`/tools` — Describing a tool.** A description is a prompt, not documentation. Three
   tasks, three different omissions.
8. **`/cost` — Why it costs that.** The array is resent every round, so spending grows with
   the square of the rounds. Drag the slider and watch the curve bend.
9. **`/context` — When it will not fit.** Refuse, truncate, summarise, or hand the work to
   another agent — the first three applied to the same conversation so you can see what each
   loses, and the fourth showing what a boundary costs: the caller gets a summary, not the
   work, and cannot check it.
10. **`/trust` — Tool output is not your friend.** Prompt injection, shown before it is
    named, then the mitigations and what each one does not stop.
11. **`/permission` — Who says yes.** The loop stops before a write and you make the call.
12. **`/again` — When a tool fails.** A call fails three ways, and in one of them you do not
    know whether the work happened — which is the one a retry does twice. Backoff, attempt
    limits, and idempotency through a concrete pair: a search and a payment.
13. **`/measure` — How you know it got better.** Ten saved tasks and a pass count.
14. **`/next` — What this course left out.** Where it stops, why, and where to go: real runs,
    frameworks, evaluation in earnest, multi-agent systems.

## Coming back to it

- **[`/all`](https://agent-lab-blond.vercel.app/all) — the whole course on one page.** Every
  stop's prose in reading order, every heading anchored, so a link can point at a paragraph.
  Where a stop has something to operate, only its conclusion is kept, and that is marked. It
  prints, and it reads on a phone in one scroll.
- **Search.** ⌘K searches the stop names and the prose of all fourteen stops in both
  languages, showing which stop and which section a hit came from. The index is the same
  course view `/all` uses, flattened; it is built on the first search and there is no
  dependency and no network request.
- **The glossary keeps up.** Sixteen terms now, each declaring the stop where it first appears.
  `verify.mjs` fails if a term is defined and never marked, or marked earlier than its entry
  claims.

## Running locally

Requires Node ≥ 18.18 (an `.nvmrc` is included):

```bash
nvm use         # switch to Node 22
npm install
npm run dev     # http://localhost:3000
npm run verify  # static checks over the course content
```

Then run the in-page suite. It lives behind a flag on every page, and a committed driver
runs it in a real browser at the three widths the course is checked at:

```bash
npx next build
npm run selftest                       # all three widths, exits non-zero on a failure
npm run selftest -- --width 390        # one width
npm run selftest -- --url http://localhost:3000   # against a server you already have
CHROME_PATH=/path/to/chrome npm run selftest      # if Chrome is somewhere unusual
```

`scripts/drive-selftest.mjs` launches Chrome with a debugging port and drives it over the
DevTools protocol using the `WebSocket` built into Node 22, so it needs nothing from npm.
Opening `http://localhost:3000/?selftest=1` by hand does the same thing without the driver:
the score goes into `document.title` and the report is printed on the page and to the
console.

## Notes on design

- **Simulated by default.** Every response comes from recorded data in `lib/scenarios/` —
  so it runs without an API key.
- **Bilingual.** Every string is a `{ zh, en }` pair in `lib/i18n.tsx`.
- **A glossary built into the prose.** Writing `[[key:label]]` renders a clickable term that
  pops up a beginner-level explanation.
- **Each group ends with a check.** Two or three questions that a reader who skimmed gets
  wrong, every wrong answer naming the misconception rather than saying "incorrect". No
  score, no progress percentage: the point is finding out something you thought you knew.
- **Progress is remembered** in `localStorage` and shown in the sidebar, with a visible way to
  clear it. No account, and nothing is sent anywhere.

## What is checked, and what is not

`node verify.mjs` reads the content modules and fails on the kinds of mistake a proofreader
misses: a bilingual pair missing one language, a step highlighting a line its snippet does not
have, a wrong answer with no correction, a `[[term]]` or `[[stop:/href]]` that resolves to
nothing, a stop number written by hand, a figure quoted in prose that disagrees with the
function that produces it.

Opening any page with `?selftest=1` runs the assertions a static check cannot make, against the
live DOM: that the tab list is a real tab list, that stepping through a run and back matches
`stateAt()`, that the cost slider's numbers still satisfy the arithmetic, that a wrong answer
in a group check shows that option's own correction and that the right answer cannot be found
in the markup. It also computes contrast for sixty text surfaces in both themes, walks the
heading spine and the landmarks of all fourteen stops, and checks that every graphic is either
named or hidden and that every control's name says what it does.

**What none of that covers, and why:**

- **Screen-reader output.** What is verified is the semantics a screen reader reads — roles,
  states, names, heading order, landmarks. Whether NVDA, JAWS or VoiceOver then announce
  something a person can follow is a different question, and answering it needs those programs
  and someone who uses them daily.
- **Real touch devices.** The narrow-viewport checks run in a desktop browser at 390 px. Tap
  target sizes, momentum scrolling, and the on-screen keyboard covering an input are not
  measured.
- **Engines other than Chromium.** Everything is checked in headless Chrome. Firefox and
  WebKit are not exercised at all.
- **The prose itself.** No checker can tell whether an explanation lands. The group checks are
  the closest thing here, and they test the reader rather than the text.

## Structure

Next.js 15 (App Router) + TypeScript + React 19, plain CSS. No API routes, so the site
prerenders to static pages.

| File | Role |
|---|---|
| `lib/intro.ts` | Stop 1 content |
| `lib/scenarios/` | Stop 2 — five recorded runs, frame by frame, one file each |
| `lib/<stop>.ts` | One per stop from 4 onward: the model behind it, plus its prose |
| `lib/lesson.ts` · `app/lesson.tsx` | The shared shape of a stop from 4 onward |
| `lib/stops.ts` | The reading order; the number on a stop comes from its position |
| `lib/build.ts` | Stop 3 — the blanks, answers, and per-mistake corrections |
| `lib/i18n.tsx` | Bilingual strings and the `useT()` hook |
| `lib/glossary.tsx` | Term dictionary and the `[[key:label]]` renderer |
| `lib/stops.ts` | The stop list shared by sidebar, breadcrumb, and ⌘K palette |
| `lib/checks.ts` · `app/group-check.tsx` | The check at the end of each of the six groups |
| `lib/course.ts` | One shape for every stop's prose; `/all`, search and the checker share it |
| `lib/search.ts` | The index and the query, built from `lib/course.ts` |
| `lib/order.ts` | The reading order, as bare hrefs, with no imports |
| `lib/meta.ts` | Per-stop title and description, written one at a time |
| `app/og/route.tsx` | One route, fifteen share cards, no dependency |
| `verify.mjs` | Static checks over all of the above |
| `scripts/drive-selftest.mjs` | Runs `?selftest=1` in a real browser and reports the score |
| `app/selftest.tsx` · `app/selftest-suite.ts` | `?selftest=1` — the assertions a static check cannot make |

---

© 2026 Weiren Feng. All rights reserved. Published for reading and portfolio purposes; not
licensed for reuse, modification, or redistribution.
