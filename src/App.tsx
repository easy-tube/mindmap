/**
 * mindmap.icu — v0 landing.
 *
 * Visual direction (locked 2026-05-23):
 *   - Pure black base + off-white text. No greys for backgrounds — only
 *     borders + secondary text.
 *   - Inter font, tight tracking on display sizes (Apple-style).
 *   - Single accent: chozen green (#00FF1E). Used on links + the
 *     selection highlight. Never on large fills.
 *   - Pillar cards: glass / Frutiger-Aero treatment via backdrop-blur +
 *     a thin top-highlight stroke. Frosted feel without any cyan.
 *   - One soft radial accent at the top of the viewport — gives depth
 *     without "AI gradient" feel.
 *
 * Real app (canvas + drill-in + view modes + components) replaces this
 * landing in the next commits. Keep this file thin so the swap is cheap.
 */
export function App() {
  return (
    <div className="relative min-h-full overflow-hidden bg-black">
      {/* Soft chozen-green wash at the top — almost imperceptible.
          Gives the page subtle vertical depth without painting it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] bg-[radial-gradient(ellipse_at_50%_-20%,rgba(0,255,30,0.07),transparent_60%)]"
      />

      <main className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-24">
        {/* Wordmark — tight uppercase tracking, low alpha. */}
        <div className="mb-8 text-[11px] font-medium uppercase tracking-[0.32em] text-white/40">
          mindmap.icu
        </div>

        {/* Hero — Inter Bold, tightest tracking, off-white. */}
        <h1 className="text-center text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tightest text-white leading-[1.02]">
          Mindmap with<br className="sm:hidden" /> components.
        </h1>

        {/* Subtitle — slightly muted, generous line-height. */}
        <p className="mx-auto mt-6 max-w-xl text-center text-lg sm:text-xl text-white/55 leading-relaxed">
          Build product knowledge once, instance it everywhere. Edit at any
          depth — changes propagate automatically. AI co-edits the same tree.
        </p>

        {/* Pillars — glass cards, thin highlight stroke at the top. */}
        <div className="mt-16 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
          <Pillar
            title="Drill-down"
            body="Click into any node — its inner canvas opens. Breadcrumb back at any depth."
          />
          <Pillar
            title="View modes"
            body="Same data, different lenses. Code / user / simplified — or define your own."
          />
          <Pillar
            title="Components"
            body="Reusable building blocks like Figma. Instance them anywhere; edit the source updates them all."
          />
        </div>

        {/* Footer — minimal, monospace-ish via tight tracking on uppercase. */}
        <div className="mt-20 text-center text-xs leading-relaxed text-white/30">
          <div>v0.0.1 — placeholder while we wire the canvas</div>
          <div className="mt-1">
            Founding use case:{' '}
            <BrandLink href="https://chozen.io">chozen.io</BrandLink>{' '}
            · OSS:{' '}
            <BrandLink href="https://github.com/easy-tube/mindmap">
              github.com/easy-tube/mindmap
            </BrandLink>
          </div>
        </div>
      </main>
    </div>
  )
}

function Pillar({ title, body }: { title: string; body: string }) {
  return (
    <div
      className="
        group relative overflow-hidden rounded-2xl
        border border-white/[0.08]
        bg-white/[0.02]
        p-5
        backdrop-blur-xl
        shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]
        transition-all duration-300
        hover:border-white/[0.14]
        hover:bg-white/[0.035]
      "
    >
      <div className="mb-1.5 text-sm font-semibold tracking-tight text-white">
        {title}
      </div>
      <div className="text-sm leading-relaxed text-white/50">{body}</div>
    </div>
  )
}

function BrandLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="
        text-chozen
        underline-offset-4
        decoration-chozen/40
        hover:text-chozen-soft
        hover:decoration-chozen
        hover:underline
        transition-colors
      "
    >
      {children}
    </a>
  )
}
