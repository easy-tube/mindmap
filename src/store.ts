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
import type { Mindmap, Node as MindmapNode, NodeId, ViewMode } from './types'
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
