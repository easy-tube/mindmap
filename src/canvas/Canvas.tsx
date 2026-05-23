/**
 * Canvas — the xyflow surface.
 *
 * Renders only the children of `activeParentId`. Drilling into a node
 * (via NodeCard's "Open ↘") sets a new activeParentId, the canvas
 * re-renders with that node's children, and we fit the view.
 *
 * Architecture (post-React-#185-round-4 — the loop kept coming back):
 *
 *   The root cause was xyflow's `nodes` prop changing IDENTITY on every
 *   store mutation. Even with useShallow on the children selector + a
 *   structureKey dep on useEffect + filtering 'dimensions' changes from
 *   onNodesChange, *something* in the chain (likely xyflow's internal
 *   ResizeObserver reacting to NodeCard layout shifts from the completion
 *   chip) kept triggering measure → setNodes → re-measure → loop.
 *
 *   The bullet-proof fix: memoize the rfNodes array on the IDENTITY of
 *   (activeParentId, child-ids) — NOT on children itself. Data edits and
 *   committed position updates don't trigger a new rfNodes reference,
 *   so xyflow's `nodes` prop is stable, so xyflow doesn't re-mount nodes,
 *   so no re-measure cascade. Drag positions live in xyflow's internal
 *   state and round-trip back to our store on drag-stop without going
 *   through the rfNodes recompute path.
 *
 *   This means: positions in the store can briefly drift from positions
 *   shown on canvas (until structure changes or parent switches and the
 *   memo recomputes). For our use case — drag is the only thing that
 *   changes positions, and xyflow's display is the source of truth during
 *   a session — that's fine.
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
  const children = useMindmapStore(
    useShallow((s) => selectChildren(s, activeParentId)),
  )
  const updatePos = useMindmapStore((s) => s.updateNodePosition)

  // Structure key = activeParentId + sorted child ids. Doesn't change
  // when data fields or positions update — only when the SET of children
  // (or current parent) changes.
  const childIdsKey = useMemo(
    () => children.map((n) => n.id).sort().join(','),
    [children],
  )

  // Memoize rfNodes on structure only. Data + position edits don't
  // produce a new array reference, so xyflow's `nodes` prop is stable
  // through field-editing sessions.
  //
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `children` is
  // deliberately NOT a dep; we read it inside the memo for current values
  // but only recompute on structural changes.
  const rfNodesInitial = useMemo<RFNode<CardData>[]>(
    () =>
      children.map((n) => ({
        id: n.id,
        type: 'card',
        position: n.position,
        data: { id: n.id },
        draggable: true,
        selectable: true,
      })),
    [activeParentId, childIdsKey],
  )

  // useNodesState gives xyflow controlled state. We seed it with our
  // memoized array and only push updates when the memo recomputes.
  const [nodes, setNodes, onNodesChangeInternal] =
    useNodesState<RFNode<CardData>>(rfNodesInitial)

  useEffect(() => {
    setNodes(rfNodesInitial)
  }, [rfNodesInitial, setNodes])

  // Forward node changes to xyflow's internal state EXCEPT dimensions.
  // Dimension changes from ResizeObserver triggered the loop on previous
  // attempts; xyflow tracks dimensions internally via its own store for
  // fitView + minimap purposes, separate from the nodes array.
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

  // fitView only when we drill into a different parent.
  const { fitView } = useReactFlow()
  const lastFittedParent = useRef<NodeId | null>(null)
  useEffect(() => {
    if (lastFittedParent.current === activeParentId) return
    lastFittedParent.current = activeParentId
    const handle = window.setTimeout(() => {
      fitView({ padding: 0.2, duration: 400, maxZoom: 1.2 })
    }, 80)
    return () => window.clearTimeout(handle)
  }, [activeParentId, fitView])

  const edges: RFEdge[] = []

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
