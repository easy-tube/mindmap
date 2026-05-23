/**
 * Canvas — the xyflow surface.
 *
 * Renders only the children of `activeParentId`. Drilling into a node
 * (via NodeCard's "Open ↘") sets a new activeParentId, the canvas
 * re-renders with that node's children, and we fit the view.
 *
 * Architecture notes (post v0.2 React #185 fix):
 *   1. Children come from the Zustand store via `useShallow` so the
 *      array reference is stable when contents haven't changed. Without
 *      this, every store mutation produces a fresh array → useEffect
 *      re-fires → setNodes → re-render → repeat → React error #185.
 *   2. xyflow's own state is managed via `useNodesState`. We sync FROM
 *      the store TO xyflow whenever children change. We sync TO the
 *      store only on position commit (drag stop). Dimension / selection
 *      changes stay internal to xyflow — no need to persist them.
 *   3. NodeCard receives only the node ID via `data.id` and reads the
 *      full node from the store itself. This keeps the xyflow `data`
 *      object tiny + stable in identity, so xyflow's internal change
 *      detection doesn't fire on every store update.
 *   4. fitView runs only when `activeParentId` actually changes (ref
 *      check), not on every render of the Canvas component.
 */
import { useEffect, useCallback, useRef } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  useReactFlow,
  useNodesState,
  type Node as RFNode,
  type Edge as RFEdge,
  type NodeChange,
} from '@xyflow/react'
import { useShallow } from 'zustand/react/shallow'
import '@xyflow/react/dist/style.css'

import { useMindmapStore, selectChildren } from '../store'
import { NodeCard } from './NodeCard'
import type { Node as MindmapNode, NodeId } from '../types'

const nodeTypes = { card: NodeCard }

type CardData = { id: NodeId }

export function Canvas() {
  const activeParentId = useMindmapStore((s) => s.activeParentId)
  // useShallow → equal when child IDs + order are the same. Mutating
  // a child still produces a new array (because the child ref changes
  // in the store), but that's fine — we want to re-sync then.
  const children = useMindmapStore(
    useShallow((s) => selectChildren(s, activeParentId)),
  )
  const updatePos = useMindmapStore((s) => s.updateNodePosition)

  const [nodes, setNodes, onNodesChangeInternal] = useNodesState<RFNode<CardData>>([])

  // Sync from store → xyflow whenever the relevant children change.
  // We rebuild the whole node array; xyflow diffs internally.
  useEffect(() => {
    setNodes(
      children.map((n) => ({
        id: n.id,
        type: 'card',
        position: n.position,
        data: { id: n.id },
        draggable: true,
        selectable: true,
      })),
    )
  }, [children, setNodes])

  // Handle changes: apply to xyflow's internal state AND propagate
  // committed position changes back to the store. Drag-in-progress
  // changes (`dragging: true`) stay internal until drag stop.
  const onNodesChange = useCallback(
    (changes: NodeChange<RFNode<CardData>>[]) => {
      onNodesChangeInternal(changes)
      for (const c of changes) {
        if (c.type === 'position' && c.position && c.dragging === false) {
          updatePos(c.id, c.position)
        }
      }
    },
    [onNodesChangeInternal, updatePos],
  )

  // fitView only when we drilled into a different parent — not on
  // every render. Without this guard, xyflow's fitView call triggers
  // an internal state update → re-render → fitView again → loop.
  const { fitView } = useReactFlow()
  const lastFittedParent = useRef<NodeId | null>(null)
  useEffect(() => {
    if (lastFittedParent.current === activeParentId) return
    lastFittedParent.current = activeParentId
    // Small delay so xyflow has time to mount the new node DOM elements
    // and measure dimensions before we fit. Otherwise fitView computes
    // bounds with zero-size nodes and over-zooms.
    const handle = window.setTimeout(() => {
      fitView({ padding: 0.2, duration: 400, maxZoom: 1.2 })
    }, 80)
    return () => window.clearTimeout(handle)
  }, [activeParentId, fitView])

  const edges: RFEdge[] = []  // v0.2 — hierarchy is implicit; no edges yet

  if (children.length === 0) {
    return <EmptyDrillState />
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      proOptions={{ hideAttribution: true }}
      minZoom={0.2}
      maxZoom={2}
      colorMode="dark"
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={24}
        size={1}
        color="rgba(255,255,255,0.06)"
      />
      <MiniMap
        position="top-right"
        pannable
        zoomable
        maskColor="rgba(0,0,0,0.85)"
        nodeColor="rgba(255,255,255,0.15)"
        nodeStrokeColor="rgba(0,255,30,0.4)"
        className="!bg-black/40 !border !border-white/10 !rounded-lg"
      />
    </ReactFlow>
  )
}

/**
 * Drill-in landed on a leaf node — there's nothing to render. Give the
 * user a clear "this is a leaf" affordance instead of a blank canvas.
 */
function EmptyDrillState() {
  const breadcrumb = useMindmapStore((s): string[] => {
    let cur: NodeId | null = s.activeParentId
    const trail: string[] = []
    while (cur) {
      const n: MindmapNode | undefined = s.mindmap.nodes[cur]
      if (!n) break
      trail.unshift(n.label)
      cur = n.parentId
    }
    return trail
  })
  const setActiveParent = useMindmapStore((s) => s.setActiveParent)
  const parent = useMindmapStore((s): NodeId => {
    const node = s.mindmap.nodes[s.activeParentId]
    return node?.parentId ?? s.mindmap.rootId
  })
  const label = breadcrumb[breadcrumb.length - 1] ?? 'this node'

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="max-w-md text-center">
        <div className="text-sm uppercase tracking-[0.2em] text-white/30 mb-3">
          Leaf
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-white mb-2">
          {label}
        </h2>
        <p className="text-sm text-white/50 leading-relaxed">
          This node has no children yet. Edit it from its parent's canvas,
          or use the breadcrumb to go back up.
        </p>
        <button
          type="button"
          onClick={() => setActiveParent(parent)}
          className="
            mt-6 inline-flex items-center gap-2 rounded-md
            border border-white/[0.08] bg-white/[0.02]
            px-4 py-2 text-sm text-white/70
            transition-colors hover:bg-white/[0.04] hover:text-white
          "
        >
          ← Back up
        </button>
      </div>
    </div>
  )
}
