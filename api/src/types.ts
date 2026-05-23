/**
 * Worker environment bindings — wired via wrangler.toml + GitHub Actions
 * secrets. Keep this in sync with both:
 *   - wrangler.toml [[d1_databases]] / [[kv_namespaces]] / [vars]
 *   - .github/workflows/deploy-api.yml secrets
 */
export type Env = {
  DB: D1Database
  KV: KVNamespace

  // Set via [vars] in wrangler.toml — public-ish (visible to anyone
  // who runs `wrangler tail`).
  GOOGLE_CLIENT_ID: string
  APP_ORIGIN: string
  API_ORIGIN: string

  // Secrets — set via `wrangler secret put` OR in the GitHub Actions
  // workflow. Never logged.
  GOOGLE_CLIENT_SECRET: string
  SESSION_SECRET: string  // HMAC key for session-id signing (32 bytes hex)
}

export type User = {
  id: string
  google_sub: string
  email: string
  email_verified: number
  name: string | null
  picture_url: string | null
  created_at: number
  updated_at: number
}

export type Session = {
  id: string
  user_id: string
  created_at: number
  expires_at: number
  user_agent: string | null
  ip_hash: string | null
}

// Hono context with our Env bindings. Use this in every route handler.
export type AppCtx = {
  Bindings: Env
  Variables: {
    // Set by the auth middleware if a valid session cookie is present.
    currentUser?: User
  }
}
