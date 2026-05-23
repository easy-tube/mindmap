/**
 * mindmap.icu — v0.2.
 *
 * Hands the screen over to the canvas. Header above, ReactFlow surface
 * below. Drill-in works via the store; view modes filter fields per node.
 *
 * The landing page from v0.1 lives in git history (commit a436db0) if we
 * ever want it back for marketing.
 */
import { ReactFlowProvider } from '@xyflow/react'
import { Canvas } from './canvas/Canvas'
import { Header } from './Header'
import { CommandPalette } from './CommandPalette'

export function App() {
  return (
    <div className="relative flex h-full min-h-full flex-col bg-black">
      {/* Same radial green wash as the landing — kept subtle so it works
          underneath the canvas content. */}
      <div
        aria-hidden
        className="
          pointer-events-none absolute inset-x-0 top-0 h-[60vh]
          bg-[radial-gradient(ellipse_at_50%_-20%,rgba(0,255,30,0.05),transparent_60%)]
        "
      />

      <ReactFlowProvider>
        <Header />
        <div className="relative flex-1">
          <Canvas />
        </div>
        <CommandPalette />
      </ReactFlowProvider>
    </div>
  )
}
