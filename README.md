# AgentLab — See Inside the Agent

**▶ [Open the course](https://agent-lab-blond.vercel.app)** — runs in your browser, nothing to install.

An interactive explainer for people starting from zero. It takes an AI agent apart and
plays it back in slow motion: on the left, the conversation an ordinary user sees; on the
right, an X-ray — the `messages` array being sent to the API, growing one step at a time.

**The point: an agent is an array and a loop.**

![Stop one: what an agent actually is](docs/home.jpg)

*Stop one: what an agent actually is*

![The X-ray view — the messages array growing one step at a time](docs/loop.jpg)

*The X-ray view — the messages array growing one step at a time*

## Three stops

1. **`/` — What an agent is.** From "a model only turns text into text" to "a program that
   loops and calls tools", without a line of code.
2. **`/loop` — Watch it run.** Step through one complete run. The button labels *are* the
   beats of the loop: send the task → call the model → run the tool → send the result back → …
   The code panel highlights the lines in play; the token counter shows the cost of resending
   the whole history each round.
3. **`/build` — Write one yourself.** Fill in eight blanks in a real agent skeleton. Each
   blank teaches the concept before asking, and every wrong answer gets a specific
   correction rather than a red cross.

## Running locally

Requires Node ≥ 18.18 (an `.nvmrc` is included):

```bash
nvm use         # switch to Node 22
npm install
npm run dev     # http://localhost:3000
```

## Notes on design

- **Simulated by default.** Every response comes from recorded data in `lib/scenario.ts` —
  no API key needed, and nothing to spend. That also makes it safe to share.
- **Bilingual.** Every string is a `{ zh, en }` pair in `lib/i18n.tsx`.
- **A glossary built into the prose.** Writing `[[key:label]]` renders a clickable term that
  pops up a beginner-level explanation.
- **Progress persists** to `localStorage`, so closing the tab does not lose your place.

## Structure

Next.js 15 (App Router) + TypeScript + React 19, plain CSS. No API routes, so the site
prerenders to static pages.

| File | Role |
|---|---|
| `lib/intro.ts` | Stop 1 content |
| `lib/scenario.ts` | Stop 2 — the recorded run, frame by frame |
| `lib/build.ts` | Stop 3 — the blanks, answers, and per-mistake corrections |
| `lib/i18n.tsx` | Bilingual strings and the `useT()` hook |
| `lib/glossary.tsx` | Term dictionary and the `[[key:label]]` renderer |

---

© 2026 Weiren Feng. All rights reserved. Published for reading and portfolio purposes; not
licensed for reuse, modification, or redistribution.
