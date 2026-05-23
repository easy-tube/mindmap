/**
 * CommandPalette — fuzzy jump-to-node.
 *
 * Press Cmd/Ctrl+K → modal opens listing every node in the mindmap.
 * Type to fuzzy-filter by label (and breadcrumb path). Enter to jump:
 * activeParentId becomes the matched node's parent (so the node is
 * visible on the canvas). ↑/↓ to navigate, Esc to close.
 *
 * Fuzzy matching is hand-rolled (avoid a fuse.js dep). Score = sum of
 * char positions in the candidate where the query chars appeared in
 * order, weighted by:
 *   - consecutive matches (lower score, better)
 *   - match at word boundary (small bonus)
 *   - shorter candidate (small bonus)
 * Good enough for human-meaningful labels.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useMindmapStore } from './store'
import type { Node as MindmapNode, NodeId } from './types'

type Item = {
  id: NodeId
  label: string
  /** Breadcrumb path "Chozen › Ranked › 1v1 Flip Loop" (for display). */
  path: string
  /** parentId we jump TO so this node is visible (its parent's canvas). */
  jumpTo: NodeId
  /** Whether this node has children (drill-in target option). */
  hasChildren: boolean
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // CRITICAL — DON'T inline the item-list construction inside the Zustand
  // selector. Zustand uses useSyncExternalStore which calls the selector
  // on every check; if it returns a new array each call, React detects
  // a "snapshot change" every time and re-renders infinitely (React
  // error #185, "Maximum update depth exceeded").
  //
  // Fix: read STABLE raw state (the nodes Record — same reference across
  // unrelated mutations) and compute the derived item list via useMemo,
  // which caches on the nodes reference.
  const nodes = useMindmapStore((s) => s.mindmap.nodes)
  const items = useMemo<Item[]>(() => {
    const buildPath = (n: MindmapNode): string => {
      const trail: string[] = []
      let cur: MindmapNode | undefined = n
      while (cur) {
        trail.unshift(cur.label)
        cur = cur.parentId ? nodes[cur.parentId] : undefined
      }
      return trail.join(' › ')
    }
    const hasChildrenCache = new Map<NodeId, boolean>()
    for (const n of Object.values(nodes)) {
      if (n.parentId) {
        hasChildrenCache.set(n.parentId, true)
      }
    }
    return Object.values(nodes).map((n) => ({
      id: n.id,
      label: n.label,
      path: buildPath(n),
      jumpTo: n.parentId ?? n.id,
      hasChildren: hasChildrenCache.get(n.id) ?? false,
    }))
  }, [nodes])

  // Global keyboard: Cmd/Ctrl+K to open, Esc to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC')
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey
      if (cmdOrCtrl && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
        return
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault()
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Focus the input + reset query on open.
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      // Wait a frame for the modal to mount before focusing.
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  // Filter + rank.
  const filtered = useMemo(() => {
    if (!query.trim()) {
      // No query → show everything, sorted by path depth then label so
      // top-level items lead.
      return items
        .slice()
        .sort((a, b) => {
          const da = a.path.split('›').length
          const db = b.path.split('›').length
          if (da !== db) return da - db
          return a.label.localeCompare(b.label)
        })
        .slice(0, 50)
    }
    const q = query.toLowerCase()
    const scored = items
      .map((it) => ({ it, score: fuzzyScore(q, it.label, it.path) }))
      .filter((x) => x.score > 0)
    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, 50).map((x) => x.it)
  }, [items, query])

  // Clamp selection when list changes.
  useEffect(() => {
    if (selected >= filtered.length) setSelected(0)
  }, [filtered, selected])

  const setActiveParent = useMindmapStore((s) => s.setActiveParent)

  const jump = (item: Item) => {
    setActiveParent(item.jumpTo)
    setOpen(false)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[110] flex items-start justify-center bg-black/70 backdrop-blur-sm pt-[10vh] px-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="
          w-full max-w-xl
          rounded-2xl border border-white/[0.1]
          bg-black/95 backdrop-blur-xl
          shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]
          overflow-hidden
        "
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-white/[0.06]">
          <input
            ref={inputRef}
            type="text"
            value={query}
            placeholder="Jump to node..."
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSelected((s) => Math.min(s + 1, filtered.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSelected((s) => Math.max(s - 1, 0))
              } else if (e.key === 'Enter') {
                e.preventDefault()
                const item = filtered[selected]
                if (item) jump(item)
              }
            }}
            className="
              w-full bg-transparent border-0
              px-5 py-4 text-[15px] text-white
              placeholder:text-white/30
              focus:outline-none
            "
          />
        </div>
        <div className="max-h-[55vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-5 py-6 text-center text-sm text-white/40">
              No matches.
            </div>
          ) : (
            <ul className="py-1">
              {filtered.map((item, i) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => jump(item)}
                    onMouseEnter={() => setSelected(i)}
                    className={`
                      block w-full text-left px-5 py-2.5
                      transition-colors
                      ${i === selected ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'}
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">
                        {item.label}
                      </span>
                      {item.hasChildren && (
                        <span className="text-[10px] uppercase tracking-wider text-chozen/70">
                          group
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-white/35 mt-0.5 truncate">
                      {item.path}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-white/[0.06] px-5 py-2 text-[11px] text-white/35 flex items-center gap-4">
          <span><kbd className="font-mono text-white/55">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono text-white/55">↵</kbd> jump</span>
          <span><kbd className="font-mono text-white/55">esc</kbd> close</span>
          <span className="ml-auto">{filtered.length} {filtered.length === 1 ? 'match' : 'matches'}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Fuzzy ───────────────────────────────────────────────────────────

/**
 * Returns a score > 0 if the query is a fuzzy subsequence of the
 * candidate (label OR path). Higher = better match. Score 0 = no match.
 */
function fuzzyScore(q: string, label: string, path: string): number {
  const lbl = label.toLowerCase()
  const pth = path.toLowerCase()
  // Try label first; if it doesn't match, fall back to path. Label hits
  // score higher than path hits.
  const lblScore = subseqScore(q, lbl)
  if (lblScore > 0) return lblScore * 2 + (lbl.length < 30 ? 5 : 0)
  const pthScore = subseqScore(q, pth)
  return pthScore
}

function subseqScore(q: string, s: string): number {
  let qi = 0
  let score = 0
  let lastMatch = -1
  let consecutive = 0
  for (let si = 0; si < s.length && qi < q.length; si++) {
    if (s[si] === q[qi]) {
      // Award higher for consecutive matches.
      if (lastMatch === si - 1) consecutive++
      else consecutive = 1
      // Award for word-boundary match (start or after space/dash).
      const boundary = si === 0 || s[si - 1] === ' ' || s[si - 1] === '-' || s[si - 1] === '›'
      score += 10 + consecutive * 5 + (boundary ? 8 : 0)
      lastMatch = si
      qi++
    }
  }
  return qi === q.length ? score : 0
}
