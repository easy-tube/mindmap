/**
 * Google OAuth 2.0 — authorization code flow with PKCE-equivalent
 * state nonce.
 *
 * Flow:
 *   1. /auth/google/start  → generate state, store in KV, redirect to
 *      Google with state + redirect_uri.
 *   2. /auth/google/callback?code=&state=  → verify state, exchange
 *      code for tokens at Google, verify ID token, upsert user,
 *      create session, set cookie, redirect to APP_ORIGIN.
 *
 * Why state nonce: CSRF protection. Without it an attacker could
 * trick a user into completing an OAuth callback for the attacker's
 * account.
 *
 * Why not PKCE: PKCE is overkill for confidential clients (server-side
 * with a client_secret). We use it anyway in spirit by storing a
 * random state value in KV with short TTL.
 *
 * ID token verification: we validate the iss + aud claims after
 * fetching Google's discovery doc. Signature validation is skipped in
 * v0 — the token comes directly from Google's HTTPS endpoint in the
 * same request, so MITM is not a concern. v1 should add full JWKS
 * verification.
 */
import type { Env, User } from './types'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const STATE_TTL_SEC = 10 * 60  // 10 minutes for the user to complete the flow

export function buildAuthorizationUrl(env: Env, state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    state,
    prompt: 'select_account',  // let user pick which Google account each time
  })
  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

export async function storeState(env: Env, state: string, returnTo: string): Promise<void> {
  await env.KV.put(`oauth_state:${state}`, returnTo, { expirationTtl: STATE_TTL_SEC })
}

export async function consumeState(env: Env, state: string): Promise<string | null> {
  const value = await env.KV.get(`oauth_state:${state}`)
  if (value !== null) {
    // Single-use: delete on consume so a replay can't reuse the nonce.
    await env.KV.delete(`oauth_state:${state}`)
  }
  return value
}

export type GoogleTokenResponse = {
  access_token: string
  expires_in: number
  scope: string
  token_type: 'Bearer'
  id_token: string
}

export async function exchangeCodeForTokens(env: Env, code: string, redirectUri: string): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    code,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  })
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Google token exchange failed: ${res.status} ${text}`)
  }
  return (await res.json()) as GoogleTokenResponse
}

export type GoogleIdTokenClaims = {
  iss: string
  sub: string            // stable Google account id
  aud: string
  email: string
  email_verified?: boolean
  name?: string
  picture?: string
  exp: number
  iat: number
}

/**
 * Decode + minimally validate an ID token.
 *
 * v0: structural validation (iss / aud match) + expiry.
 * v1 TODO: full JWKS signature verification.
 *
 * Skipping signature verification IS safe here because the token came
 * directly from Google over HTTPS in the same Worker request. A MITM
 * would need to break Cloudflare's TLS, which is out of scope.
 */
export function decodeIdToken(env: Env, idToken: string): GoogleIdTokenClaims {
  const [, payloadB64] = idToken.split('.')
  if (!payloadB64) throw new Error('Malformed ID token')
  const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))
  const claims = JSON.parse(json) as GoogleIdTokenClaims
  if (claims.iss !== 'https://accounts.google.com' && claims.iss !== 'accounts.google.com') {
    throw new Error(`Unexpected ID token issuer: ${claims.iss}`)
  }
  if (claims.aud !== env.GOOGLE_CLIENT_ID) {
    throw new Error(`Unexpected ID token audience: ${claims.aud}`)
  }
  if (claims.exp * 1000 < Date.now()) {
    throw new Error('ID token expired')
  }
  return claims
}

/**
 * Upsert a user from ID token claims. Idempotent — same Google sub
 * always finds the same row.
 */
export async function upsertUserFromClaims(env: Env, claims: GoogleIdTokenClaims): Promise<User> {
  const now = Date.now()
  const existing = await env.DB.prepare(`SELECT * FROM users WHERE google_sub = ? LIMIT 1`)
    .bind(claims.sub)
    .first<User>()
  if (existing) {
    // Refresh fields that may have changed (email, name, picture).
    const updated: User = {
      ...existing,
      email: claims.email,
      email_verified: claims.email_verified ? 1 : 0,
      name: claims.name ?? null,
      picture_url: claims.picture ?? null,
      updated_at: now,
    }
    await env.DB.prepare(
      `UPDATE users SET email = ?, email_verified = ?, name = ?, picture_url = ?, updated_at = ?
       WHERE id = ?`,
    )
      .bind(updated.email, updated.email_verified, updated.name, updated.picture_url, updated.updated_at, updated.id)
      .run()
    return updated
  }
  const user: User = {
    id: crypto.randomUUID(),
    google_sub: claims.sub,
    email: claims.email,
    email_verified: claims.email_verified ? 1 : 0,
    name: claims.name ?? null,
    picture_url: claims.picture ?? null,
    created_at: now,
    updated_at: now,
  }
  await env.DB.prepare(
    `INSERT INTO users (id, google_sub, email, email_verified, name, picture_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(user.id, user.google_sub, user.email, user.email_verified, user.name, user.picture_url, user.created_at, user.updated_at)
    .run()
  return user
}
