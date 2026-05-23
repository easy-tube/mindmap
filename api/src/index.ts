/**
 * mindmap-api — Cloudflare Worker, Hono router.
 *
 * Routes:
 *   GET  /                            — health check (returns JSON)
 *   GET  /auth/google/start           — kick off OAuth flow
 *   GET  /auth/google/callback        — handle Google's redirect back
 *   GET  /auth/me                     — current user (or 401)
 *   POST /auth/logout                 — clear session
 *
 * Future:
 *   GET    /mindmaps                  — list user's saved mindmaps
 *   POST   /mindmaps                  — create
 *   GET    /mindmaps/:id              — read
 *   PUT    /mindmaps/:id              — update
 *   DELETE /mindmaps/:id              — delete
 *   POST   /mindmaps/:id/share        — create a public share token
 *
 * The frontend uses cookies for auth — no bearer tokens, no CSRF tokens
 * (we rely on SameSite=Lax for CSRF protection + explicit POST on
 * mutating ops).
 */
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { AppCtx } from './types'
import {
  buildAuthorizationUrl,
  consumeState,
  decodeIdToken,
  exchangeCodeForTokens,
  storeState,
  upsertUserFromClaims,
} from './google-oauth'
import {
  clearSessionCookieHeader,
  cookieDomainFor,
  createSession,
  deleteSession,
  lookupSession,
  readSessionCookie,
  sessionCookieHeader,
} from './session'

const app = new Hono<AppCtx>()

// CORS — allow the SPA origin to call us with credentials.
app.use('*', async (c, next) => {
  return cors({
    origin: c.env.APP_ORIGIN,
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })(c, next)
})

// Auth middleware — populates c.var.currentUser if a valid session cookie is present.
app.use('*', async (c, next) => {
  const sessionId = readSessionCookie(c.req.raw)
  if (sessionId) {
    const result = await lookupSession(c.env, sessionId)
    if (result) c.set('currentUser', result.user)
  }
  await next()
})

// ─── Health ───────────────────────────────────────────────────────────

app.get('/', (c) => c.json({ ok: true, service: 'mindmap-api', version: '0.0.1' }))

// ─── Auth ─────────────────────────────────────────────────────────────

app.get('/auth/google/start', async (c) => {
  // The frontend may have sent ?return_to=/some/path to come back to a
  // specific page after sign-in. Default: app root.
  const returnTo = c.req.query('return_to') ?? '/'
  const state = crypto.randomUUID()
  await storeState(c.env, state, returnTo)
  const redirectUri = `${c.env.API_ORIGIN}/auth/google/callback`
  const url = buildAuthorizationUrl(c.env, state, redirectUri)
  return c.redirect(url, 302)
})

app.get('/auth/google/callback', async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')
  const errParam = c.req.query('error')
  if (errParam) {
    return c.text(`OAuth error: ${errParam}`, 400)
  }
  if (!code || !state) {
    return c.text('Missing code or state', 400)
  }
  const returnTo = await consumeState(c.env, state)
  if (returnTo === null) {
    return c.text('Invalid or expired state', 400)
  }
  const redirectUri = `${c.env.API_ORIGIN}/auth/google/callback`
  try {
    const tokens = await exchangeCodeForTokens(c.env, code, redirectUri)
    const claims = decodeIdToken(c.env, tokens.id_token)
    const user = await upsertUserFromClaims(c.env, claims)
    const session = await createSession(c.env, user.id, {
      userAgent: c.req.header('User-Agent') ?? null,
      ipHash: null,  // v1 will add ip_hash for abuse signals
    })
    const domain = cookieDomainFor(c.env.API_ORIGIN)
    const cookie = sessionCookieHeader(session.id, { domain })
    // Build the final redirect URL — sanitize returnTo so it can't
    // be used as an open redirect.
    const safeReturnTo = returnTo.startsWith('/') ? returnTo : '/'
    const dest = new URL(safeReturnTo, c.env.APP_ORIGIN).toString()
    return new Response(null, {
      status: 302,
      headers: {
        Location: dest,
        'Set-Cookie': cookie,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[auth/callback] failed', msg)
    return c.text(`Auth failed: ${msg}`, 500)
  }
})

app.get('/auth/me', (c) => {
  const user = c.var.currentUser
  if (!user) return c.json({ ok: false, error: 'not_authenticated' }, 401)
  // Don't leak google_sub or email_verified raw — fold into a clean DTO.
  return c.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      pictureUrl: user.picture_url,
      emailVerified: user.email_verified === 1,
    },
  })
})

app.post('/auth/logout', async (c) => {
  const sessionId = readSessionCookie(c.req.raw)
  if (sessionId) await deleteSession(c.env, sessionId)
  const domain = cookieDomainFor(c.env.API_ORIGIN)
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': clearSessionCookieHeader({ domain }),
    },
  })
})

// 404 catch-all
app.notFound((c) => c.json({ ok: false, error: 'not_found' }, 404))
app.onError((err, c) => {
  console.error('[api] uncaught', err)
  return c.json({ ok: false, error: 'internal_error' }, 500)
})

export default app
