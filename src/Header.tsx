/**
 * Header — top bar above the canvas.
 *
 * Contents:
 *   - Wordmark (mindmap.icu)
 *   - Breadcrumb showing the drill-in path
 *   - View-mode toggle (Code / User / Simplified)
 *   - Reset-to-seed button (dev convenience; will go behind a menu later)
 */
import { useMindmapStore, selectBreadcrumb } from './store'
import { VIEW_MODES, VIEW_MODE_LABELS, type ViewMode } from './types'

export function Header() {
  const viewMode = useMindmapStore((s) => s.viewMode)
  const setViewMode = useMindmapStore((s) => s.setViewMode)
  const breadcrumb = useMindmapStore(selectBreadcrumb)
  const setActiveParent = useMindmapStore((s) => s.setActiveParent)
  const resetToSeed = useMindmapStore((s) => s.resetToSeed)

  return (
    <header className="
      relative z-10 flex items-center gap-4 border-b border-white/[0.06]
      bg-black/40 backdrop-blur-xl px-4 py-2.5
    ">
      {/* Wordmark */}
      <div className="
        text-[11px] font-medium uppercase tracking-[0.32em] text-white/40
        whitespace-nowrap
      ">
        mindmap.icu
      </div>

      {/* Breadcrumb — minimal, clickable to jump back up the tree */}
      <nav className="flex min-w-0 items-center gap-1.5 text-sm">
        {breadcrumb.map((crumb, i) => (
          <span key={crumb.id} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && (
              <span className="text-white/25 select-none">›</span>
            )}
            <button
              type="button"
              onClick={() => setActiveParent(crumb.id)}
              className={`
                truncate rounded px-1.5 py-0.5 transition-colors
                ${i === breadcrumb.length - 1
                  ? 'text-white cursor-default'
                  : 'text-white/55 hover:text-white hover:bg-white/[0.04]'
                }
              `}
              disabled={i === breadcrumb.length - 1}
            >
              {crumb.label}
            </button>
          </span>
        ))}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* View-mode toggle */}
      <div
        role="tablist"
        aria-label="View mode"
        className="
          inline-flex items-center gap-0.5 rounded-lg
          border border-white/[0.08] bg-white/[0.02] p-0.5
        "
      >
        {VIEW_MODES.map((mode) => (
          <ViewModeButton
            key={mode}
            mode={mode}
            active={mode === viewMode}
            onClick={() => setViewMode(mode)}
          />
        ))}
      </div>

      {/* Reset (dev convenience) */}
      <button
        type="button"
        onClick={() => {
          if (window.confirm('Discard all changes and re-seed?')) resetToSeed()
        }}
        title="Reset to seed data"
        className="
          rounded-md border border-white/[0.08] bg-transparent
          px-2.5 py-1 text-xs text-white/45
          transition-colors hover:bg-white/[0.04] hover:text-white/70
        "
      >
        Reset
      </button>
    </header>
  )
}

function ViewModeButton({
  mode,
  active,
  onClick,
}: {
  mode: ViewMode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`
        rounded-md px-3 py-1 text-xs font-medium transition-colors
        ${active
          ? 'bg-chozen/15 text-chozen ring-1 ring-chozen/30'
          : 'text-white/55 hover:text-white hover:bg-white/[0.04]'
        }
      `}
    >
      {VIEW_MODE_LABELS[mode]}
    </button>
  )
}
