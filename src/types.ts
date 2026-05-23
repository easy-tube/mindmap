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
  /**
   * Concrete values for the kind's declared Fields. Keyed by Field.key.
   * For a component INSTANCE (componentRef !== undefined), this map
   * holds the OVERRIDES — only the keys whose values differ from the
   * referenced component's defaults. The effective data the editor
   * sees is `{ ...component.defaultData, ...node.data }`.
   */
  data: Record<string, unknown>
  /**
   * If set, this node is an instance of the given component. Its
   * effective field values are the component's defaults merged with
   * this node's `data` (overrides win). Edits write to `data` only.
   * Editing the source component updates all non-overridden fields
   * across every instance.
   */
  componentRef?: ComponentId
  /** Position in the parent's canvas — local coords. */
  position: { x: number; y: number }
  /** Optional fixed size; defaults to a sensible value if omitted. */
  size?: { w: number; h: number }
}

export type ComponentId = string

/**
 * A reusable definition. Instances reference it via `Node.componentRef`
 * and may override individual fields. Schema-wise components inherit the
 * `kindFields[kind]` schema — they don't define their own fields; they
 * provide defaults for the kind's fields.
 *
 * Naming convention: components are named like "1v1 Game Mode",
 * "Ranked Battle", etc. — capitalized, sentence-case.
 */
export type Component = {
  id: ComponentId
  name: string
  kind: NodeKind
  defaultData: Record<string, unknown>
  /** When this component was last edited at the source. */
  updatedAt: number
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
