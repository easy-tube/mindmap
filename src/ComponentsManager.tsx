/**
 * ComponentsManager — modal that lists all defined components with
 * inline rename + safe delete.
 *
 * Safe delete: before removing a component, we "detach" every instance
 * by baking its current effective data (defaults + overrides merged)
 * into the instance's own `data` map. Instances survive as standalone
 * nodes with their last-effective values intact.
 */
import { useState } from 'react'
import { useMindmapStore } from './store'

export function ComponentsManager({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const components = useMindmapStore((s) => s.mindmap.components)
  const nodes = useMindmapStore((s) => s.mindmap.nodes)
  const rename = useMindmapStore((s) => s.renameComponent)
  const del = useMindmapStore((s) => s.deleteComponent)

  if (!open) return null

  const list = Object.values(components).sort((a, b) =>
    a.name.localeCompare(b.name),
  )

  const instanceCount = (componentId: string) =>
    Object.values(nodes).filter((n) => n.componentRef === componentId).length

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
          max-h-[80vh] flex flex-col
        "
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-6 py-4">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/40">
              Components
            </div>
            <div className="mt-0.5 text-base font-semibold tracking-tight text-white">
              {list.length} {list.length === 1 ? 'component' : 'components'} defined
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
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {list.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-white/55">No components yet.</p>
              <p className="text-xs text-white/35 mt-2">
                Right-click any node → ⋯ → <b>Save as component</b> to create one.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {list.map((c) => (
                <ComponentRow
                  key={c.id}
                  component={c}
                  instanceCount={instanceCount(c.id)}
                  onRename={(name) => rename(c.id, name)}
                  onDelete={() => {
                    const n = instanceCount(c.id)
                    const msg = n === 0
                      ? `Delete component "${c.name}"?`
                      : `Delete component "${c.name}"?\n\n` +
                        `${n} instance${n === 1 ? '' : 's'} will be detached — they'll keep their current values but stop inheriting from the component.`
                    if (window.confirm(msg)) del(c.id)
                  }}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-white/[0.06] px-6 py-2.5 text-[11px] text-white/35">
          Edit defaults by editing any instance — overrides propagate to all
          non-overridden fields on every instance.
        </div>
      </div>
    </div>
  )
}

function ComponentRow({
  component,
  instanceCount,
  onRename,
  onDelete,
}: {
  component: { id: string; name: string; kind: string; updatedAt: number }
  instanceCount: number
  onRename: (name: string) => void
  onDelete: () => void
}) {
  const [name, setName] = useState(component.name)

  return (
    <li className="flex items-center gap-4 px-6 py-3">
      <div className="min-w-0 flex-1">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            if (name !== component.name) onRename(name)
          }}
          className="
            w-full bg-transparent
            text-sm font-semibold tracking-tight text-white
            focus:outline-none focus:ring-1 focus:ring-chozen/40
            rounded px-1 -mx-1
          "
        />
        <div className="text-[11px] text-white/35 mt-0.5">
          {component.kind} · {instanceCount} {instanceCount === 1 ? 'instance' : 'instances'}
        </div>
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="
          rounded-md border border-red-500/30 bg-red-500/[0.05]
          px-2.5 py-1 text-xs text-red-400
          transition-colors hover:bg-red-500/[0.1]
        "
      >
        Delete
      </button>
    </li>
  )
}
