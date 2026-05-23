/**
 * AuthButton — header element showing either:
 *   - "Sign in with Google" (signed out)
 *   - User avatar + name + dropdown with Sign out (signed in)
 *   - Loading skeleton while fetching
 */
import { useState } from 'react'
import { useCurrentUser, startGoogleSignIn, signOut } from './auth'

export function AuthButton() {
  const { user } = useCurrentUser()
  const [menuOpen, setMenuOpen] = useState(false)

  // Loading skeleton — match button size so the header doesn't jump
  if (user === undefined) {
    return <div className="h-7 w-32 rounded-md bg-white/[0.04] animate-pulse" />
  }

  if (user === null) {
    return (
      <button
        type="button"
        onClick={() => startGoogleSignIn()}
        className="
          inline-flex items-center gap-2 rounded-md
          border border-white/[0.08] bg-white/[0.02]
          px-3 py-1.5 text-xs font-medium text-white/85
          transition-colors hover:bg-white/[0.06] hover:text-white
        "
      >
        <GoogleIcon className="h-3.5 w-3.5" />
        Sign in with Google
      </button>
    )
  }

  const displayName = user.name?.trim() || user.email
  const initial = (user.name?.[0] ?? user.email[0] ?? '?').toUpperCase()

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        className="
          inline-flex items-center gap-2 rounded-md
          border border-white/[0.08] bg-white/[0.02]
          py-0.5 pl-0.5 pr-2 text-xs text-white/85
          transition-colors hover:bg-white/[0.06] hover:text-white
        "
      >
        {user.pictureUrl ? (
          <img
            src={user.pictureUrl}
            alt=""
            className="h-6 w-6 rounded ring-1 ring-white/10"
          />
        ) : (
          <span className="
            inline-flex h-6 w-6 items-center justify-center rounded
            bg-chozen/15 text-chozen font-semibold ring-1 ring-chozen/30
          ">
            {initial}
          </span>
        )}
        <span className="max-w-[140px] truncate font-medium">
          {displayName}
        </span>
        <span className="text-[9px] text-white/40">▾</span>
      </button>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="
            absolute right-0 top-full z-50 mt-2 w-56
            rounded-lg border border-white/[0.1] bg-black/95
            backdrop-blur-xl
            shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]
            py-1
          ">
            <div className="px-3 py-2 border-b border-white/[0.06]">
              <div className="text-sm font-medium text-white truncate">
                {displayName}
              </div>
              <div className="text-[11px] text-white/45 truncate mt-0.5">
                {user.email}
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                setMenuOpen(false)
                await signOut()
                window.location.reload()
              }}
              className="
                w-full text-left px-3 py-2 text-sm text-white/80
                transition-colors hover:bg-white/[0.04] hover:text-white
              "
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20.5H24v8h11.3c-1.7 4.6-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 7.5 29.3 5.5 24 5.5 13.2 5.5 4.5 14.2 4.5 25S13.2 44.5 24 44.5c11.4 0 19.5-8.3 19.5-19.5 0-1.5-.2-2.9-.4-4z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.5 29.3 4.5 24 4.5 16.5 4.5 9.9 8.9 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44.5c5.2 0 9.9-2 13.5-5.2l-6.2-5.2c-1.9 1.3-4.4 2.1-7.3 2.1-5.1 0-9.5-3.3-11.3-7.9l-6.6 5.1C9.6 39.7 16.3 44.5 24 44.5z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20.5H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.2 5.2C41.4 35.2 43.5 30.4 43.5 25c0-1.5-.2-2.9-.4-4z"/>
    </svg>
  )
}
