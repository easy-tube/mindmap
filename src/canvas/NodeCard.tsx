/**
 * NodeCard — the visual representation of a Node on the canvas.
 *
 * IMPORTANT (post v0.2 React #185 fix): this component reads the node
 * from the store by ID rather than receiving the full node via xyflow's
 * `data` prop. That keeps xyflow's internal change detection stable —
 * data only contains a string ID, never a fresh object on every render.
 *
 * Renders:
 *   1. Header bar: label (inline-editable) + kind tag
 *   2. Body: the kind's Fields filtered by current view mode
 *   3. Footer: "Open ↘" affordance if the node has children
 */
import { memo, useState } from 'react'
import { Handle, Position, type NodeProps, type Node as RFNode } from '@xyflow/react'
import { useMindmapStore, selectChildren } from '../store'
import { kindFields } from '../data/kinds'
import type { Field, NodeId } from '../types'
import { LongtextModal } from './LongtextModal'

type CardData = { id: NodeId }

export const NodeCard = memo(function NodeCard({
  data,
  selected,
}: NodeProps<RFNode<CardData>>) {
  const node = useMindmapStore((s) => s.mindmap.nodes[data.id])
  const viewMode = useMindmapStore((s) => s.viewMode)
  const updateLabel = useMindmapStore((s) => s.updateNodeLabel)
  const updateData = useMindmapStore((s) => s.updateNodeData)
  const setActiveParent = useMindmapStore((s) => s.setActiveParent)
  const addNode = useMindmapStore((s) => s.addNode)
  const deleteNode = useMindmapStore((s) => s.deleteNode)
  const childCount = useMindmapStore(
    (s) => selectChildren(s, data.id).length,
  )
  const [menuOpen, setMenuOpen] = useState(false)

  // Node could be removed from the store after xyflow already rendered
  // its placeholder — bail gracefully.
  if (!node) return null

  const fields = kindFields[node.kind] ?? []
  const visibleFields = fields.filter(
    (f) => !f.visibleIn || f.visibleIn.includes(viewMode),
  )

  return (
    <div
      className={`
        group relative overflow-hidden rounded-2xl
        border bg-white/[0.02]
        backdrop-blur-xl
        shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]
        transition-colors duration-200
        ${selected ? 'border-chozen/60' : 'border-white/[0.08] hover:border-white/[0.18]'}
        w-[260px]
      `}
    >
      {/* xyflow needs source/target handles in the DOM for edges to attach,
          even on our drill-in cards. Keep them invisible. */}
      <Handle type="target" position={Position.Top} className="!opacity-0 !pointer-events-none" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0 !pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5">
        <InlineLabel
          value={node.label}
          onChange={(v) => updateLabel(node.id, v)}
        />
        <span className="ml-auto text-[10px] font-mono uppercase tracking-wider text-white/35">
          {node.kind}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setMenuOpen((o) => !o)
          }}
          title="Node actions"
          className="
            -mr-1.5 inline-flex h-6 w-6 items-center justify-center
            rounded text-white/35
            transition-colors hover:bg-white/[0.06] hover:text-white/80
          "
        >
          ⋯
        </button>
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen(false)
              }}
            />
            <div
              className="
                absolute right-2 top-10 z-50 w-44
                rounded-lg border border-white/[0.1] bg-black/95
                backdrop-blur-xl
                shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]
                py-1
              "
              onClick={(e) => e.stopPropagation()}
            >
              <MenuItem
                label="Add child"
                onClick={() => {
                  addNode({ parentId: node.id, kind: 'note', label: 'New note' })
                  setMenuOpen(false)
                }}
              />
              <MenuItem
                label="Open this canvas"
                onClick={() => {
                  setActiveParent(node.id)
                  setMenuOpen(false)
                }}
                disabled={childCount === 0}
                hint={childCount === 0 ? 'no children yet' : undefined}
              />
              <div className="my-1 h-px bg-white/[0.06]" />
              <MenuItem
                label="Delete"
                tone="danger"
                onClick={() => {
                  const msg = childCount > 0
                    ? `Delete "${node.label}" and ${childCount} ${childCount === 1 ? 'child' : 'children'}?`
                    : `Delete "${node.label}"?`
                  if (window.confirm(msg)) {
                    deleteNode(node.id)
                  }
                  setMenuOpen(false)
                }}
              />
            </div>
          </>
        )}
      </div>

      {/* Body — fields filtered by view mode */}
      <div className="px-4 py-3">
        {visibleFields.length === 0 ? (
          <div className="text-xs italic text-white/30">
            No fields in this view mode.
          </div>
        ) : (
          <ul className="space-y-2.5">
            {visibleFields.map((f) => (
              <FieldRow
                key={f.key}
                field={f}
                value={node.data[f.key]}
                onChange={(v) => updateData(node.id, f.key, v)}
                nodeLabel={node.label}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Footer — drill-in if children */}
      {childCount > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setActiveParent(node.id)
          }}
          className="
            block w-full border-t border-white/[0.06]
            px-4 py-2 text-left text-xs font-medium
            text-chozen
            transition-colors hover:bg-chozen/[0.04]
          "
        >
          Open <span className="ml-1 align-baseline">↘</span>
          <span className="ml-2 text-white/35 font-normal">
            {childCount} {childCount === 1 ? 'child' : 'children'}
          </span>
        </button>
      )}
    </div>
  )
})

// ─── Field row ────────────────────────────────────────────────────────

function FieldRow({
  field,
  value,
  onChange,
  nodeLabel,
}: {
  field: Field
  value: unknown
  onChange: (v: unknown) => void
  nodeLabel: string
}) {
  const [expanded, setExpanded] = useState(false)
  return (
    <li>
      <div className="mb-1 flex items-center gap-1.5">
        <div className="text-[10px] font-medium uppercase tracking-wider text-white/35">
          {field.label}
        </div>
        {field.type === 'longtext' && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            title="Expand to fullscreen editor"
            className="
              ml-auto inline-flex h-4 w-4 items-center justify-center
              rounded text-[10px] text-white/30
              transition-colors hover:bg-white/[0.06] hover:text-white/70
            "
          >
            ⤢
          </button>
        )}
      </div>
      <FieldEditor field={field} value={value} onChange={onChange} />
      {field.type === 'longtext' && (
        <LongtextModal
          open={expanded}
          title={nodeLabel}
          fieldLabel={field.label}
          value={(value as string) ?? ''}
          placeholder={field.placeholder}
          onChange={onChange}
          onClose={() => setExpanded(false)}
        />
      )}
    </li>
  )
}

function FieldEditor({
  field,
  value,
  onChange,
}: {
  field: Field
  value: unknown
  onChange: (v: unknown) => void
}) {
  switch (field.type) {
    case 'string':
      return (
        <input
          type="text"
          value={(value as string) ?? ''}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="
            w-full rounded-md bg-transparent
            px-1.5 py-1 text-sm text-white
            placeholder:text-white/20
            hover:bg-white/[0.04]
            focus:bg-white/[0.06]
            focus:outline-none focus:ring-1 focus:ring-chozen/40
            transition-colors
          "
        />
      )

    case 'longtext':
      return (
        <textarea
          value={(value as string) ?? ''}
          placeholder={field.placeholder}
          rows={2}
          onChange={(e) => onChange(e.target.value)}
          className="
            w-full resize-y rounded-md bg-transparent
            px-1.5 py-1 text-sm text-white leading-relaxed
            placeholder:text-white/20
            hover:bg-white/[0.04]
            focus:bg-white/[0.06]
            focus:outline-none focus:ring-1 focus:ring-chozen/40
            transition-colors
            min-h-[44px]
          "
        />
      )

    case 'number':
      return (
        <input
          type="number"
          value={value === null || value === undefined ? '' : String(value)}
          placeholder={field.placeholder ?? '—'}
          onChange={(e) => {
            const v = e.target.value
            onChange(v === '' ? null : Number(v))
          }}
          className="
            w-full rounded-md bg-transparent
            px-1.5 py-1 text-sm text-white tabular-nums
            placeholder:text-white/20
            hover:bg-white/[0.04]
            focus:bg-white/[0.06]
            focus:outline-none focus:ring-1 focus:ring-chozen/40
            transition-colors
          "
        />
      )

    case 'bool': {
      const checked = !!value
      return (
        <button
          type="button"
          onClick={() => onChange(!checked)}
          className={`
            inline-flex items-center gap-2 rounded-md px-2 py-1
            text-xs font-medium transition-colors
            ${checked
              ? 'bg-chozen/15 text-chozen ring-1 ring-chozen/30'
              : 'bg-white/[0.04] text-white/55 ring-1 ring-white/10 hover:bg-white/[0.08]'
            }
          `}
        >
          <span
            className={`block h-1.5 w-1.5 rounded-full ${
              checked ? 'bg-chozen' : 'bg-white/30'
            }`}
          />
          {checked ? 'Yes' : 'No'}
        </button>
      )
    }

    case 'enum':
      return (
        <select
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          className="
            w-full rounded-md bg-transparent
            px-1.5 py-1 text-sm text-white
            hover:bg-white/[0.04]
            focus:bg-white/[0.06]
            focus:outline-none focus:ring-1 focus:ring-chozen/40
            transition-colors
            appearance-none
          "
        >
          <option value="" className="bg-neutral-900">— select —</option>
          {field.enumValues?.map((v) => (
            <option key={v} value={v} className="bg-neutral-900">
              {v}
            </option>
          ))}
        </select>
      )

    default:
      return (
        <div className="text-xs italic text-white/30">
          (no editor for type "{field.type}")
        </div>
      )
  }
}

// ─── Menu item ────────────────────────────────────────────────────────

function MenuItem({
  label,
  onClick,
  disabled,
  hint,
  tone,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  hint?: string
  tone?: 'danger'
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`
        block w-full text-left px-3 py-1.5
        text-sm
        transition-colors
        disabled:opacity-40 disabled:cursor-not-allowed
        ${tone === 'danger'
          ? 'text-red-400 hover:bg-red-500/[0.08]'
          : 'text-white hover:bg-white/[0.04]'
        }
      `}
    >
      <div>{label}</div>
      {hint && <div className="text-[10px] text-white/35 mt-0.5">{hint}</div>}
    </button>
  )
}

// ─── Inline-editable label ────────────────────────────────────────────

function InlineLabel({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="
        flex-1 bg-transparent px-1
        text-sm font-semibold tracking-tight text-white
        focus:outline-none focus:ring-1 focus:ring-chozen/40
        rounded
      "
    />
  )
}
