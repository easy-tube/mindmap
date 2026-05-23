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
import { useEffect, useCallback, useMemo, useRef } from 'react'
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

  // KEY insight from the React #185 fix (round 2):
  //
  // We can NOT re-sync xyflow every time `children` changes — that's
  // every store mutation, including position drags. The chain that
  // creates the infinite loop:
  //   1. NodeCard's completion chip recomputes when a field fills →
  //      card height changes
  //   2. xyflow detects the new card height → fires a "dimensions"
  //      NodeChange via onNodesChange
  //   3. We forward that change to onNodesChangeInternal, xyflow's
  //      internal state updates
  //   4. (Independently) the store mutation that triggered #1 also
  //      changed `children` reference (useShallow checks per-element,
  //      and the mutated node IS a new ref)
  //   5. useEffect fires because `children` changed → setNodes called
  //   6. xyflow re-renders, dimensions get re-measured → goto 2
  //
  // The fix: only externally setNodes when the SET of children
  // changes (add / remove / reparent). Position changes from the
  // store don't need to be pushed into xyflow — they're already in
  // xyflow's state because they originated from xyflow's drag handler.
  //
  // We compute a STABLE string of "id|x|y" per child as the dep key.
  // It changes when structure changes OR when positions change. If
  // only data fields change (the common case during editing), the key
  // stays the same → useEffect doesn't fire → no loop.
  const childrenStructureKey = useMemo(
    () => children.map((n) => `${n.id}:${n.position.x},${n.position.y}`).join('|'),
    [children],
  )

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childrenStructureKey, setNodes])

  // Handle changes: apply to xyflow's internal state AND propagate
  // committed position changes back to the store.
  //
  // IMPORTANT (React #185 round 3): we MUST filter out 'dimensions'
  // changes before forwarding. xyflow's ResizeObserver fires a
  // dimension change for every node on mount + whenever a node's
  // measured size changes (which happens when the completion chip
  // updates, the menu opens, ANYTHING resizes a card). Forwarding
  // those to onNodesChangeInternal causes xyflow to update its
  // internal state with the new dimensions, which re-renders the
  // nodes, which re-runs the ResizeObserver, which fires more
  // dimension changes — the React error #185 we kept hitting.
  //
  // The dimensions are useful for fitView and edge routing, but
  // xyflow ALREADY tracks them via its internal store independently
  // of our nodes array — we don't need to propagate them through
  // setNodes. Filtering them out breaks the loop.
  const onNodesChange = useCallback(
    (changes: NodeChange<RFNode<CardData>>[]) => {
      const filtered = changes.filter((c) => c.type !== 'dimensions')
      if (filtered.length > 0) {
        onNodesChangeInternal(filtered)
      }
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
