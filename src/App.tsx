/**
 * mindmap.icu — v0 placeholder.
 *
 * Real app lands in the next commits:
 *   - xyflow canvas + drill-in (src/canvas/)
 *   - view modes (src/views/)
 *   - component instances (src/components/)
 *   - file persistence (src/persistence/)
 *
 * For now this renders a landing card so the deploy pipeline can run
 * end-to-end before we layer in the actual mindmap surface.
 */
export function App() {
  return (
    <main className="min-h-full flex items-center justify-center px-6 py-12">
      <div className="max-w-2xl w-full">
        <div className="mb-3 text-xs uppercase tracking-[0.2em] text-accent">
          mindmap.icu
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-neutral-100 leading-tight">
          Mindmap with components.
        </h1>
        <p className="mt-4 text-lg text-neutral-300 leading-relaxed">
          Build product knowledge once, instance it everywhere. Edit at any
          depth — changes propagate automatically. AI co-edits the same tree.
        </p>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <Pillar
            title="Drill-down"
            body="Click into any node — its inner canvas opens. Breadcrumb back at any depth."
          />
          <Pillar
            title="View modes"
            body="Same data, different lenses. Code / user / simplified, or define your own."
          />
          <Pillar
            title="Components"
            body="Reusable building blocks like Figma. Instance them anywhere; edit the source updates them all."
          />
        </div>
        <div className="mt-10 text-xs text-neutral-500">
          v0.0.1 — placeholder while we wire the canvas. Founding use case:{' '}
          <a
            href="https://chozen.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            chozen.io
          </a>{' '}
          product planning. OSS:{' '}
          <a
            href="https://github.com/easy-tube/mindmap"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            github.com/easy-tube/mindmap
          </a>
        </div>
      </div>
    </main>
  )
}

function Pillar({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
      <div className="text-neutral-100 font-semibold mb-1">{title}</div>
      <div className="text-neutral-400 leading-snug">{body}</div>
    </div>
  )
}
