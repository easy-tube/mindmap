/**
 * Frontend auth — talks to api.mindmap.icu.
 *
 * Cookie-based: the browser sends the session cookie automatically on
 * `credentials: 'include'`. No tokens to manage in JS.
 */
import { useEffect, useState } from 'react'

// In production this is api.mindmap.icu; for local dev override via
// VITE_API_ORIGIN in .env.local.
export const API_ORIGIN =
  import.meta.env.VITE_API_ORIGIN ?? 'https://api.mindmap.icu'

export type CurrentUser = {
  id: string
  email: string
  name: string | null
  pictureUrl: string | null
  emailVerified: boolean
}

export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  try {
    const res = await fetch(`${API_ORIGIN}/auth/me`, {
      credentials: 'include',
    })
    if (res.status === 401) return null
    if (!res.ok) throw new Error(`/auth/me: ${res.status}`)
    const data = (await res.json()) as { ok: boolean; user: CurrentUser }
    return data.ok ? data.user : null
  } catch (e) {
    console.warn('[auth] fetchCurrentUser failed', e)
    return null
  }
}

export function startGoogleSignIn(): void {
  const returnTo = window.location.pathname + window.location.search + window.location.hash
  const url = new URL(`${API_ORIGIN}/auth/google/start`)
  url.searchParams.set('return_to', returnTo)
  window.location.href = url.toString()
}

export async function signOut(): Promise<void> {
  try {
    await fetch(`${API_ORIGIN}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })
  } catch (e) {
    console.warn('[auth] signOut failed', e)
  }
}

/**
 * Hook — current user. Re-fetches once on mount. Returns:
 *   - undefined while loading
 *   - null when signed out
 *   - the user object when signed in
 *
 * Sign-out + sign-in mutations cause a full-page navigation (OAuth
 * redirect / cookie clear → reload), so no manual re-fetch is needed.
 */
export function useCurrentUser(): {
  user: CurrentUser | null | undefined
  refresh: () => void
} {
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let alive = true
    fetchCurrentUser().then((u) => {
      if (alive) setUser(u)
    })
    return () => {
      alive = false
    }
  }, [nonce])

  return { user, refresh: () => setNonce((n) => n + 1) }
}
