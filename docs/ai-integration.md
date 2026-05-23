# AI integration

Mindmap is structured data on disk. Every node is a typed record, every
component is a reusable schema, every relationship is explicit. That's
exactly the shape an AI agent needs to participate as a peer editor —
not as a chat assistant that suggests changes for you to apply, but as
a teammate that reads and writes the same source of truth you do.

This doc covers the data format, the read/write patterns, and the
collaboration model.

---

## The file format

Mindmap saves to a `.mindmap.json` file (or shares via URL with the same
JSON compressed). The top-level shape:

```jsonc
{
  "version": 1,
  "rootId": "chozen",
  "nodes": {
    "chozen": {
      "id": "chozen",
      "parentId": null,
      "kind": "workspace",
      "label": "Chozen",
      "data": {
        "description": "Music-battle platform with a marketplace…"
      },
      "position": { "x": 0, "y": 0 }
    },
    "ranked": {
      "id": "ranked",
      "parentId": "chozen",
      "kind": "product-area",
      "label": "Ranked",
      "data": {
        "description": "Real-time music battles…",
        "tech_stack": "Cloudflare Durable Objects…",
        "status": "In progress"
      },
      "position": { "x": 0, "y": 220 }
    },
    "mode-1v1-flip-loop": {
      "id": "mode-1v1-flip-loop",
      "parentId": "ranked",
      "kind": "game-mode",
      "label": "1v1 Flip Loop",
      "data": {
        "battle_type": "1v1",
        "gameplay_style": "flip-loop",
        "player_count": "2/2",
        "prep_sec": 45,
        "ranked": true,
        // … more fields
      },
      "position": { "x": 0, "y": 0 },

      // Optional — only present on component instances:
      "componentRef": "abc-123",
      // For instances, `data` above contains ONLY override values,
      // not the full effective data. Compute effective data by merging
      // the component's defaults with the instance's data:
      //   effectiveData = { ...components[componentRef].defaultData, ...node.data }
    }
  },
  "components": {
    "abc-123": {
      "id": "abc-123",
      "name": "1v1 Game Mode",
      "kind": "game-mode",
      "defaultData": {
        "battle_type": "1v1",
        "player_count": "2/2",
        "ranked": true
        // … fields shared across all 1v1 modes
      },
      "updatedAt": 1748033842000
    }
  }
}
```

### Field reference

**`Mindmap`** (top level)
- `version` (1) — bump when the schema changes incompatibly
- `rootId` — id of the root node (must exist in `nodes`)
- `nodes` — map of every node, keyed by id
- `components` — map of every component definition (empty `{}` if none)

**`Node`**
- `id` — UUID-shaped string, stable across edits
- `parentId` — id of the parent node, or `null` for the root only
- `kind` — string discriminator (see "Kinds" below)
- `label` — human-readable title shown on the card
- `data` — `Record<string, unknown>`. For concrete nodes, the
  authoritative field values. For instances, ONLY the override values.
- `position` — `{ x, y }` in the parent's local canvas coordinate space
- `componentRef` (optional) — id of the linked component
- `size` (optional) — `{ w, h }` override; defaults if absent

**`Component`**
- `id` — UUID-shaped string
- `name` — human-readable name shown on instances
- `kind` — must match the kind of all instances
- `defaultData` — values inherited by every instance unless overridden
- `updatedAt` — ms-since-epoch timestamp of last edit

### Kinds (the schema discriminator)

A kind is a registered schema. Each kind declares its fields (type, view
mode visibility, default, placeholder) in `src/data/kinds.ts`. Adding a
new kind = add an entry there + (optionally) a custom renderer.

Current kinds shipped with the seed:
- `workspace` — top-level container (Chozen)
- `product-area` — major product surface (Marketplace, Ranked, Uploader)
- `game-mode` — battle type × gameplay style (1v1 Flip Loop, etc.)
- `note` — free-text card

When you write a node with `kind: "game-mode"`, the editor knows to look
up `kindFields["game-mode"]` and render the declared fields. Unknown
kinds render with no fields (just label + drill-in).

### View modes

A field's `visibleIn` array decides which view modes surface it.
Currently 3 view modes: `code` / `user` / `simplified`. The viewer
toggles between them via the header. AI agents don't have a view mode —
they always see all fields.

---

## Reading the file

### From a CLI / script

```bash
# Read the whole tree
cat chozen-2026-05-23.mindmap.json | jq .

# All node labels under the 'ranked' parent
jq '.nodes | to_entries | map(select(.value.parentId == "ranked")) | map(.value.label)' file.mindmap.json

# Find all game-mode nodes with an empty render_max_sec
jq '.nodes | to_entries | map(select(.value.kind == "game-mode" and (.value.data.render_max_sec == null or .value.data.render_max_sec == ""))) | map({id: .value.id, label: .value.label})' file.mindmap.json
```

### From an AI agent (Claude / GPT / etc.)

If you have file-system access to the user's `.mindmap.json`:

1. **Read the file.** Parse the JSON.
2. **Walk the tree.** `nodes[rootId]` is the root; recurse children by
   filtering `nodes` where `parentId === current.id`.
3. **For an instance node** (has `componentRef`): compute the effective
   data:
   ```js
   const effective = node.componentRef
     ? { ...components[node.componentRef].defaultData, ...node.data }
     : node.data
   ```
4. **Reason / answer / propose changes.**

If you only have a URL (`https://mindmap.icu/#share=…`):

1. Decode the base64url after `#share=`.
2. DEFLATE-decompress the bytes (use the `DecompressionStream` API in
   browsers, or `pako.inflate` in Node).
3. Parse the resulting JSON.

The encoding is symmetric — `encodeMindmapToUrl()` in
[`src/persistence/urlShare.ts`](../src/persistence/urlShare.ts) is the
reference implementation.

---

## Writing the file

### Rules of engagement

Whatever schema you write must round-trip cleanly through the app's
validators. The minimal viable invariants:

1. **`version === 1`** (or whatever the app's current version is).
2. **`rootId` is a key in `nodes`** — the root must exist.
3. **Every `parentId` (when non-null) is a key in `nodes`** — no
   dangling references.
4. **No cycles in the parent graph.** Each node has exactly one parent
   (or null for the root).
5. **Every `componentRef` (when present) is a key in `components`** —
   no broken instance links.
6. **`position` is always set** to a finite `{ x, y }` pair — even on
   programmatically-created nodes. Use `{ x: 0, y: 0 }` if you don't
   care.
7. **Node IDs are stable.** Don't regenerate IDs on save. The user's
   undo history (when we add it) keys off them.

### Writing as an AI agent — the safe pattern

```js
// 1. READ the current file
const mm = JSON.parse(readFileSync('chozen.mindmap.json', 'utf8'))

// 2. MUTATE — shallow-clone the tree at each level you touch
const next = {
  ...mm,
  nodes: {
    ...mm.nodes,
    [targetId]: {
      ...mm.nodes[targetId],
      data: {
        ...mm.nodes[targetId].data,
        render_max_sec: 130,
      },
    },
  },
}

// 3. VALIDATE — re-check invariants
if (!next.nodes[next.rootId]) throw new Error('rootId missing')
for (const n of Object.values(next.nodes)) {
  if (n.parentId && !next.nodes[n.parentId]) {
    throw new Error(`dangling parentId on ${n.id}: ${n.parentId}`)
  }
}

// 4. WRITE
writeFileSync('chozen.mindmap.json', JSON.stringify(next, null, 2))
```

### Creating a new node

```js
const newId = crypto.randomUUID()
const next = {
  ...mm,
  nodes: {
    ...mm.nodes,
    [newId]: {
      id: newId,
      parentId: 'ranked',
      kind: 'game-mode',
      label: 'New mode',
      data: {},
      position: { x: 0, y: 0 },
    },
  },
}
```

### Editing a component instance's overrides

```js
// targetNode.componentRef is set
const overrideNext = {
  ...mm,
  nodes: {
    ...mm.nodes,
    [targetId]: {
      ...targetNode,
      data: {
        ...targetNode.data,   // existing overrides
        render_max_sec: 90,   // new override
      },
    },
  },
}
```

To CLEAR an override (and re-inherit from the component):

```js
const { render_max_sec, ...restOverrides } = targetNode.data
const next = {
  ...mm,
  nodes: {
    ...mm.nodes,
    [targetId]: { ...targetNode, data: restOverrides },
  },
}
```

### Creating a component from a node

```js
const compId = crypto.randomUUID()
const next = {
  ...mm,
  components: {
    ...mm.components,
    [compId]: {
      id: compId,
      name: '1v1 Game Mode',
      kind: 'game-mode',
      defaultData: { ...sourceNode.data },  // copy current values as defaults
      updatedAt: Date.now(),
    },
  },
  nodes: {
    ...mm.nodes,
    [sourceNodeId]: {
      ...sourceNode,
      componentRef: compId,
      data: {},  // no overrides on the first instance
    },
  },
}
```

---

## Collaboration patterns

### Pattern 1 — AI fills in a backlog

The user (Thommy) has 16 game-mode nodes with mostly empty fields. He
points the AI at the file and says: *"Fill in `intro_text_rule_summary`
for every game mode. Keep it to 12-15 words. Match the existing tone
of the descriptions on `mode-1v1-flip-loop` and `mode-1v1-make-beat`."*

The AI:
1. Reads the file.
2. Finds the two example modes, reads their data.
3. For each game-mode node missing the field, generates a summary in
   the same tone.
4. Writes the file back with all the new values.

User reloads `mindmap.icu` (auto-loads from localStorage; if they used
File → Load they re-load) and sees the additions.

### Pattern 2 — AI proposes structure

User: *"Look at the 16 game modes. Suggest 3-4 reusable Components
that would capture the shared data so we don't repeat ourselves."*

The AI:
1. Reads the file.
2. Groups nodes by similarity (e.g. all 1v1 share player_count and
   prep_sec; all flip-loop share has_loop_intro and reel_path).
3. Writes 3-4 new component definitions with the shared defaults.
4. Converts the 16 nodes into instances that override only their
   distinguishing fields.
5. User reloads → sees the structure compacted, edits the components
   to refine.

### Pattern 3 — AI explains the tree

User opens the canvas, drills into a node, says: *"Summarize what's
here in plain language, including any inherited fields from the
component."*

The AI:
1. Reads the file.
2. For the current node, computes effective data (merge defaults +
   overrides).
3. Writes a paragraph describing what's set, what's inherited, what's
   still empty.

(Currently this happens in chat — the AI consumes the file directly.
A future v0.4 feature is an in-canvas "Ask the AI about this node"
button.)

### Pattern 4 — AI maintains consistency

User edits one component's default. Across many instances, some
overrides become redundant (they happen to match the new default).
The AI can periodically scan and offer: *"5 instances have an override
on `prep_sec: 45` which now matches the component default — want me
to clear those overrides so they re-inherit?"*

---

## Open API

The file IS the API. There's no separate REST endpoint, no GraphQL, no
SDK. Just JSON on disk (or in the URL hash, or in localStorage). Any
language can read it; any AI can write it.

If you build something that talks to `.mindmap.json` files, open a PR
adding a link here. The list:

- **`mindmap.icu` web app** ([source](https://github.com/easy-tube/mindmap)) —
  the reference editor
- (your tool here)

---

## Versioning policy

The `version` field at the top of the mindmap is currently `1`. The
schema is in pre-1.0 — we may break it without a deprecation window
until the first non-`0.x` release of the app.

When the schema changes:
- Backwards-incompatible changes bump `version` AND ship a migrator in
  `src/persistence/migrate.ts` (planned for v0.4).
- The editor refuses to load mindmaps with a `version` it doesn't
  recognize.

If you build tooling on this format, **pin to a version** and re-test
when the editor's version increments.

---

*This doc is part of the OSS mindmap project — feedback and corrections
welcome at <https://github.com/easy-tube/mindmap/issues>.*
