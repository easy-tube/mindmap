# Setup — Google OAuth + API deploy

*One-time setup for the API backend (`api.mindmap.icu`) + Google sign-in.
Estimated time: 15-20 minutes of your hands; after that every push deploys
automatically.*

You'll set up:
1. A Google Cloud OAuth client (for sign-in)
2. A Cloudflare D1 database + KV namespace (for users/sessions)
3. A Cloudflare API token (for GitHub Actions to deploy)
4. GitHub repo secrets (the credentials above)
5. DNS for `api.mindmap.icu`

When all 5 are done, push to `main` and the API goes live.

---

## 1. Google Cloud OAuth client (~5 min)

Go to **<https://console.cloud.google.com/apis/credentials>**.

1. Top bar: **Select a project** → New project → name it `mindmap-icu` → Create.
2. **OAuth consent screen** (left sidebar) → External → fill in:
   - App name: **Mindmap**
   - User support email: your email
   - Developer contact email: your email
   - Save (skip the rest of the wizard, "Add scopes" can stay default)
3. Back to **Credentials** → **+ Create credentials** → **OAuth client ID**:
   - Application type: **Web application**
   - Name: `mindmap-icu-web`
   - Authorized JavaScript origins:
     - `https://mindmap.icu`
   - Authorized redirect URIs:
     - `https://api.mindmap.icu/auth/google/callback`
   - Create.
4. A modal pops up with **Client ID** and **Client Secret**. Copy both — you'll need them in step 4.

> If you want to support local dev too, also add:
> - JS origin: `http://localhost:5173`
> - Redirect URI: `http://localhost:8787/auth/google/callback`

---

## 2. Cloudflare D1 + KV (~3 min)

Open **<https://dash.cloudflare.com/?to=/:account/workers/d1>**.

1. **D1 → Create database**:
   - Name: `mindmap-db`
   - Region: default (Cloudflare picks closest)
   - Create.
2. Once created, copy the **Database ID** (long UUID shown on the database page).
3. Open `api/wrangler.toml` in this repo and replace `REPLACE_WITH_D1_DATABASE_ID` with that ID. Commit + push.

Then go to **Workers & Pages → KV** (sidebar):

4. **+ Create a namespace**:
   - Name: `mindmap-kv`
   - Create.
5. Copy the **ID** (the long hex string, NOT the name).
6. Open `api/wrangler.toml` and replace `REPLACE_WITH_KV_NAMESPACE_ID` with that ID. Commit + push.

---

## 3. Cloudflare API token (~5 min)

Open **<https://dash.cloudflare.com/profile/api-tokens>**.

1. **+ Create token**.
2. Use template: **Edit Cloudflare Workers** → Use template.
3. Under **Account Resources**: leave as "All accounts" or pick your account.
4. Under **Zone Resources**: pick `mindmap.icu` (so the token can manage the Workers route).
5. Add additional permissions (click "Add more"):
   - **Account → D1 → Edit** (to apply migrations)
   - **Account → Workers KV Storage → Edit** (to read/write KV)
6. Continue → Create Token. **Copy it now** — you can't see it again.

While here, also copy your **Account ID** (right sidebar of any CF dashboard page; under "API" or "Account ID").

---

## 4. GitHub repo secrets (~5 min)

Open **<https://github.com/easy-tube/mindmap/settings/secrets/actions>**.

Add these as **Repository secrets** (New repository secret button):

| Secret name | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | from step 3 |
| `CLOUDFLARE_ACCOUNT_ID` | from step 3 |
| `GOOGLE_CLIENT_SECRET` | from step 1 |
| `SESSION_SECRET` | run `openssl rand -hex 32` in a terminal and paste the output |

The **Google Client ID** is NOT a secret — it lives in `api/wrangler.toml` under `[vars]`. Open that file and replace the empty `GOOGLE_CLIENT_ID = ""` with your actual client ID from step 1.

Commit + push the wrangler.toml edits.

---

## 5. DNS — `api.mindmap.icu` (~5 min)

Two flavors here, pick one.

### Flavor A — Cloudflare Workers Custom Domain (recommended)

After the first deploy succeeds:

1. Open **Workers & Pages → mindmap-api → Settings → Triggers → Custom Domains**
2. **Add Custom Domain** → `api.mindmap.icu` → Add.

That's it. Cloudflare handles the DNS + TLS automatically.

### Flavor B — Worker route (advanced)

If you'd rather not use a custom domain:

1. Workers & Pages → mindmap-api → Settings → Triggers → **Routes**
2. Add route: `api.mindmap.icu/*` → mindmap-api worker.
3. DNS → Add a CNAME `api` → `mindmap-api.YOUR-SUBDOMAIN.workers.dev` (proxied via CF).

---

## 6. First deploy

After the secrets + wrangler.toml are filled in, the next push to `main` (or `workflow_dispatch` from the Actions tab) fires `deploy-api.yml`:

1. Typechecks the Worker
2. Applies the D1 migration (`0001_users_sessions.sql`)
3. Pushes `GOOGLE_CLIENT_SECRET` + `SESSION_SECRET` as Worker secrets
4. Deploys the Worker

When it's green: `https://api.mindmap.icu/` should return `{ "ok": true, "service": "mindmap-api", "version": "0.0.1" }`.

Then sign-in works: open `mindmap.icu`, click **Sign in with Google**, complete the consent screen, you'll land back on mindmap.icu signed in.

---

## Troubleshooting

**`/auth/me` returns 401 after sign-in**
The cookie isn't being read. Check the Worker logs (`wrangler tail`) — look for the Set-Cookie header. Most common cause: API and frontend are on different parent domains (e.g. `mindmap.icu` vs `something-else.com`). The cookie domain in `session.ts:cookieDomainFor()` returns `.mindmap.icu` for `api.mindmap.icu` — both sides need to be under `mindmap.icu`.

**OAuth error: redirect_uri_mismatch**
The redirect URI in the Google console doesn't match what the Worker sends. Make sure step 1's "Authorized redirect URIs" includes EXACTLY `https://api.mindmap.icu/auth/google/callback` (with the `https://`, no trailing slash).

**D1 migration fails on deploy**
Common cause: the database_id in `wrangler.toml` doesn't match an existing database in your account. Re-check step 2.

**`wrangler secret put` fails with "no secret name"**
The GitHub Actions step pipes the secret value to stdin. If a value is empty (e.g. `GOOGLE_CLIENT_SECRET` is set but the value is the empty string in repo secrets), wrangler errors. Re-paste the secret value in GitHub repo settings.

---

## What lives where after this is set up

- `mindmap.icu` (frontend) — Cloudflare Pages, free quota, served from the SPA in `src/`
- `api.mindmap.icu` (backend) — Cloudflare Worker, paid plan quota, code in `api/`
- D1 database `mindmap-db` — single source of truth for users + sessions
- KV namespace `mindmap-kv` — short-lived OAuth state nonces (10-min TTL)
- GitHub Actions `deploy-api.yml` — fires on every push to `main` that touches `api/**`

No staging environment, no preview deploys per PR (yet). Push to main = prod.
