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
import { useState } from 'react'
import { ShareModal } from './ShareModal'
import { ComponentsManager } from './ComponentsManager'
import { saveMindmapToFile, loadMindmapFromFile } from './persistence/fileSystem'
// import { AuthButton } from './AuthButton'  // disabled — isolating loop

export function Header() {
  const viewMode = useMindmapStore((s) => s.viewMode)
  const setViewMode = useMindmapStore((s) => s.setViewMode)
  const breadcrumb = useMindmapStore(selectBreadcrumb)
  const setActiveParent = useMindmapStore((s) => s.setActiveParent)
  const resetToSeed = useMindmapStore((s) => s.resetToSeed)
  const mindmap = useMindmapStore((s) => s.mindmap)
  const setMindmap = useMindmapStore((s) => s.setMindmap)
  const [shareOpen, setShareOpen] = useState(false)
  const [componentsOpen, setComponentsOpen] = useState(false)
  const [fileMenuOpen, setFileMenuOpen] = useState(false)
  const componentCount = useMindmapStore(
    (s) => Object.keys(s.mindmap.components).length,
  )

  const saveToFile = async () => {
    try {
      await saveMindmapToFile(mindmap)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (!msg.toLowerCase().includes('abort')) {
        // User-cancel is fine; surface only real errors.
        window.alert(`Save failed: ${msg}`)
      }
    } finally {
      setFileMenuOpen(false)
    }
  }

  const loadFromFile = async () => {
    try {
      const next = await loadMindmapFromFile()
      if (window.confirm(
        `Replace current mindmap with file contents?\n\n` +
        `Loading: ${Object.keys(next.nodes).length} nodes`,
      )) {
        setMindmap(next)
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (!msg.toLowerCase().includes('abort')) {
        window.alert(`Load failed: ${msg}`)
      }
    } finally {
      setFileMenuOpen(false)
    }
  }

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

      {/* Cmd+K hint */}
      <CommandPaletteHint />

      {/* + Add */}
      <AddNodeButton />

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

      {/* File menu — save / load */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setFileMenuOpen((o) => !o)}
          title="Save / Load file"
          className="
            inline-flex items-center gap-1 rounded-md
            border border-white/[0.08] bg-transparent
            px-2.5 py-1 text-xs text-white/70
            transition-colors hover:bg-white/[0.04] hover:text-white
          "
        >
          File
          <span className="text-[9px] -mr-1">▾</span>
        </button>
        {fileMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setFileMenuOpen(false)}
            />
            <div
              className="
                absolute right-0 top-full z-50 mt-2 w-52
                rounded-lg border border-white/[0.1] bg-black/95
                backdrop-blur-xl
                shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]
                py-1
              "
            >
              <FileMenuItem
                label="Save to file..."
                hint="Download as .mindmap.json"
                onClick={saveToFile}
              />
              <FileMenuItem
                label="Load from file..."
                hint="Open .mindmap.json"
                onClick={loadFromFile}
              />
            </div>
          </>
        )}
      </div>

      {/* Components manager */}
      {componentCount > 0 && (
        <button
          type="button"
          onClick={() => setComponentsOpen(true)}
          title="Manage components"
          className="
            inline-flex items-center gap-1.5 rounded-md
            border border-white/[0.08] bg-transparent
            px-2.5 py-1 text-xs text-white/70
            transition-colors hover:bg-white/[0.04] hover:text-white
          "
        >
          <span>Components</span>
          <span className="
            text-[9px] font-mono tabular-nums px-1.5 py-0
            rounded-full bg-chozen/15 text-chozen ring-1 ring-chozen/30
          ">
            {componentCount}
          </span>
        </button>
      )}

      {/* Share */}
      <button
        type="button"
        onClick={() => setShareOpen(true)}
        title="Generate a shareable URL"
        className="
          rounded-md border border-white/[0.08] bg-transparent
          px-2.5 py-1 text-xs text-white/70
          transition-colors hover:bg-white/[0.04] hover:text-white
        "
      >
        Share
      </button>

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

      {/* AuthButton temporarily disabled — isolating React #185 trigger.
          See commit message for next-step plan. */}
      {/* <AuthButton /> */}

      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} />
      <ComponentsManager open={componentsOpen} onClose={() => setComponentsOpen(false)} />
    </header>
  )
}

/**
 * + Add — adds a new child under the currently active parent.
 *
 * Single-click → quick 'note' (free-text) for fastest capture.
 * ▾ chevron / right-click → menu with:
 *   - Typed kinds (note / workspace / product-area / game-mode)
 *   - All defined components (creates an instance)
 */
function AddNodeButton() {
  const activeParentId = useMindmapStore((s) => s.activeParentId)
  const addNode = useMindmapStore((s) => s.addNode)
  const addInstance = useMindmapStore((s) => s.addInstance)
  const components = useMindmapStore((s) => s.mindmap.components)
  const [open, setOpen] = useState(false)

  const create = (kind: string, label: string) => {
    addNode({ parentId: activeParentId, kind, label })
    setOpen(false)
  }

  const createInstance = (componentId: string) => {
    addInstance({ parentId: activeParentId, componentId })
    setOpen(false)
  }

  const componentList = Object.values(components)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => create('note', 'New note')}
        onContextMenu={(e) => {
          e.preventDefault()
          setOpen(true)
        }}
        title="Add child (right-click for kind menu)"
        className="
          inline-flex items-center gap-1.5 rounded-md
          bg-chozen/15 text-chozen
          ring-1 ring-chozen/30
          px-2.5 py-1 text-xs font-semibold
          transition-colors hover:bg-chozen/25
        "
      >
        <span className="text-base leading-none -mt-px">+</span>
        Add
      </button>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Pick kind"
        className="
          absolute -right-2 top-1/2 -translate-y-1/2 translate-x-full
          ml-0.5 inline-flex h-5 w-5 items-center justify-center
          rounded-md border border-white/[0.08] bg-white/[0.02]
          text-[10px] text-white/45
          transition-colors hover:bg-white/[0.06] hover:text-white/70
        "
      >
        ▾
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div
            className="
              absolute right-0 top-full z-50 mt-2 w-56
              rounded-lg border border-white/[0.1] bg-black/90
              backdrop-blur-xl
              shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]
              py-1
              max-h-[60vh] overflow-y-auto
            "
          >
            {/* Kinds */}
            <div className="px-3 pt-1 pb-1 text-[9px] uppercase tracking-wider text-white/30">
              New node
            </div>
            <KindOption label="Note" kind="note" onPick={create} hint="Free-text card" />
            <KindOption label="Workspace" kind="workspace" onPick={create} hint="Top-level container" />
            <KindOption label="Product area" kind="product-area" onPick={create} hint="Major product surface" />
            <KindOption label="Game mode" kind="game-mode" onPick={create} hint="Battle type × style" />

            {/* Components */}
            <div className="mt-1 border-t border-white/[0.06] pt-1">
              <div className="px-3 pt-1 pb-1 text-[9px] uppercase tracking-wider text-white/30">
                Instance of component
              </div>
              {componentList.length === 0 ? (
                <div className="px-3 py-1.5 text-[11px] text-white/30 italic">
                  None yet. Right-click any node → Save as component.
                </div>
              ) : (
                componentList.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => createInstance(c.id)}
                    className="
                      w-full text-left px-3 py-1.5
                      transition-colors hover:bg-white/[0.04]
                    "
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-chozen text-[10px]">→</span>
                      <span className="text-sm font-medium text-white truncate">{c.name}</span>
                    </div>
                    <div className="text-[10px] text-white/40 mt-0.5">
                      {c.kind} · updated {timeAgo(c.updatedAt)}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

function FileMenuItem({
  label,
  hint,
  onClick,
}: {
  label: string
  hint?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        w-full text-left px-3 py-1.5
        transition-colors hover:bg-white/[0.04]
      "
    >
      <div className="text-sm font-medium text-white">{label}</div>
      {hint && <div className="text-[10px] text-white/40 mt-0.5">{hint}</div>}
    </button>
  )
}

function KindOption({
  label,
  kind,
  onPick,
  hint,
}: {
  label: string
  kind: string
  onPick: (kind: string, label: string) => void
  hint?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(kind, `New ${label.toLowerCase()}`)}
      className="
        w-full text-left px-3 py-1.5
        transition-colors hover:bg-white/[0.04]
      "
    >
      <div className="text-sm font-medium text-white">{label}</div>
      {hint && (
        <div className="text-[10px] text-white/40 mt-0.5">{hint}</div>
      )}
    </button>
  )
}

/**
 * Visual reminder that Cmd/Ctrl+K opens the command palette. Looks like
 * a search input but actually just dispatches the keyboard event when
 * clicked, so the palette's existing handler does the work.
 */
function CommandPaletteHint() {
  const trigger = () => {
    const isMac = navigator.platform.toUpperCase().includes('MAC')
    const ev = new KeyboardEvent('keydown', {
      key: 'k',
      [isMac ? 'metaKey' : 'ctrlKey']: true,
      bubbles: true,
    })
    window.dispatchEvent(ev)
  }
  const isMac =
    typeof navigator !== 'undefined' &&
    navigator.platform.toUpperCase().includes('MAC')
  return (
    <button
      type="button"
      onClick={trigger}
      title="Jump to node"
      className="
        inline-flex items-center gap-2 rounded-md
        border border-white/[0.08] bg-white/[0.02]
        px-2.5 py-1 text-xs text-white/45
        transition-colors hover:bg-white/[0.04] hover:text-white/70
      "
    >
      <span>Jump…</span>
      <kbd className="
        rounded border border-white/[0.1] bg-white/[0.04]
        px-1 py-0 text-[10px] font-mono leading-snug text-white/60
      ">{isMac ? '⌘' : 'Ctrl'} K</kbd>
    </button>
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
