/**
 * Session helpers — cookie management + DB lookups.
 *
 * The cookie is a single opaque token (UUID). The DB stores the same
 * token with user_id + expiry. We compare on read.
 *
 * Could be stateless (JWT-style), but stateful gives us:
 *   - immediate logout (delete row → cookie invalid on next request)
 *   - server-side session inventory (security audit, "log out all devices")
 *   - cheaper invalidation than rotating signing keys
 *
 * Cookie attributes:
 *   - Secure: HTTPS only (we're on HTTPS in prod)
 *   - HttpOnly: not readable from JS, prevents XSS theft
 *   - SameSite=Lax: sent on top-level navigation (needed for OAuth
 *     redirect back from Google), not on cross-site embeds
 *   - Domain=.mindmap.icu: shared between mindmap.icu (Pages) and
 *     api.mindmap.icu (Worker)
 *   - Max-Age: 30 days
 *
 * Session secret is reserved for future use (HMACing the cookie value,
 * or signing OAuth state tokens). For v1 we trust the opaque random
 * UUID + DB lookup.
 */
import type { Env, Session, User } from './types'

const COOKIE_NAME = 'mindmap_sess'
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000  // 30 days

export async function createSession(env: Env, userId: string, opts: {
  userAgent?: string | null
  ipHash?: string | null
}): Promise<Session> {
  const id = crypto.randomUUID()
  const now = Date.now()
  const session: Session = {
    id,
    user_id: userId,
    created_at: now,
    expires_at: now + SESSION_TTL_MS,
    user_agent: opts.userAgent ?? null,
    ip_hash: opts.ipHash ?? null,
  }
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, created_at, expires_at, user_agent, ip_hash)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(session.id, session.user_id, session.created_at, session.expires_at, session.user_agent, session.ip_hash)
    .run()
  return session
}

export async function lookupSession(env: Env, sessionId: string): Promise<{ session: Session; user: User } | null> {
  const now = Date.now()
  const row = await env.DB.prepare(
    `SELECT s.id, s.user_id, s.created_at, s.expires_at, s.user_agent, s.ip_hash,
            u.id AS u_id, u.google_sub, u.email, u.email_verified, u.name, u.picture_url, u.created_at AS u_created_at, u.updated_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND s.expires_at > ?
     LIMIT 1`,
  )
    .bind(sessionId, now)
    .first<Record<string, unknown>>()
  if (!row) return null
  const session: Session = {
    id: row.id as string,
    user_id: row.user_id as string,
    created_at: row.created_at as number,
    expires_at: row.expires_at as number,
    user_agent: (row.user_agent as string | null) ?? null,
    ip_hash: (row.ip_hash as string | null) ?? null,
  }
  const user: User = {
    id: row.u_id as string,
    google_sub: row.google_sub as string,
    email: row.email as string,
    email_verified: row.email_verified as number,
    name: (row.name as string | null) ?? null,
    picture_url: (row.picture_url as string | null) ?? null,
    created_at: row.u_created_at as number,
    updated_at: row.updated_at as number,
  }
  return { session, user }
}

export async function deleteSession(env: Env, sessionId: string): Promise<void> {
  await env.DB.prepare(`DELETE FROM sessions WHERE id = ?`).bind(sessionId).run()
}

// ─── Cookies ──────────────────────────────────────────────────────────

export function readSessionCookie(request: Request): string | null {
  const header = request.headers.get('Cookie')
  if (!header) return null
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name === COOKIE_NAME) return decodeURIComponent(rest.join('='))
  }
  return null
}

export function sessionCookieHeader(sessionId: string, opts: { domain?: string } = {}): string {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(sessionId)}`,
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
    `Path=/`,
    `Secure`,
    `HttpOnly`,
    `SameSite=Lax`,
  ]
  if (opts.domain) parts.push(`Domain=${opts.domain}`)
  return parts.join('; ')
}

export function clearSessionCookieHeader(opts: { domain?: string } = {}): string {
  const parts = [
    `${COOKIE_NAME}=`,
    `Max-Age=0`,
    `Path=/`,
    `Secure`,
    `HttpOnly`,
    `SameSite=Lax`,
  ]
  if (opts.domain) parts.push(`Domain=${opts.domain}`)
  return parts.join('; ')
}

/**
 * Derive the cookie domain from the API origin. For api.mindmap.icu,
 * returns ".mindmap.icu" so the cookie is shared with the SPA.
 * Returns undefined for localhost (browsers reject Domain= for hosts
 * without a public suffix).
 */
export function cookieDomainFor(apiOrigin: string): string | undefined {
  try {
    const url = new URL(apiOrigin)
    const host = url.hostname
    if (host === 'localhost' || host.startsWith('127.') || host.endsWith('.local')) {
      return undefined
    }
    // api.mindmap.icu → .mindmap.icu (drop the leftmost label)
    const parts = host.split('.')
    if (parts.length < 2) return undefined
    return `.${parts.slice(-2).join('.')}`
  } catch {
    return undefined
  }
}
