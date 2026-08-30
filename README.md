# AgentLab — An Interactive Introduction to AI Agents

[![CI](https://github.com/renrenmimi/AgentLab/actions/workflows/ci.yml/badge.svg)](https://github.com/renrenmimi/AgentLab/actions/workflows/ci.yml)

**▶ [Open the course](https://agent-lab-blond.vercel.app)** — runs in your browser, nothing to install.

An interactive course on tool-using AI agents. It presents the user-facing conversation
beside the `messages` array sent to the model, steps through the request, tool call, result
and follow-up loop — and then goes on to the parts that are actually hard: what a run
costs, what happens when the history stops fitting, how to describe a tool so it gets used
correctly, why a tool result cannot be trusted, and how to tell whether a change helped.

![A visual introduction to the agent loop](docs/home.jpg)

*A visual introduction to the agent loop*

![The message history growing one step at a time](docs/loop.jpg)

*The message history growing one step at a time*

## Nine stops

The first three build the mental model. The next six are about everything that makes
agents actually hard — the questions a reader still could not answer after finishing the
first three.

1. **`/` — What an agent is.** From "a model only turns text into text" to "a program that
   loops and calls tools", without a line of code.
2. **`/loop` — Watch it run.** Step through complete runs. The button labels *are* the
   beats of the loop: send the task → call the model → run the tool → send the result back → …
   Five recorded runs: one that goes cleanly, and four that go wrong — a loop that will not
   stop, a model that picks the wrong tool, a history that no longer fits, and a tool that
   fails. Each failing run ends by replaying itself with the mistake fixed.
3. **`/build` — Write one yourself.** Fill in eight blanks in a small agent skeleton. Each
   blank teaches the concept before asking, and every wrong answer gets a specific
   correction.
4. **`/cost` — Why it costs what it costs.** The whole array is resent every round, so
   spending grows with the square of the number of rounds. Drag the slider and watch the
   curve bend; switch caching on and watch it bend less steeply — but still bend.
5. **`/context` — When it will not fit.** What a token is, what a context window is, and the
   three things a system can do when the array is too large: refuse, truncate, or summarise.
   All three are applied to the same conversation so the reader can see what each one loses.
6. **`/tools` — How to describe a tool.** A description is a prompt, not documentation.
   Three tasks, each exposing a different omission: what the tool does not do, where the
   toolset stops, and how much comes back.
7. **`/trust` — Tool output is not your friend.** Prompt injection, shown before it is named:
   a page whose visible text is ordinary and whose fetched text is not. Then the mitigations,
   each with what it does not stop.
8. **`/delegate` — Handing work to another agent.** One idea: a subagent buys context and
   costs you the ability to check its work.
9. **`/measure` — How you know it got better.** Ten saved tasks and a pass count. A prompt
   change that fixes three of them and quietly breaks two.

## Running locally

Requires Node ≥ 18.18 (an `.nvmrc` is included):

```bash
nvm use         # switch to Node 22
npm install
npm run dev     # http://localhost:3000
npm run verify  # static checks over the course content
```

## Notes on design

- **Simulated by default.** Every response comes from recorded data in `lib/scenarios/` —
  so it runs without an API key.
- **Bilingual.** Every string is a `{ zh, en }` pair in `lib/i18n.tsx`.
- **A glossary built into the prose.** Writing `[[key:label]]` renders a clickable term that
  pops up a beginner-level explanation.
- **Progress persists** to `localStorage`, so closing the tab does not lose your place.
- **The content is checked, not just the types.** `node verify.mjs` imports the content
  modules and asserts what a content bug looks like: a pair missing one language, a step
  highlighting a line the snippet does not have, a blank with no correction for a wrong
  answer, a `[[term]]` with no glossary entry, a stop with no page behind it.
- **The behaviour is checked too.** `verify.mjs` cannot see a click. Opening any page with
  `?selftest=1` runs assertions against the live DOM — that the scenario picker is a real
  tablist, that stepping through a run and back leaves the panels where `stateAt()` says,
  that the cost slider's numbers satisfy the arithmetic the prose claims, that a wrong
  answer at stop 3 produces its own correction — plus keyboard reachability, focus rings
  and computed contrast in both themes. It prints a report, sets `document.title` to the
  score, and needs no test runner.

## Structure

Next.js 15 (App Router) + TypeScript + React 19, plain CSS. No API routes, so the site
prerenders to static pages.

| File | Role |
|---|---|
| `lib/intro.ts` | Stop 1 content |
| `lib/scenarios/` | Stop 2 — five recorded runs, frame by frame, one file each |
| `lib/cost.ts` `lib/context.ts` `lib/tools.ts` | Stops 4–6: the model behind each one, plus its prose |
| `lib/trust.ts` `lib/delegate.ts` `lib/measure.ts` | Stops 7–9, same shape |
| `lib/lesson.ts` · `app/lesson.tsx` | The shared shape of a stop from 4 onward |
| `lib/build.ts` | Stop 3 — the blanks, answers, and per-mistake corrections |
| `lib/i18n.tsx` | Bilingual strings and the `useT()` hook |
| `lib/glossary.tsx` | Term dictionary and the `[[key:label]]` renderer |
| `lib/stops.ts` | The stop list shared by sidebar, breadcrumb, and ⌘K palette |
| `verify.mjs` | Static checks over all of the above |
| `app/selftest.tsx` · `app/selftest-suite.ts` | `?selftest=1` — the assertions a static check cannot make |

## After the loop

Every run in this course was written: each step and each token count was chosen to make one
point clearly. Real runs are not this tidy. If you want to keep going, the next step is a run
nobody arranged — [AgentTape](https://github.com/renrenmimi/AgentTape) replays a Claude Code
session that already happened, with the same three things you have been reading here: a
timeline, the `messages` array getting longer, and where the tokens went.

---

© 2026 Weiren Feng. All rights reserved. Published for reading and portfolio purposes; not
licensed for reuse, modification, or redistribution.
