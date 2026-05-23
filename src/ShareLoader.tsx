/**
 * ShareLoader — on mount, checks the URL hash. If `#share=…` is present,
 * decodes the mindmap and prompts the user to replace their current
 * mindmap with the shared one.
 *
 * Mounted once at the top of App, runs on first render only. No UI
 * until a shared URL is detected.
 */
import { useEffect, useState } from 'react'
import { useMindmapStore } from './store'
import { decodeMindmapFromUrl, clearShareHash } from './persistence/urlShare'
import type { Mindmap } from './types'

export function ShareLoader() {
  const setMindmap = useMindmapStore((s) => s.setMindmap)
  const [pending, setPending] = useState<Mindmap | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    decodeMindmapFromUrl()
      .then((mm) => {
        if (mm) setPending(mm)
      })
      .catch((e) => setErr(String(e?.message ?? e)))
  }, [])

  if (err) {
    return (
      <div className="fixed inset-x-0 top-0 z-[120]">
        <div className="mx-auto max-w-2xl m-4 rounded-lg border border-red-500/30 bg-red-500/[0.08] backdrop-blur-xl px-4 py-3 text-sm text-red-300 flex items-center gap-3">
          <span>Couldn't load shared URL: {err}</span>
          <button
            type="button"
            onClick={() => {
              clearShareHash()
              setErr(null)
            }}
            className="ml-auto rounded-md border border-red-500/30 px-2 py-0.5 text-xs hover:bg-red-500/[0.1]"
          >
            Dismiss
          </button>
        </div>
      </div>
    )
  }

  if (!pending) return null

  const accept = () => {
    setMindmap(pending)
    clearShareHash()
    setPending(null)
  }
  const dismiss = () => {
    clearShareHash()
    setPending(null)
  }

  const nodeCount = Object.keys(pending.nodes).length

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
      <div className="
        w-full max-w-md
        rounded-2xl border border-white/[0.1]
        bg-black/95 backdrop-blur-xl
        shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]
        overflow-hidden
      ">
        <div className="px-6 py-5 border-b border-white/[0.06]">
          <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-chozen">
            Shared mindmap
          </div>
          <div className="mt-1 text-base font-semibold tracking-tight text-white">
            Replace your current mindmap?
          </div>
          <p className="mt-2 text-sm text-white/55 leading-relaxed">
            A URL someone shared with you encodes a mindmap with{' '}
            <span className="text-white font-medium">{nodeCount} nodes</span>.
            Loading it will replace what's currently on your canvas. Your
            existing data is in localStorage — you can re-seed via the Reset
            button if you change your mind, but only if you saved it
            externally first.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-3">
          <button
            type="button"
            onClick={dismiss}
            className="
              rounded-md border border-white/[0.08] bg-transparent
              px-4 py-1.5 text-sm text-white/70
              transition-colors hover:bg-white/[0.04] hover:text-white
            "
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={accept}
            className="
              rounded-md bg-chozen/20 text-chozen
              ring-1 ring-chozen/40
              px-4 py-1.5 text-sm font-semibold
              transition-colors hover:bg-chozen/30
            "
          >
            Load shared mindmap
          </button>
        </div>
      </div>
    </div>
  )
}
