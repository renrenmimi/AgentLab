# Changelog

## 2026-10-09 to 2026-10-10 — audit fixes

An audit of the site covered bugs, UI and UX, accessibility, performance and
the teaching content in both languages. It produced 31 findings on the code
and the experience and 71 on the content. Each fix below is its own pull
request, and all are merged into `main`. `verify.mjs` now runs 25 checks
(24 before), and the in-page suite still passes 123 of 123 at all three
widths.

### Bugs

- Cold loads no longer fail to hydrate about one time in five. The two
  pre-paint scripts moved from `<head>` to the top of `<body>`, and the
  providers write the theme, language and rail attributes back onto `<html>`
  after mounting, so a client re-render cannot lose a reader's settings
  ([#44]). Before, a failed hydration cleared them: a reader who had chosen
  the light theme got the dark one, and `<html lang>` fell back to `en`. On
  production, 40 of 202 cold loads hit React error #418 before; afterwards,
  0 of 210, with every reader's settings kept.
- `/cost`, `/context` and `/instructions` hydrate in browsers whose locale
  groups digits differently from en-US; numbers are grouped the same way in
  both languages ([#44]). In de-DE every load of `/cost` and `/context` failed
  before; afterwards, 0 of 60 across the three stops.
- A browser that blocks site data no longer gets "Application error"; the
  theme read was the one unguarded storage access ([#44]).
- A search result for a paragraph lands on that paragraph, on `/all`, instead
  of at the top of a stop that has no such anchor. Snippets show a
  cross-reference as the page does ("stop 13"), and a query in Chinese finds
  Chinese text from the English interface ([#47]).
- Opening `/all#<heading>` lands on the heading in Chinese too; it used to
  land about 2,400 px past it ([#52]).
- Tabs no longer overwrite each other's progress. A stop counts as read once
  you leave it, and the ticks and the count agree ([#53]).
- `/build` says its verdict again in the new language when you switch, and
  cross-references in the prose navigate in place instead of reloading the
  page ([#53]).

### Interaction and accessibility

- The command palette is a combobox to screen readers; Tab stays inside it,
  focus returns to where it was when it closes, and typing moves the
  highlight back to the first result ([#47]).
- Focus no longer falls to the top of the page when a control goes away under
  the reader: at the end of a run, after answering a group check, after the
  eighth blank on `/build`, and after a choice on `/permission` ([#50]).
- The drawer at narrow widths is out of the Tab order when closed. Opened,
  it takes focus, keeps it, closes on Escape or with its own close button,
  and gives focus back to the menu button ([#50]).
- Space on a "beginner question" opens it instead of advancing the run, and
  keys with a modifier are left to the browser ([#50]).
- Glossary definitions are read out when a term opens, and the "?" after a
  term is no longer part of its name. `/build` verdicts are announced. The
  temperature slider reports the temperature, the progress bar has a name,
  and the current progress dot is marked as the current step ([#51]).
- Progress dots, FAQ summaries, sliders and the small links on `/all` and
  `/next` are at least 24 px to touch ([#51]).
- Reduced motion turns off smooth scrolling ([#51]).

### Layout and text

- The cost chart's axis labels are readable on a phone; they were about 5 px
  tall ([#52]).
- The Chinese interface no longer shows "STEP"; the English one no longer
  shows Chinese in a card tag or a tool's output ([#52]).
- The breadcrumb names `/all` as the one-page view, does not call a missing
  page stop 1, and shows the stop's name on a phone instead of "Wat…"
  ([#52]).
- A missing page has its own page in both languages ([#52]).
- Share cards end their description at a word boundary ([#52]).
- The toolbar shows Ctrl K off a Mac ([#52]).

### Performance

- The search index loads the first time the palette opens, so a stop no
  longer downloads the other thirteen stops' text. First-load JavaScript per
  stop on production drops from 265 KB to 152 KB on average (brotli, −43%;
  261–269 KB before, 140–171 KB after). `/all` still loads all of it
  ([#47]).
- Stepping a run no longer re-renders the whole page on every frame of the
  token count; at 4× CPU slowdown a step costs 36 ms of script instead of
  about 70 ms ([#53]).

### Teaching content

- Markers such as `[[stop:/loop]]` render as links and glossary terms
  everywhere instead of as brackets, including inside bold, and a content
  check keeps them out of plain-text fields ([#38]).
- The five recorded runs at stop 2 match the code they show: the failing
  `exec`, the replayed arrays with their `tool_use` messages, one meaning
  for the token count, an example context limit, and a wrong-tool run that
  no longer gives the answer away in a tool name ([#39]).
- Stop 3's closing card describes the stops that follow and links to the
  next one from the stop list; unquoted answers are accepted with a note
  about the quotes; stop 1's loop includes appending the reply ([#40]).
- Temperature zero is not presented as a determinism guarantee, claims
  about what a model knows are narrowed, and sampling is placed on the
  server ([#41]).
- A structural guarantee has to close every route: the "remove the tool"
  condition now removes `run_command` as well as `send_email`; `/tools`
  shows valid JSON Schema and an example whose numbers add up ([#42]).
- The cost chart's conclusion follows the chart, and the context summary
  keeps a tool call and its result together ([#43]).
- The trust stop's exit restrictions cover links in the model's output,
  the route its own example uses; an error no longer counts as proof that
  nothing happened; reading a file is no longer called reversible ([#45]).
- The last group's example, the limits of a single run per task, and what
  the model knows about a task ([#46]).
- The use-before-taught check reads everything a reader meets at each
  stop; page descriptions, the `/all` note and Chinese punctuation are
  corrected ([#49]).

### Tooling and documentation

- The in-page suite lets Chrome choose its own debugging port and waits up
  to a minute for it. Twice in this round a CI run failed before its first
  assertion because the driver's random port or its fifteen-second wait did
  not hold on the runner ([#48]).
- The README and CLAUDE.md describe the course as it is now: the stop list
  and its numbering, the measured "what it assumes" table, search, `/all`,
  progress and the pre-paint scripts. The four README images were retaken
  the way the originals were: 1440×900 at a device scale factor of 2, dark
  theme, English, from a local production build ([#54]).

### Not changed

- English is the default language; a reader who chose Chinese sees English
  until the page hydrates.
- The browser tab title stays in English: titles come from Next's metadata,
  and making them follow the language would need a route per language.
- The English title of stop 10, "Tool output is not your friend".
- The "what time is it" example at stop 5.
- The fuse warning in the run that will not stop can misfire when the
  eighth round ends normally; the snippet is about something else.

[#38]: https://github.com/renrenmimi/AgentLab/pull/38
[#39]: https://github.com/renrenmimi/AgentLab/pull/39
[#40]: https://github.com/renrenmimi/AgentLab/pull/40
[#41]: https://github.com/renrenmimi/AgentLab/pull/41
[#42]: https://github.com/renrenmimi/AgentLab/pull/42
[#43]: https://github.com/renrenmimi/AgentLab/pull/43
[#44]: https://github.com/renrenmimi/AgentLab/pull/44
[#45]: https://github.com/renrenmimi/AgentLab/pull/45
[#46]: https://github.com/renrenmimi/AgentLab/pull/46
[#47]: https://github.com/renrenmimi/AgentLab/pull/47
[#48]: https://github.com/renrenmimi/AgentLab/pull/48
[#49]: https://github.com/renrenmimi/AgentLab/pull/49
[#50]: https://github.com/renrenmimi/AgentLab/pull/50
[#51]: https://github.com/renrenmimi/AgentLab/pull/51
[#52]: https://github.com/renrenmimi/AgentLab/pull/52
[#53]: https://github.com/renrenmimi/AgentLab/pull/53
[#54]: https://github.com/renrenmimi/AgentLab/pull/54
