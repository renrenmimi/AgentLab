# AgentLab — An Interactive Introduction to AI Agents

[![CI](https://github.com/renrenmimi/AgentLab/actions/workflows/ci.yml/badge.svg)](https://github.com/renrenmimi/AgentLab/actions/workflows/ci.yml)

**▶ [Open the course](https://agent-lab-blond.vercel.app)** — runs in your browser, nothing to install.

An interactive introduction to a simple tool-using agent. It presents the user-facing
conversation beside the `messages` array sent to the model, then steps through the request,
tool call, result, and follow-up loop.

![A visual introduction to the agent loop](docs/home.jpg)

*A visual introduction to the agent loop*

![The message history growing one step at a time](docs/loop.jpg)

*The message history growing one step at a time*

## Three stops

1. **`/` — What an agent is.** From "a model only turns text into text" to "a program that
   loops and calls tools", without a line of code.
2. **`/loop` — Watch it run.** Step through complete runs. The button labels *are* the
   beats of the loop: send the task → call the model → run the tool → send the result back → …
   The code panel highlights the lines in play; the token counter shows the cost of resending
   the whole history each round. Five runs are recorded: one that goes cleanly, and four that
   go wrong — a loop that will not stop, a model that picks the wrong tool, a history that no
   longer fits, and a tool that fails. Each failing run ends by replaying itself with the
   mistake fixed.
3. **`/build` — Write one yourself.** Fill in eight blanks in a small agent skeleton. Each
   blank teaches the concept before asking, and every wrong answer gets a specific
   correction.

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

## Structure

Next.js 15 (App Router) + TypeScript + React 19, plain CSS. No API routes, so the site
prerenders to static pages.

| File | Role |
|---|---|
| `lib/intro.ts` | Stop 1 content |
| `lib/scenarios/` | Stop 2 — five recorded runs, frame by frame, one file each |
| `lib/build.ts` | Stop 3 — the blanks, answers, and per-mistake corrections |
| `lib/i18n.tsx` | Bilingual strings and the `useT()` hook |
| `lib/glossary.tsx` | Term dictionary and the `[[key:label]]` renderer |
| `lib/stops.ts` | The stop list shared by sidebar, breadcrumb, and ⌘K palette |
| `verify.mjs` | Static checks over all of the above |

---

© 2026 Weiren Feng. All rights reserved. Published for reading and portfolio purposes; not
licensed for reuse, modification, or redistribution.
