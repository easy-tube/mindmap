/**
 * ShareModal — generates a URL that contains the entire mindmap as a
 * compressed payload in the hash fragment. Anyone with the link sees
 * the same tree.
 *
 * Limits:
 *   - Hash fragments are ~32-50 KB safe across browsers. We warn at
 *     20 KB just for headroom.
 *   - The receiver decompresses and is prompted to REPLACE their
 *     current mindmap (see ShareLoader). No backend, no permissions.
 */
import { useEffect, useState } from 'react'
import { useMindmapStore } from './store'
import { encodeMindmapToUrl } from './persistence/urlShare'

export function ShareModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mindmap = useMindmapStore((s) => s.mindmap)
  const [url, setUrl] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) {
      setUrl(null)
      setErr(null)
      setCopied(false)
      return
    }
    encodeMindmapToUrl(mindmap)
      .then((u) => setUrl(u))
      .catch((e) => setErr(String(e?.message ?? e)))
  }, [open, mindmap])

  if (!open) return null

  const length = url?.length ?? 0
  const warning = length > 20_000
    ? `URL is ${length.toLocaleString()} chars — may not survive in all messaging apps. Consider sharing a subtree instead (drill in first, then share).`
    : null

  const copy = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore — user can select+copy manually
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-6"
      onClick={onClose}
    >
      <div
        className="
          w-full max-w-2xl
          rounded-2xl border border-white/[0.1]
          bg-black/95 backdrop-blur-xl
          shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]
          overflow-hidden
        "
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-6 py-4">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/40">
              Share
            </div>
            <div className="mt-0.5 text-base font-semibold tracking-tight text-white">
              Public URL
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="
              -mr-1.5 inline-flex h-8 w-8 items-center justify-center
              rounded text-white/45
              transition-colors hover:bg-white/[0.06] hover:text-white
            "
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm text-white/55 leading-relaxed mb-4">
            Anyone with this URL sees the same mindmap. The entire payload is
            encoded in the link itself — no backend, no signup. Recipients
            are prompted before their current mindmap is replaced.
          </p>

          {err && (
            <div className="rounded-md border border-red-500/30 bg-red-500/[0.05] px-3 py-2 text-sm text-red-400 mb-4">
              {err}
            </div>
          )}

          {!url && !err && (
            <div className="text-sm text-white/40 italic">Encoding…</div>
          )}

          {url && (
            <>
              <div className="
                rounded-lg border border-white/[0.08] bg-white/[0.02]
                px-3 py-2
                font-mono text-xs text-white/70
                break-all
                max-h-32 overflow-y-auto
              ">
                {url}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={copy}
                  className="
                    inline-flex items-center gap-1.5 rounded-md
                    bg-chozen/15 text-chozen
                    ring-1 ring-chozen/30
                    px-3 py-1.5 text-xs font-semibold
                    transition-colors hover:bg-chozen/25
                  "
                >
                  {copied ? '✓ Copied' : 'Copy to clipboard'}
                </button>
                <span className="text-[11px] text-white/35">
                  {length.toLocaleString()} chars
                </span>
              </div>

              {warning && (
                <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-400">
                  {warning}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
