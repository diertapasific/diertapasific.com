# Dipa's desk

Dierta Pasific's interactive portfolio, built with React 18, TypeScript, Vite 6, Three.js, React Three Fiber and Tailwind CSS 3. The current experience is the monochrome blueprint desk in `src/desk`; older page components are retained for their shared content.

The desk includes projects and Medium readers, an About book with experience and education, reading notes, Spotify listening status, writing, a reversible contact badge, and Tifa, a profile-grounded Groq assistant. Tifa can use the full saved Medium text editions in `src/desk/data/medium-articles.json`. The active Yorkie is an original procedural model; the previous statue scan and CC BY attribution are retained under `public/assets/desk`.

## Local development

```sh
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Put local credentials in ignored `.env.local`; use `.env.example` for variable names. Never prefix private credentials with `VITE_`. The local Vite middleware serves `/api/tifa` and `/api/spotify/now-playing`.

For local Spotify authorization, register `http://127.0.0.1:5173/api/spotify/callback` in the Spotify Developer app, then open `http://127.0.0.1:5173/api/spotify/connect`. Only currently-playing and recently-played read scopes are requested, using PKCE. The private refresh token stays in ignored `.spotify/connection.json`. Do not upload that folder. Without a public proxy, the local server polls every 15 seconds and preserves the last observed track. After production is connected, set local `SPOTIFY_PUBLIC_STATUS_URL=https://diertapasific.vercel.app/api/spotify/now-playing` to reuse the cloud snapshot and stop independent local token refreshes. Leave that value empty when deliberately authorizing a separate local connection.

## Vercel

`vercel.json` builds the Vite frontend and two Node functions:

- `POST /api/tifa`: bounded conversations, profile/article retrieval, Groq calls and a shared eight-request-per-minute visitor quota.
- `GET /api/spotify/now-playing`: a sanitized public playback snapshot, shared five-second cache and distributed polling lease. Refresh tokens and last-observed tracks persist in Redis. Provider backoff also survives cold instances.

Tifa answers a small set of supported identity, employment-date and hiring questions directly from the public profile, including during provider outages. Other questions use Groq with server-selected profile notes and article excerpts. The default chain is GPT-OSS 20B, then GPT-OSS 120B, both available on Groq’s free plan with compatible strict JSON output. Each model is tried at most once, with six seconds per attempt and a twelve-second shared deadline. Model unavailability, provider request rejection, overload, model rate limits and invalid replies can trigger the alternate; invalid credentials and explicit account-wide quota errors cannot. If both fail, the browser shows saved profile notes and respects the returned retry interval. This does not remove Groq account quotas or guarantee capacity during a provider-wide outage.

A free Upstash Redis database provides durable token storage and shared quotas. Both `UPSTASH_REDIS_REST_*` and Vercel integration `KV_REST_API_*` names are supported. Keep the database and functions in the same region.

Configure **Production** variables before redeploying:

| Name | Vercel type | Purpose |
| --- | --- | --- |
| `GROQ_API_KEY` | Secret | Server-only Groq credential |
| `SPOTIFY_REFRESH_TOKEN` | Secret | Initial PKCE connection token; subsequent rotations are saved in Redis |
| `UPSTASH_REDIS_REST_TOKEN` or `KV_REST_API_TOKEN` | Secret | Redis write credential |
| `SPOTIFY_CLIENT_ID` | Config | Public Spotify app ID |
| `GROQ_MODEL` | Config | Primary model; defaults to `openai/gpt-oss-20b` |
| `GROQ_FALLBACK_MODEL` | Config | Optional override; defaults to `openai/gpt-oss-120b` (empty disables it) |
| `UPSTASH_REDIS_REST_URL` or `KV_REST_API_URL` | Config | Redis REST endpoint |
| `SITE_URL` | Config | Canonical production URL, including `https://` |

Secrets are runtime-only; none belong in frontend variables, source archives or Git. Configure separate credentials and a separate Redis namespace for Preview environments before enabling their backend. There is no public production Spotify authorization route. Reconnect privately if Spotify revokes the account's refresh token.

The deployed speaker updates through Vercel when visited, including while the laptop is off. When the site was idle, a newer Spotify history entry can replace an older observed song; older history cannot overwrite a newer observation. Spotify may delay history updates, so the UI distinguishes current playback, last seen and unavailable states. This is not a continuous listening archive.

`SITE_URL` controls canonical/social metadata during the build. Update it and redeploy when adding a custom domain. `VERCEL_PROJECT_PRODUCTION_URL` is used as a fallback on Vercel. The original GitHub Pages URL is the local fallback.

The Vercel project is connected to the personal GitHub repository. Pull requests create Preview deployments; merging into `main` deploys Production. The `Portfolio checks` workflow runs the regression suite, compiled Node handler check, frontend build and retained Worker build. Preview backends remain unconfigured until separate secrets/storage are explicitly added. Changing Vercel environment variables requires a redeployment. The `portfolio-v1` tag preserves the site before the desk redesign.

## Validation and maintenance

```sh
node --test scripts/*.test.mjs
npm run build:vercel
npm run build:worker
```

Tests cover camera/focus transitions, companion motion, Tifa contracts and retrieval, Spotify OAuth/state handling, cloud token persistence, caching and quotas. Provider mocks validate behavior; a successful live response is separate proof of credential access.

Writing uses its original live 3D paper mechanism on desktop, phone and tablet. The camera and graphics context stay active, the full saved article is displayed on the projected paper, and switching articles moves the physical sheets on mobile too. The same renderer handles entry and return, with no bitmap handoff or renderer warmup. Articles are bundled full text editions, not fetched from Medium while scrolling.

Refresh the saved public articles with `python3 scripts/sync-medium-articles.py`, then rebuild. Current profile notes override historical biography. VeganFuel has no Medium write-up. The legacy Cloudflare Worker remains under `worker/`; it is not the backend used by the Vercel build. Building it does not publish it. The legacy GitHub Pages workflow is manual-only so pushes no longer deploy a second copy with unavailable server endpoints.

For the affected Safari device, the previous native reader remains available at `?paper=native#writing`. It copies the rendered desk into a static 2D bitmap, disposes the normal renderer while reading, and recreates it on exit. `?paper=native&camera=parked#writing` retains the hidden renderer instead and resumes the existing camera on exit; context eviction falls back to a fresh renderer. The older `?camera=parked#writing` comparison link still selects this native path. The native reader also remains available after a real graphics failure regardless of URL. These alternatives are diagnostic fallbacks; they are no longer selected automatically on touch devices. Physical Safari verification of the restored live reader is still required.

The browser performance pass batches the keyboard's original rigid geometry and outlines, skips unchanged HTML projections and annotation writes, and omits unused normal/bounds calculations during book folds. Visible scenes retain continuous animation, multisample antialiasing and the original pixel-density cap of 2. Hidden tabs stop drawing without disposing the renderer; graphics-readiness timeouts are suspended while hidden. The fixed desk viewport cannot be programmatically scrolled by focused article content. Mobile book folds and article sheet transitions remain enabled.

The measured local Chromium overview at 1440x1000 and 440x956 submitted 481 draws per frame versus 735 on the released baseline. Materials decreased from 704 to 450 and graphics geometries from 710 to 456. These are renderer workload counts, not a promise of a specific phone frame rate. The baseline and optimized scenes were compared at the same viewport, theme and pixel density. No resolution or antialiasing reduction was made.

Theme selection starts from `prefers-color-scheme` and follows system changes while the page is open. The manual toggle overrides the current display until the system preference changes or the page reloads. Older locally saved theme values no longer override the visitor's current system preference.

For local profiling and graphics recovery, open `http://127.0.0.1:5173/?scene-checks#writing`. The development-only controls sample the actual renderer, profile 180 frames, trace camera travel, trigger graphics failures and simulate inherited paper-colored text fill. Frame profiling reports interval timing, main-thread frame submission time (not GPU or OS CPU time), draw counts and graphics resource counts. `?scene-checks=touch#writing` forces the native fallback at any viewport, and `?scene-checks=timeout#writing` tests the readiness watchdog. `?paper-check=html#writing` isolates the native paper without initializing 3D while selected. These fault controls, profiling hooks and the HTML-only diagnostic are removed from production. No device data is collected.
