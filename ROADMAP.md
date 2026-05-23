# Mindmap roadmap — what I'm building while you're away

*Updated 2026-05-23. Append-only diary of what shipped + what's next. Skip
straight to "Live now" + "In flight" if you want the current state.*

---

## Live now (deployed to mindmap.icu)

- ✅ **v0.1 landing** (`a436db0`) — placeholder page
- ✅ **v0.1.1 style direction** (`d24f2db`) — chozen green accent, Inter
  typography, Frutiger-Aero glass cards, no cyan
- ✅ **v0.2 canvas** (`7c225c5`) — xyflow, custom node card, view modes
  (Code / User / Simplified), drill-in via "Open ↘", inline field editing,
  localStorage persist, breadcrumb header, seeded with the 16 Chozen modes
- ✅ **v0.2.1 fix** (`46063d8`) — React #185 infinite-loop fix; xyflow
  controlled state via `useNodesState`, `useShallow` on store selectors,
  ref-guarded `fitView`, leaf-level `EmptyDrillState`

## In flight (this autonomous batch, 2026-05-23 evening)

Working top to bottom, committing per chunk, pushing as I go. Open
the live site after each commit to see progress.

- [ ] **Add-child UI** — right-click + button to create new nodes. Currently
      the seed is the only structure; you can't grow the mindmap beyond it.
      ETA ~1h.
- [ ] **Delete-node UI** — right-click → Delete. Cascading delete for
      children. ETA ~20min.
- [ ] **Longtext modal editor** — click a longtext field → opens a full-
      screen modal with proper writing surface. Currently small textareas
      are hard to use for `exceptions` / `intro_text_rule_summary`. ETA ~45min.
- [ ] **Cmd+K command palette** — fuzzy search all nodes by label, jump to
      any. Essential for navigation as the mindmap grows. ETA ~1.5h.
- [ ] **URL share viewport** — read-only view via `?share=<hash>`. The
      "share with users" angle from your vision. ETA ~30min.
- [ ] **Component instances + overrides** — the killer feature. Define
      "1v1 game mode" once, instance it under Tournament / Mutuals etc.,
      override per-context. ETA ~3-4h.
- [ ] **File System Access API persistence** — grant folder access once,
      JSON files on disk. Makes me able to read/write the same data you
      see. ETA ~1h.
- [ ] **Auto-layout for new nodes** — don't stack at (0,0); place near
      viewport center or next to last sibling. ETA ~20min.

## Delayed (waiting on your hands)

- **Google OAuth** — needs OAuth client creation in your Google Cloud
  Console + a Worker backend for the callback. Picking this up when you
  get back.
- **Cloudflare Pages → Workers + D1 backend** — needs CF API tokens +
  zone setup. Defer to v1.
- **Real-time collab via Y.js + Durable Objects** — depends on backend.
  v2 territory.

## Done over multiple sessions (epoch markers)

- 2026-05-23 (today): repo created → live site → canvas → bug fix → this
  autonomous batch.

## Open architecture decisions I'm making while you're away

- **Component instances** will be a NEW kind of Node with `componentRef` +
  `overrides`. Existing nodes stay concrete. Easy migration: select a
  group → "Save as component" → those nodes become an instance of a new
  Component. Source-of-truth lives in `Mindmap.components`.
- **URL share** will use LZ-string compression of the mindmap JSON in a
  hash fragment so it works without a backend. Limits to ~50KB before
  URLs get unwieldy; fine for the demos this is meant for.
- **File System Access API** will fall back to localStorage where the API
  isn't supported (Firefox, Safari). Chrome + Edge get the real folder.
- **Add-node UI** will default to `kind: 'note'` (free-text) for fastest
  capture. Promote to a typed kind via a dropdown on the new node.

## What to do when you read this

Just open `mindmap.icu`. Everything's automatic. The structure may have
grown — every commit on `main` deploys.

If anything's broken, ping me; if it looks great, also ping me. Both are
useful signals.
