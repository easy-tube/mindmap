/**
 * File System Access — save/load the mindmap as a `.mindmap.json` file
 * on disk.
 *
 * Two code paths:
 *   1. Native File System Access API (Chrome / Edge / Opera) →
 *      showSaveFilePicker / showOpenFilePicker. Real file handles,
 *      familiar OS file dialogs.
 *   2. Fallback (Firefox / Safari) → anchor download for save, hidden
 *      <input type="file"> for load. Same UX shape, different mechanism.
 *
 * Persistent folder watching (write-back without prompting) lives in
 * v0.4 — needs IndexedDB to store the directory handle + permission
 * re-grant on each session. v0.3 is just explicit save/load.
 */
import type { Mindmap } from '../types'

// Augment the global types — File System Access API isn't in the
// default lib.dom yet.
declare global {
  interface Window {
    showSaveFilePicker?: (opts: {
      suggestedName?: string
      types?: Array<{
        description: string
        accept: Record<string, string[]>
      }>
    }) => Promise<FileSystemFileHandle>
    showOpenFilePicker?: (opts: {
      multiple?: boolean
      types?: Array<{
        description: string
        accept: Record<string, string[]>
      }>
    }) => Promise<FileSystemFileHandle[]>
  }
}

const FILE_TYPES = [
  {
    description: 'Mindmap JSON',
    accept: { 'application/json': ['.mindmap.json', '.json'] },
  },
]

export async function saveMindmapToFile(mindmap: Mindmap): Promise<void> {
  const json = JSON.stringify(mindmap, null, 2)
  if (typeof window.showSaveFilePicker === 'function') {
    const handle = await window.showSaveFilePicker({
      suggestedName: suggestedFilename(mindmap),
      types: FILE_TYPES,
    })
    const writable = await handle.createWritable()
    await writable.write(json)
    await writable.close()
    return
  }
  // Fallback: anchor download
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = suggestedFilename(mindmap)
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function loadMindmapFromFile(): Promise<Mindmap> {
  if (typeof window.showOpenFilePicker === 'function') {
    const [handle] = await window.showOpenFilePicker({ types: FILE_TYPES })
    const file = await handle.getFile()
    const text = await file.text()
    return parseAndValidate(text)
  }
  // Fallback: hidden file input
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.style.display = 'none'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) {
        document.body.removeChild(input)
        reject(new Error('No file selected'))
        return
      }
      try {
        const text = await file.text()
        resolve(parseAndValidate(text))
      } catch (e) {
        reject(e)
      } finally {
        document.body.removeChild(input)
      }
    }
    document.body.appendChild(input)
    input.click()
  })
}

function suggestedFilename(mindmap: Mindmap): string {
  const root = mindmap.nodes[mindmap.rootId]
  const stem = root
    ? root.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    : 'mindmap'
  const ts = new Date().toISOString().slice(0, 10)
  return `${stem || 'mindmap'}-${ts}.mindmap.json`
}

function parseAndValidate(text: string): Mindmap {
  const obj = JSON.parse(text) as Partial<Mindmap>
  if (!obj || typeof obj !== 'object') {
    throw new Error('File is not a JSON object')
  }
  if (obj.version !== 1) {
    throw new Error(`Unsupported mindmap version: ${obj.version}`)
  }
  if (!obj.rootId || typeof obj.rootId !== 'string') {
    throw new Error('Missing rootId')
  }
  if (!obj.nodes || typeof obj.nodes !== 'object') {
    throw new Error('Missing nodes')
  }
  if (!obj.nodes[obj.rootId]) {
    throw new Error(`rootId "${obj.rootId}" not present in nodes`)
  }
  return obj as Mindmap
}
