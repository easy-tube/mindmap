/**
 * Zustand store — the single source of truth for the mindmap.
 *
 * Responsibilities:
 *   - Hold the Mindmap (nodes + components + version)
 *   - Track UI state: activeParentId (drill-in target), viewMode (lens)
 *   - Persist to localStorage on every mutation (debounced)
 *   - Re-hydrate on init
 *
 * Persistence in v0.2 is localStorage only. v0.3 swaps in File System
 * Access API (folder grant) for a file-backed store. v1 adds a remote
 * sync layer. The store interface stays the same — the persistence
 * adapter is the seam.
 */
import { create } from 'zustand'
import type {
  Component,
  ComponentId,
  Mindmap,
  Node as MindmapNode,
  NodeId,
  ViewMode,
} from './types'
import { seedMindmap } from './data/seed'

const STORAGE_KEY = 'mindmap.icu.v1'

function loadInitial(): Mindmap {
  if (typeof window === 'undefined') return seedMindmap
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedMindmap
    const parsed = JSON.parse(raw) as Mindmap
    // Future-proof: if version drifts, fall back to seed and notify.
    if (parsed.version !== 1) {
      console.warn('[mindmap] stored version mismatch, using seed')
      return seedMindmap
    }
    return parsed
  } catch (e) {
    console.warn('[mindmap] localStorage read failed, using seed', e)
    return seedMindmap
  }
}

let saveTimer: number | null = null
function scheduleSave(mindmap: Mindmap) {
  if (typeof window === 'undefined') return
  if (saveTimer !== null) window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mindmap))
    } catch (e) {
      console.warn('[mindmap] localStorage write failed', e)
    }
  }, 250)  // debounce — handles rapid edits during typing
}

type MindmapState = {
  mindmap: Mindmap
  /** Which parent's canvas are we viewing? rootId = top level. */
  activeParentId: NodeId
  viewMode: ViewMode

  // ─── Actions ────────────────────────────────────────────────────────

  setActiveParent: (id: NodeId) => void
  setViewMode: (mode: ViewMode) => void
  updateNodeData: (id: NodeId, key: string, value: unknown) => void
  updateNodeLabel: (id: NodeId, label: string) => void
  updateNodePosition: (id: NodeId, position: { x: number; y: number }) => void
  /** Create a new node as child of `parentId`. Returns the new node's id. */
  addNode: (input: {
    parentId: NodeId
    kind: string
    label?: string
    position?: { x: number; y: number }
  }) => NodeId
  /** Delete a node + cascade to all descendants. Returns count deleted. */
  deleteNode: (id: NodeId) => number

  // ─── Component actions ─────────────────────────────────────────────

  /**
   * Convert an existing node into a component definition.
   * - Creates a new Component with the node's `kind` + `data` as defaults.
   * - Replaces the source node with an instance of the new component
   *   (componentRef set, data cleared to {} — no overrides).
   * Returns the new component's id.
   */
  createComponentFromNode: (nodeId: NodeId, name: string) => ComponentId
  /**
   * Add a new instance of an existing component as a child of `parentId`.
   * Returns the new node's id.
   */
  addInstance: (input: { parentId: NodeId; componentId: ComponentId; label?: string }) => NodeId
  /**
   * Edit the component definition's defaults. Propagates to all non-
   * overridden fields on instances automatically (because instances
   * compute effective data on read).
   */
  updateComponentDefault: (componentId: ComponentId, key: string, value: unknown) => void
  /** Rename a component. */
  renameComponent: (componentId: ComponentId, name: string) => void
  /**
   * Reset an instance field back to the component's default — removes
   * the override. After this, edits to the component default propagate
   * to this instance for that field again.
   */
  resetInstanceOverride: (nodeId: NodeId, key: string) => void

  /** Replace the entire mindmap (used for import / reset to seed). */
  setMindmap: (mindmap: Mindmap) => void
  resetToSeed: () => void
}

export const useMindmapStore = create<MindmapState>((set, get) => {
  const initial = loadInitial()
  return {
    mindmap: initial,
    activeParentId: initial.rootId,
    viewMode: 'user',

    setActiveParent: (id) => set({ activeParentId: id }),
    setViewMode: (mode) => set({ viewMode: mode }),

    updateNodeData: (id, key, value) => {
      const { mindmap } = get()
      const node = mindmap.nodes[id]
      if (!node) return
      // For instance nodes: writes go to `data` which is the override
      // map. The merge-on-read in `effectiveData` makes overrides win.
      // If the new value matches the component default exactly, we
      // store the override anyway — explicit "I set this myself" wins.
      // (Use resetInstanceOverride() to clear an override.)
      const next: Mindmap = {
        ...mindmap,
        nodes: {
          ...mindmap.nodes,
          [id]: { ...node, data: { ...node.data, [key]: value } },
        },
      }
      set({ mindmap: next })
      scheduleSave(next)
    },

    updateNodeLabel: (id, label) => {
      const { mindmap } = get()
      const node = mindmap.nodes[id]
      if (!node) return
      const next: Mindmap = {
        ...mindmap,
        nodes: { ...mindmap.nodes, [id]: { ...node, label } },
      }
      set({ mindmap: next })
      scheduleSave(next)
    },

    updateNodePosition: (id, position) => {
      const { mindmap } = get()
      const node = mindmap.nodes[id]
      if (!node) return
      const next: Mindmap = {
        ...mindmap,
        nodes: { ...mindmap.nodes, [id]: { ...node, position } },
      }
      set({ mindmap: next })
      scheduleSave(next)
    },

    addNode: ({ parentId, kind, label, position }) => {
      const { mindmap } = get()
      // Position fallback: place next to the rightmost existing sibling,
      // or at origin if none. Caller can override.
      const siblings = Object.values(mindmap.nodes).filter(
        (n) => n.parentId === parentId,
      )
      let pos = position
      if (!pos) {
        if (siblings.length === 0) {
          pos = { x: 0, y: 0 }
        } else {
          const rightmost = siblings.reduce((acc, s) =>
            s.position.x > acc.position.x ? s : acc,
          )
          pos = { x: rightmost.position.x + 300, y: rightmost.position.y }
        }
      }
      const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const newNode: MindmapNode = {
        id,
        parentId,
        kind,
        label: label ?? 'New node',
        data: {},
        position: pos,
      }
      const next: Mindmap = {
        ...mindmap,
        nodes: { ...mindmap.nodes, [id]: newNode },
      }
      set({ mindmap: next })
      scheduleSave(next)
      return id
    },

    deleteNode: (id) => {
      const { mindmap, activeParentId } = get()
      if (id === mindmap.rootId) {
        console.warn('[mindmap] refusing to delete root node')
        return 0
      }
      if (!mindmap.nodes[id]) return 0
      // Collect the target + all transitive descendants.
      const toDelete = new Set<NodeId>([id])
      let grew = true
      while (grew) {
        grew = false
        for (const n of Object.values(mindmap.nodes)) {
          if (n.parentId && toDelete.has(n.parentId) && !toDelete.has(n.id)) {
            toDelete.add(n.id)
            grew = true
          }
        }
      }
      const nextNodes = { ...mindmap.nodes }
      for (const did of toDelete) delete nextNodes[did]
      const next: Mindmap = { ...mindmap, nodes: nextNodes }
      // If we deleted what was active, jump back up to its (former) parent.
      const newActive = toDelete.has(activeParentId)
        ? mindmap.nodes[activeParentId]?.parentId ?? mindmap.rootId
        : activeParentId
      set({ mindmap: next, activeParentId: newActive })
      scheduleSave(next)
      return toDelete.size
    },

    // ─── Component actions ─────────────────────────────────────────────

    createComponentFromNode: (nodeId, name) => {
      const { mindmap } = get()
      const node = mindmap.nodes[nodeId]
      if (!node) throw new Error(`Node ${nodeId} not found`)
      const componentId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `comp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const component: Component = {
        id: componentId,
        name: name.trim() || node.label,
        kind: node.kind,
        defaultData: { ...node.data },
        updatedAt: Date.now(),
      }
      const next: Mindmap = {
        ...mindmap,
        components: { ...mindmap.components, [componentId]: component },
        nodes: {
          ...mindmap.nodes,
          [nodeId]: {
            ...node,
            componentRef: componentId,
            data: {}, // no overrides — instance inherits everything
          },
        },
      }
      set({ mindmap: next })
      scheduleSave(next)
      return componentId
    },

    addInstance: ({ parentId, componentId, label }) => {
      const { mindmap } = get()
      const component = mindmap.components[componentId]
      if (!component) throw new Error(`Component ${componentId} not found`)
      const siblings = Object.values(mindmap.nodes).filter(
        (n) => n.parentId === parentId,
      )
      let pos = { x: 0, y: 0 }
      if (siblings.length > 0) {
        const rightmost = siblings.reduce((acc, s) =>
          s.position.x > acc.position.x ? s : acc,
        )
        pos = { x: rightmost.position.x + 300, y: rightmost.position.y }
      }
      const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const newNode: MindmapNode = {
        id,
        parentId,
        kind: component.kind,
        label: label ?? component.name,
        data: {},
        componentRef: componentId,
        position: pos,
      }
      const next: Mindmap = {
        ...mindmap,
        nodes: { ...mindmap.nodes, [id]: newNode },
      }
      set({ mindmap: next })
      scheduleSave(next)
      return id
    },

    updateComponentDefault: (componentId, key, value) => {
      const { mindmap } = get()
      const component = mindmap.components[componentId]
      if (!component) return
      const next: Mindmap = {
        ...mindmap,
        components: {
          ...mindmap.components,
          [componentId]: {
            ...component,
            defaultData: { ...component.defaultData, [key]: value },
            updatedAt: Date.now(),
          },
        },
      }
      set({ mindmap: next })
      scheduleSave(next)
    },

    renameComponent: (componentId, name) => {
      const { mindmap } = get()
      const component = mindmap.components[componentId]
      if (!component) return
      const next: Mindmap = {
        ...mindmap,
        components: {
          ...mindmap.components,
          [componentId]: { ...component, name: name.trim() || component.name },
        },
      }
      set({ mindmap: next })
      scheduleSave(next)
    },

    resetInstanceOverride: (nodeId, key) => {
      const { mindmap } = get()
      const node = mindmap.nodes[nodeId]
      if (!node || !node.componentRef) return
      if (!(key in node.data)) return // nothing to reset
      const nextData = { ...node.data }
      delete nextData[key]
      const next: Mindmap = {
        ...mindmap,
        nodes: { ...mindmap.nodes, [nodeId]: { ...node, data: nextData } },
      }
      set({ mindmap: next })
      scheduleSave(next)
    },

    setMindmap: (mindmap) => {
      set({ mindmap, activeParentId: mindmap.rootId })
      scheduleSave(mindmap)
    },

    resetToSeed: () => {
      set({ mindmap: seedMindmap, activeParentId: seedMindmap.rootId })
      scheduleSave(seedMindmap)
    },
  }
})

// ─── Selectors ────────────────────────────────────────────────────────

/** Children of a given parent, in stable order. */
export const selectChildren = (
  state: MindmapState,
  parentId: NodeId | null,
): MindmapNode[] =>
  Object.values(state.mindmap.nodes).filter((n) => n.parentId === parentId)

/**
 * For an instance node: returns the effective data after merging the
 * component's defaults with the node's overrides. For a non-instance:
 * returns the node's data unchanged. Use this any time you read
 * fields off a node for display.
 */
export function effectiveData(
  node: MindmapNode,
  components: Record<string, Component>,
): Record<string, unknown> {
  if (!node.componentRef) return node.data
  const component = components[node.componentRef]
  if (!component) return node.data
  return { ...component.defaultData, ...node.data }
}

/**
 * Is the given field overridden on this instance? (vs inheriting from
 * the source component). Returns false for non-instances.
 */
export function isFieldOverridden(node: MindmapNode, key: string): boolean {
  if (!node.componentRef) return false
  return key in node.data
}

/** Breadcrumb path from root → active. */
export const selectBreadcrumb = (
  state: MindmapState,
): Array<{ id: NodeId; label: string }> => {
  const trail: { id: NodeId; label: string }[] = []
  let cur: NodeId | null = state.activeParentId
  while (cur) {
    const node: MindmapNode | undefined = state.mindmap.nodes[cur]
    if (!node) break
    trail.unshift({ id: node.id, label: node.label })
    cur = node.parentId
  }
  return trail
}
