/**
 * LongtextModal — fullscreen writing surface for longform fields.
 *
 * The inline textareas in NodeCard are intentionally small (so the card
 * stays readable). For fields like `intro_text_rule_summary` or
 * `exceptions`, you need a real writing surface. Click the ⤢ icon next
 * to a longtext field → this modal opens, you write, Esc/click-out
 * closes (changes are committed live via onChange so there's no save
 * step to forget).
 */
import { useEffect, useRef } from 'react'

type Props = {
  open: boolean
  title: string
  fieldLabel: string
  value: string
  placeholder?: string
  onChange: (v: string) => void
  onClose: () => void
}

export function LongtextModal({
  open,
  title,
  fieldLabel,
  value,
  placeholder,
  onChange,
  onClose,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Focus + cursor-at-end on open. Listen for Esc.
  useEffect(() => {
    if (!open) return
    const ta = textareaRef.current
    if (ta) {
      ta.focus()
      const len = ta.value.length
      ta.setSelectionRange(len, len)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-6"
      onClick={onClose}
    >
      <div
        className="
          relative flex w-full max-w-3xl flex-col
          rounded-2xl border border-white/[0.1]
          bg-black/95 backdrop-blur-xl
          shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]
          max-h-[80vh]
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-6 py-4">
          <div className="min-w-0">
            <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/40">
              {title}
            </div>
            <div className="mt-0.5 text-base font-semibold tracking-tight text-white">
              {fieldLabel}
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
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <textarea
          ref={textareaRef}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="
            flex-1 resize-none border-0 bg-transparent
            px-6 py-5
            text-[15px] leading-relaxed text-white
            placeholder:text-white/25
            focus:outline-none
            min-h-[40vh]
          "
        />

        {/* Footer hint */}
        <div className="border-t border-white/[0.06] px-6 py-2.5 text-[11px] text-white/35">
          Changes save automatically · Esc to close
        </div>
      </div>
    </div>
  )
}
