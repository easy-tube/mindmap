/**
 * Mindmap data model.
 *
 * Two top-level concepts in v0.2:
 *   - Node    — anything on the canvas. Has a parent (or null = root).
 *               Concrete data lives in `data`. Drill-in works because
 *               clicking a node sets `activeParentId` to that node's id;
 *               the canvas then renders only nodes where parentId === active.
 *   - Field   — schema declaration for a Node's data key. Fields carry
 *               their type, a default, and which view modes they appear in.
 *               In v0.2 fields are attached PER NODE-KIND (see kindFields
 *               in src/data/kinds.ts); in v0.3+ they move onto Component
 *               definitions so multiple Nodes can share a schema.
 *
 * Component (Figma-style reusable) lands in v0.3 — placeholder type left
 * here so the store shape doesn't break between minor versions.
 */

export type NodeId = string

/**
 * View mode = a lens that hides/shows fields. v0.2 ships 3 hardcoded
 * modes; later they become user-defined.
 */
export type ViewMode = 'code' | 'user' | 'simplified'

export const VIEW_MODES: ViewMode[] = ['code', 'user', 'simplified']

export const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  code: 'Code',
  user: 'User',
  simplified: 'Simplified',
}

/**
 * Field type system. Extensible — adding a new type means adding a case
 * to the renderer + the editor.
 */
export type FieldType = 'string' | 'longtext' | 'number' | 'bool' | 'enum'

export type Field = {
  key: string
  label: string
  type: FieldType
  enumValues?: string[]
  defaultValue?: unknown
  /** Which view modes surface this field. Empty = always visible. */
  visibleIn?: ViewMode[]
  /** UI hint — show this field as a placeholder when empty. */
  placeholder?: string
}

/**
 * Node kind — a string discriminator. The kindFields registry (see
 * src/data/kinds.ts) maps each kind to its Field[] schema. This is a
 * lighter-weight stand-in for Component definitions until v0.3.
 */
export type NodeKind = string

export type Node = {
  id: NodeId
  parentId: NodeId | null
  kind: NodeKind
  label: string
  /** Concrete values for the kind's declared Fields. Keyed by Field.key. */
  data: Record<string, unknown>
  /** Position in the parent's canvas — local coords. */
  position: { x: number; y: number }
  /** Optional fixed size; defaults to a sensible value if omitted. */
  size?: { w: number; h: number }
}

/**
 * v0.3 — placeholder so future serialized data shape doesn't surprise us.
 * Not used in v0.2.
 */
export type Component = {
  id: string
  name: string
  fields: Field[]
  defaultData: Record<string, unknown>
}

/**
 * Top-level state shape — what gets persisted to localStorage and
 * (eventually) D1.
 */
export type Mindmap = {
  version: 1
  rootId: NodeId
  nodes: Record<NodeId, Node>
  components: Record<string, Component>  // v0.3 — empty in v0.2
}
