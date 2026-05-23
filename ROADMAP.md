# Mindmap roadmap — what I'm building while you're away

*Updated 2026-05-23 evening. Append-only diary of what shipped + what's next.*

---

## Live now (deployed to mindmap.icu)

Big autonomous batch shipped today. Everything in this section is live.

### v0 — Landing
- ✅ **Repo + scaffold** (`a436db0`) — Vite + React 19 + TS + xyflow + Tailwind
- ✅ **Style direction** (`d24f2db`) — chozen green accent, Inter typography,
  Frutiger-Aero glass cards, no cyan

### v0.2 — Canvas
- ✅ **xyflow canvas** with custom NodeCard, drill-in via Open ↘, breadcrumb,
  dotted background, glass minimap (`7c225c5`)
- ✅ **Bug fix — React #185 infinite loop** (`46063d8`) — useNodesState pattern,
  useShallow on store selectors, ref-guarded fitView, EmptyDrillState for leaves
- ✅ **View modes** — Code / User / Simplified, declared per-field

### v0.3 — Edit + create
- ✅ **Add-child UI + auto-layout** (`be1afcf`) — `+ Add` button + kind picker
  dropdown, places new nodes next to rightmost sibling
- ✅ **Delete-node UI** — cascading delete with child-count confirmation
- ✅ **Longtext modal editor** (`f9c4b06`) — `⤢` expand icon → fullscreen
  writing surface with live save, Esc to close
- ✅ **Cmd+K command palette** (`7ea1be3`) — fuzzy search across every label
  + breadcrumb path, ↑/↓ navigate, Enter jumps

### v0.4 — Persistence + sharing
- ✅ **URL share** (`e94bd4a`) — DEFLATE-compressed JSON in `#share=…` hash.
  Recipients prompted before their data is replaced
- ✅ **Save/Load to file** (`faa2d1a`) — File System Access API (native dialogs
  on Chrome/Edge), anchor-download fallback on Firefox/Safari

### v0.5 — Components (the killer feature)
- ✅ **Component instances + overrides** (`ea72730`) — define a node's data
  once as a component, instance it everywhere. Edit a field on an instance →
  writes to overrides (badge appears). Click the badge → reset to inherit.
  Edit a component → propagates to all instances except overrides.
- ✅ **Completion chip + Components manager** (`078cfda`) — `12/19` chip on
  every card (color-coded). Components button in header → modal listing all
  components with inline rename + safe delete (auto-detaches instances first,
  preserving effective data)

### v0.6 — AI integration
- ✅ **AI integration docs** (`04bddd7`) — `docs/ai-integration.md` documents
  the .mindmap.json schema + read/write patterns + collaboration models. The
  strategic differentiator vs Notion / Whimsical / Heptabase: structured JSON
  on disk that AI agents edit as peers.

---

## Still in flight (next batch)

When you're back / when I pick up next session:

- [ ] **Welcome modal for first-time users** — currently a new visitor sees
      the Chozen seed (confusing if they're not you). A welcome offers
      "Start blank / Try the chozen demo / Load file / Open share URL".
- [ ] **Drag-to-reparent** — drag a node onto another to make it a child.
      Restructuring without delete + recreate.
- [ ] **Multi-select + bulk operations** — shift-click to select multiple
      nodes; floating toolbar for bulk delete / set field.
- [ ] **Keyboard navigation** — arrow keys between siblings, Enter to drill in,
      Backspace to drill out, Tab to next unfilled field.
- [ ] **Undo / redo** — history stack, Ctrl+Z.
- [ ] **Auto-save indicator** — small "Saved" / "Saving…" chip in the header.
- [ ] **Onboarding tour** — first-time guided overlay explaining drill-in,
      view modes, components.

## Delayed (waiting on your hands)

- **Google OAuth** — needs OAuth client creation in your Google Cloud Console
  + a Worker backend for the callback.
- **Real-time collab via Y.js + Durable Objects** — depends on backend.
- **Custom domain → app.mindmap.icu split** — when we add a marketing site.
- **Plugin marketplace** — when we have plugins worth listing.

## Things that need design before code

- **Prezi-style camera transitions** on drill-in (rotation? orbital? smooth
  zoom?). Currently we just fitView with 400ms duration. Visually fine but
  not the "wow" you described.
- **Split-panel viewport sync** — two canvases of the same tree at
  different zoom levels, edits propagate. UX: how do users open the second
  panel? Drag-out tab? Modifier-click? Resizable splitter?
- **Multi-mindmap support** — Sidebar with workspaces? URL routing?
  Tabbed?

---

## What you'll see when you open mindmap.icu

A full editor. Header has:

- **Wordmark** (mindmap.icu)
- **Breadcrumb** (click any level to jump back)
- **Jump…** chip (opens Cmd+K palette)
- **+ Add** (single-click adds a note; ▾ dropdown picks kind OR creates an
  instance from a component)
- **Code / User / Simplified** view-mode toggle
- **Components N** (when ≥1 component exists — opens the manager)
- **File** menu (Save to file… / Load from file…)
- **Share** (generates a `#share=…` URL containing the whole mindmap)
- **Reset** (re-seed)

Canvas has 16 game-mode cards (the Chozen seed). Each card has a header with
inline-editable label + a completion chip + kind tag + ⋯ overflow menu
(Add child / Open canvas / Save as component / Delete). The body shows
fields filtered by current view mode. Longtext fields have a ⤢ icon
to open the fullscreen editor.

Drag any card to reposition. Click "Open ↘" at the bottom of a card to
drill into its children. Click any breadcrumb segment to jump back up.

Cmd+K (or ⌘K on Mac) opens the fuzzy finder.

---

## What to do when you read this

Open `mindmap.icu`. Click around. The chozen seed is loaded — drill into
Ranked, see the 16 modes laid out in a 4×4 grid (battle type columns,
gameplay style rows). Edit a field, switch view modes, try Cmd+K, share
a URL with yourself in another tab.

If anything's broken, ping me. If it feels right, also ping me — we
build on this from here.

The roadmap above is alive — I'll update it as we pick up more.
