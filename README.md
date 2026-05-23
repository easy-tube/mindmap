# mindmap.icu

**Mindmap with components.** Build product knowledge once, instance it everywhere. Edit at any depth — changes propagate automatically. AI co-edits the same tree.

> v0 — early. Not ready for general use yet. Watching this repo means you'll see the canvas + drill-in + component instances land in the next commits. Founding use case: [chozen.io](https://chozen.io) product planning, where the AI consistently loses context on per-game-mode rules across sessions; this tool is the structured persistent memory layer that fixes it.

---

## The angle (vs. Notion / Whimsical / Heptabase / Tana)

| Differentiator | Why it matters |
|---|---|
| **Component instances with overrides** (Figma's reuse model, applied to product knowledge) | Define "1v1 game mode" once. Instance it under Tournament, Mutuals, Casual. Override per-context. Edit the source — every instance updates. |
| **View modes (Blender wireframe / rendered / etc.)** | Same data, multiple lenses. Code view shows technical fields; user view shows the marketing copy; simplified view is the one-pager. Toggle. |
| **AI co-editing as a first-class concern** | The tree is structured data on disk (eventually a typed API). AI agents read, modify, and reason about the same model humans see. No 2-way sync drift. |
| **Bidirectional viewport sync** | Two panels open. Edit a node in the deep view → the overview reflects it. Change focus in the overview → the deep view follows. |

## Why this exists

Every vibe-coded product hits the same wall at month 4-6: the AI helping you build can't hold the whole product model in its head. Knowledge lives in scattered conversations, half-written specs, and your memory. Eventually the AI starts hallucinating because it's missing context.

The fix is a *structured persistent representation* of the product — typed nodes, reusable components, explicit relationships — that AI agents read from and write to alongside humans. Existing tools (Notion, Figma, Whimsical, mindmap apps) get pieces of this right but not the combination.

`mindmap.icu` is that combination.

## Status

- ✅ Repo scaffolded (Vite + React + TS + xyflow + Tailwind + Zustand)
- ✅ Deployed to [mindmap.icu](https://mindmap.icu)
- ✅ Canvas with drill-in (xyflow, custom node cards, breadcrumb)
- ✅ View modes (code / user / simplified, declared per-field)
- ✅ Component instances + overrides (Figma-style reuse)
- ✅ Add / delete / rename nodes; add-instance from any defined component
- ✅ Components manager (list, rename, safe delete)
- ✅ File save/load via File System Access API (Chrome/Edge native dialogs)
  with anchor-download fallback on other browsers
- ✅ Cmd/Ctrl+K fuzzy command palette
- ✅ Public share links (`#share=…`, compressed JSON in the URL hash)
- ✅ AI agent read/write API — see [docs/ai-integration.md](docs/ai-integration.md)
- ✅ Field completion chip per node (color-coded by % filled)
- ✅ Longtext modal editor for big fields
- ⏳ Onboarding tour
- ⏳ Real-time multiplayer (Y.js + Durable Objects)
- ⏳ Plugin system (custom kinds, custom field types, custom view modes)
- ⏳ Server-backed workspaces + auth (Google / GitHub OAuth)
- ⏳ Prezi-style camera transitions on drill-in

## Stack

- **Frontend:** Vite + React 19 + TypeScript 5 + `@xyflow/react` 12 + Zustand 5 + TailwindCSS 3
- **Backend (planned, v1):** Cloudflare Workers + D1 + Durable Objects (real-time collab via Y.js)
- **Auth (planned, v1):** GitHub OAuth
- **Hosting:** Cloudflare Pages → mindmap.icu
- **CI/CD:** GitHub Actions

## Develop

```bash
git clone https://github.com/easy-tube/mindmap
cd mindmap
npm install
npm run dev      # http://localhost:5173
```

## Architecture (target — see /docs once they land)

```
type Component = {           // a reusable definition ("1v1 game mode")
  id: string
  name: string
  fields: Field[]            // typed schema
  defaultData: Record<string, unknown>
  defaultChildren: NodeId[]
}

type Node = {                // anything on the canvas
  id: string
  parentId: NodeId | null    // null = root; otherwise nested (drill-in target)
  position: { x: number; y: number }
  size: { w: number; h: number }
  label: string
  data?: Record<string, unknown>     // concrete node
  componentRef?: ComponentId         // OR a Component instance
  overrides?: Record<string, unknown>// only the keys that differ from defaultData
}

type Field = {               // one property on a Component
  key: string
  type: 'string' | 'number' | 'bool' | 'enum' | 'longtext'
  enumValues?: string[]
  visibleIn: ViewMode[]      // which lenses surface this field
  defaultValue?: unknown
}

type ViewMode = 'code' | 'user' | 'simplified' | string   // extensible
```

The renderer + field-type system are **registries** from day one — third parties register their own node types and field types via plain JS imports, no fork needed.

## AI integration

The mindmap is structured data on disk — `.mindmap.json` files with a
documented schema. AI agents read and write the same source of truth as
human editors, no separate API.

Read [docs/ai-integration.md](docs/ai-integration.md) for the full
format spec + read/write patterns + collaboration models. Short version:

```js
const mm = JSON.parse(readFileSync('chozen.mindmap.json', 'utf8'))
// walk mm.nodes — every Node has id / parentId / kind / data / position
// resolve component instances via mm.components[node.componentRef]
// write back with shallow-clone mutations
```

This is the strategic angle. Every vibe-coded product hits the same
context-decay wall around month 4-6 because the AI helping build it
can't hold the whole model in its head. A structured persistent
representation that AI and humans both edit fixes that.

## License

MIT. Use it however. Attribution appreciated but not required.

## Contributing

Pre-product. Issues + ideas welcome. Code contributions: hold until v0.1 lands and the architecture stabilizes — happy to merge after.
