/**
 * URL-share — encode the whole mindmap into a URL hash so anyone with
 * the link can open it without a backend.
 *
 * Pipeline:
 *   JSON → DEFLATE (CompressionStream, built-in) → bytes → url-safe base64
 *
 * Decode reverses. Both async because CompressionStream is.
 *
 * CompressionStream is in Chrome 80+, Edge, Firefox 113+, Safari 16.4+.
 * Modern enough; we surface a clear error if the API is missing.
 *
 * Hash format: `#share=<base64url>`. We use hash (not query) because:
 *   - servers don't see the hash → no leakage to logs
 *   - SPAs can read it without route configuration
 *   - copy/paste works regardless of routing
 */
import type { Mindmap } from '../types'

const HASH_PREFIX = '#share='

export async function encodeMindmapToUrl(mindmap: Mindmap): Promise<string> {
  const json = JSON.stringify(mindmap)
  const compressed = await deflate(new TextEncoder().encode(json))
  const b64 = bytesToBase64Url(compressed)
  const base = `${window.location.origin}${window.location.pathname}`
  return `${base}${HASH_PREFIX}${b64}`
}

/**
 * If the current URL has a #share=… hash, decode it. Otherwise return null.
 * Throws if the hash is present but corrupt.
 */
export async function decodeMindmapFromUrl(): Promise<Mindmap | null> {
  if (typeof window === 'undefined') return null
  const hash = window.location.hash
  if (!hash.startsWith(HASH_PREFIX)) return null
  const b64 = hash.slice(HASH_PREFIX.length)
  if (!b64) return null
  const bytes = base64UrlToBytes(b64)
  const inflated = await inflate(bytes)
  const json = new TextDecoder().decode(inflated)
  const mm = JSON.parse(json) as Mindmap
  if (mm.version !== 1) {
    throw new Error(`Unsupported shared mindmap version: ${mm.version}`)
  }
  return mm
}

export function clearShareHash() {
  // Replace state without reloading so the URL doesn't keep loading
  // the same shared mindmap after the user picks "use this" or "cancel".
  if (typeof window === 'undefined') return
  history.replaceState(
    null,
    '',
    window.location.pathname + window.location.search,
  )
}

// ─── Compression helpers ──────────────────────────────────────────────

async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream === 'undefined') {
    throw new Error('Browser missing CompressionStream API — cannot share via URL')
  }
  const cs = new CompressionStream('deflate')
  const writer = cs.writable.getWriter()
  // TS 5.7+ tightened BufferSource to require ArrayBuffer specifically;
  // `Uint8Array<ArrayBufferLike>` is wider. The write() call is fine at
  // runtime — cast unknown to bypass the mismatch.
  await writer.write(bytes as unknown as BufferSource)
  await writer.close()
  const buf = await new Response(cs.readable).arrayBuffer()
  return new Uint8Array(buf)
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Browser missing DecompressionStream API — cannot read shared URLs')
  }
  const ds = new DecompressionStream('deflate')
  const writer = ds.writable.getWriter()
  await writer.write(bytes as unknown as BufferSource)
  await writer.close()
  const buf = await new Response(ds.readable).arrayBuffer()
  return new Uint8Array(buf)
}

// ─── Base64URL (RFC 4648 §5) ──────────────────────────────────────────

function bytesToBase64Url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(s: string): Uint8Array {
  const fixed = s.replace(/-/g, '+').replace(/_/g, '/')
  const padded = fixed + '='.repeat((4 - (fixed.length % 4)) % 4)
  const bin = atob(padded)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}
