/**
 * Canvas — the xyflow surface.
 *
 * Renders only the children of `activeParentId`. Drilling into a node
 * (via NodeCard's "Open ↘" button) sets a new activeParentId, the
 * canvas re-renders with that node's children, and we fit the view.
 *
 * Dragging a node updates its `position` in the store on stop (xyflow
 * fires `onNodeDragStop`). Position is local to the parent — each level
 * of the hierarchy has its own coordinate space.
 *
 * Background: dotted pattern at very low opacity over pure black. Mini-
 * map: top-right corner, tinted to match the brand. Controls hidden in
 * v0.2 — the default xyflow controls are too prominent for our look.
 */
import { useMemo, useEffect, useCallback } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  useReactFlow,
  type Node as RFNode,
  type Edge as RFEdge,
  type NodeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useMindmapStore, selectChildren } from '../store'
import { NodeCard } from './NodeCard'

const nodeTypes = { card: NodeCard }

export function Canvas() {
  const activeParentId = useMindmapStore((s) => s.activeParentId)
  const children = useMindmapStore((s) => selectChildren(s, activeParentId))
  const updatePos = useMindmapStore((s) => s.updateNodePosition)

  const rfNodes: RFNode[] = useMemo(
    () =>
      children.map((n) => ({
        id: n.id,
        type: 'card',
        position: n.position,
        data: { node: n },
        // Cards are draggable but not selectable as edges. We don't use
        // edges yet in v0.2 (the hierarchy IS the connection), so no
        // visual lines on this canvas.
        draggable: true,
        selectable: true,
      })),
    [children],
  )

  const rfEdges: RFEdge[] = useMemo(() => [], [])

  const { fitView } = useReactFlow()
  // Re-fit when drilling. Small delay so xyflow has time to mount the
  // new nodes before measuring.
  useEffect(() => {
    const handle = window.setTimeout(() => {
      fitView({ padding: 0.2, duration: 400 })
    }, 50)
    return () => window.clearTimeout(handle)
  }, [activeParentId, fitView])

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      for (const change of changes) {
        if (change.type === 'position' && change.position && !change.dragging) {
          updatePos(change.id, change.position)
        }
      }
    },
    [updatePos],
  )

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      proOptions={{ hideAttribution: true }}
      minZoom={0.2}
      maxZoom={2}
      fitView
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
