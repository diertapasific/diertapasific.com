# Dipa's desk

Live site: [diertapasific.com](https://www.diertapasific.com/) · Repository: [diertapasific/diertapasific.com](https://github.com/diertapasific/diertapasific.com)

Dierta Pasific's interactive portfolio, built with React 18, TypeScript, Vite 6, Three.js, React Three Fiber and Tailwind CSS 3. The current experience is the monochrome blueprint desk in `src/desk`; older page components are retained for their shared content.

The desk includes projects and Medium readers, an About book with experience and education, reading notes, Spotify listening status, a tabletop contact badge and lanyard, and Tifa, a profile-grounded Groq assistant. Tifa can use the full saved Medium text editions in `src/desk/data/medium-articles.json`. The active Yorkie is an original procedural model; the previous statue scan and CC BY attribution are retained under `public/assets/desk`.

## Local development

```sh
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Put local credentials in ignored `.env.local`; use `.env.example` for variable names. Never prefix private credentials with `VITE_`. The local Vite middleware serves `/api/tifa` and `/api/spotify/now-playing`.

For local Spotify authorization, register `http://127.0.0.1:5173/api/spotify/callback` in the Spotify Developer app, then open `http://127.0.0.1:5173/api/spotify/connect`. Only currently-playing and recently-played read scopes are requested, using PKCE. The private refresh token stays in ignored `.spotify/connection.json`. Do not upload that folder. Without a public proxy, the local server polls every 15 seconds and preserves the last observed track. After production is connected, set local `SPOTIFY_PUBLIC_STATUS_URL=https://www.diertapasific.com/api/spotify/now-playing` to reuse the cloud snapshot and stop independent local token refreshes. Leave that value empty when deliberately authorizing a separate local connection.

## Vercel

`vercel.json` builds the Vite frontend and two Node functions:

- `POST /api/tifa`: bounded conversations, profile/article retrieval, Groq calls and a shared eight-request-per-minute IP quota. Before calling Groq, atomic shared budgets also cap each IP at 40 AI requests per 24-hour window and the site at 20 per minute / 500 per 24-hour window. These windows start on their first admitted request; they do not reset at midnight. Invalid messages and supported saved-profile replies do not spend the AI budget. Each admitted request can try up to two models, and provider token/account limits still apply.
- `GET /api/spotify/now-playing`: a sanitized public playback snapshot, shared five-second cache and distributed polling lease. Refresh tokens and last-observed tracks persist in Redis. Provider backoff also survives cold instances.

Tifa answers a small set of supported identity, employment-date and hiring questions directly from the public profile, including during provider outages. Other questions use Groq with server-selected profile notes and article excerpts. The default chain is GPT-OSS 20B, then GPT-OSS 120B, both available on Groq’s free plan with compatible strict JSON output. Each model is tried at most once, with six seconds per attempt and a twelve-second shared deadline. Model unavailability, provider request rejection, overload, model rate limits and invalid replies can trigger the alternate; invalid credentials and explicit account-wide quota errors cannot. If both fail, the browser shows saved profile notes and respects the returned retry interval. This does not remove Groq account quotas or guarantee capacity during a provider-wide outage.

A free Upstash Redis database provides durable token storage and shared quotas. Both `UPSTASH_REDIS_REST_*` and Vercel integration `KV_REST_API_*` names are supported. Keep the database and functions in the same region.

Configure **Production** variables before redeploying:

| Name | Vercel type | Purpose |
| --- | --- | --- |
| `GROQ_API_KEY` | Secret | Server-only Groq credential |
| `SPOTIFY_REFRESH_TOKEN` | Secret | Initial PKCE connection token; subsequent rotations are saved in Redis |
| `UPSTASH_REDIS_REST_TOKEN` or `KV_REST_API_TOKEN` | Secret | Redis write credential |
| `TIFA_DAILY_VISITOR_LIMIT` | Config | Optional positive integer; defaults to 40 AI requests per IP per 24 hours |
| `TIFA_GLOBAL_MINUTE_LIMIT` | Config | Optional positive integer; defaults to 20 site-wide AI requests per minute |
| `TIFA_GLOBAL_DAILY_LIMIT` | Config | Optional positive integer; defaults to 500 site-wide AI requests per 24 hours |
| `SPOTIFY_CLIENT_ID` | Config | Public Spotify app ID |
| `GROQ_MODEL` | Config | Primary model; defaults to `openai/gpt-oss-20b` |
| `GROQ_FALLBACK_MODEL` | Config | Optional override; defaults to `openai/gpt-oss-120b` (empty disables it) |
| `UPSTASH_REDIS_REST_URL` or `KV_REST_API_URL` | Config | Redis REST endpoint |

Secrets are runtime-only; none belong in frontend variables, source archives or Git. Configure separate credentials and a separate Redis namespace for Preview environments before enabling their backend. There is no public production Spotify authorization route. Reconnect privately if Spotify revokes the account's refresh token.

The deployed speaker updates through Vercel when visited, including while the laptop is off. When the site was idle, a newer Spotify history entry can replace an older observed song; older history cannot overwrite a newer observation. Spotify may delay history updates, so the UI distinguishes current playback, last seen and unavailable states. This is not a continuous listening archive.

The public canonical address, `https://www.diertapasific.com`, is tracked in `vite.config.ts` and used for canonical/social metadata in every build. This keeps Preview deployments and old hosting environment values from changing shared links. Update that address and redeploy when changing the production domain.

The Vercel project is connected to the personal GitHub repository, `diertapasific/diertapasific.com`. GitHub Pages is disabled; production hosting is on Vercel. Pull requests create Preview deployments; merging into `main` deploys Production. The `Portfolio checks` workflow runs the regression suite, compiled Node handler check, frontend build and retained Worker build. Preview backends remain unconfigured until separate secrets/storage are explicitly added. Changing Vercel environment variables requires a redeployment. The `portfolio-v1` tag preserves the site before the desk redesign.

## Validation and maintenance

```sh
node --test scripts/*.test.mjs
npm run build:vercel
npm run build:worker
```

Tests cover camera/focus transitions, companion motion, Tifa contracts and retrieval, Spotify OAuth/state handling, cloud token persistence, caching and quotas. Provider mocks validate behavior; a successful live response is separate proof of credential access.

The desk contact badge rests in the former writing zone with a loose, overlapping lanyard. Its compact resting scale is 0.8; the focused scale remains 1.8. The badge, ribbon and clasp share the flip transform and clear the tabletop during interrupted returns. Desktop and mobile labels anchor to the badge. Writing is absent from the dock and desk overview; project articles remain available inside the monitor, and legacy Writing URLs still work.

The book curl keeps its original 3D mechanism. Its alignment gate now accepts half a CSS pixel of size rounding plus a tiny camera/float tolerance, fixing a reproduced stall at the preview/landing boundary. Width and height regression cases, the existing tiny top-down camera tilt, and forward/reverse browser turns at the reproducing viewport are covered. Verification on the affected physical iPhone remains separate.

Legacy Writing uses its original live 3D paper mechanism on desktop, phone and tablet. The camera and graphics context stay active, the full saved article is displayed on the projected paper, and switching articles moves the physical sheets on mobile too. The same renderer handles entry and return, with no bitmap handoff or renderer warmup. Articles are bundled full text editions, not fetched from Medium while scrolling.

Refresh the saved public articles with `python3 scripts/sync-medium-articles.py`, then rebuild. Current profile notes override historical biography. VeganFuel has no Medium write-up. The legacy Cloudflare Worker remains under `worker/`; it is not the backend used by the Vercel build. Building it does not publish it. The legacy GitHub Pages publishing workflow has been removed.

For the affected Safari device, the previous native reader remains available at `?paper=native#writing`. It copies the rendered desk into a static 2D bitmap, disposes the normal renderer while reading, and recreates it on exit. `?paper=native&camera=parked#writing` retains the hidden renderer instead and resumes the existing camera on exit; context eviction falls back to a fresh renderer. The older `?camera=parked#writing` comparison link still selects this native path. The native reader also remains available after a real graphics failure regardless of URL. These alternatives are diagnostic fallbacks; they are no longer selected automatically on touch devices. Physical Safari verification of the restored live reader is still required.

The browser performance pass batches the keyboard's original rigid geometry and outlines, skips unchanged HTML projections and annotation writes, and omits unused normal/bounds calculations during book folds. Visible scenes retain continuous animation, multisample antialiasing and the original pixel-density cap of 2. Hidden tabs stop drawing without disposing the renderer; graphics-readiness timeouts are suspended while hidden. The fixed desk viewport cannot be programmatically scrolled by focused article content. Mobile book folds and article sheet transitions remain enabled.

The measured local Chromium overview at 1440x1000 and 440x956 submitted 481 draws per frame versus 735 on the released baseline. Materials decreased from 704 to 450 and graphics geometries from 710 to 456. These are renderer workload counts, not a promise of a specific phone frame rate. The baseline and optimized scenes were compared at the same viewport, theme and pixel density. No resolution or antialiasing reduction was made.

Theme selection starts from `prefers-color-scheme` and follows system changes while the page is open. The manual toggle overrides the current display until the system preference changes or the page reloads. Older locally saved theme values no longer override the visitor's current system preference.

For local profiling and graphics recovery, open `http://127.0.0.1:5173/?scene-checks#writing`. The development-only controls sample the actual renderer, profile 180 frames, trace camera travel, trigger graphics failures and simulate inherited paper-colored text fill. Frame profiling reports interval timing, main-thread frame submission time (not GPU or OS CPU time), draw counts and graphics resource counts. `?scene-checks=touch#writing` forces the native fallback at any viewport, and `?scene-checks=timeout#writing` tests the readiness watchdog. `?paper-check=html#writing` isolates the native paper without initializing 3D while selected. These fault controls, profiling hooks and the HTML-only diagnostic are removed from production. No device data is collected.

## Security boundaries

Vercel sets the trusted forwarding header used for IP quotas. IP limits apply to shared networks, not individual people; distributed clients can still use multiple IPs, so the independent site-wide budget is required. Redis failure prevents new AI calls. CORS and fetch-metadata checks reject foreign browser origins, but they are not authentication for this intentionally public API. Quotas are tested locally with independent functions and mocked providers, never by flooding production. The retired Worker is not the production backend and has no shared quotas; do not redeploy it as a public substitute.

Production headers deny embedding the desk in other sites, disable MIME sniffing, restrict referrers and unnecessary device permissions, and block plugin objects, foreign base URLs and foreign form submissions. The CSP is a baseline policy; it does not yet restrict scripts/styles, because the WebGL/HTML scene and its workers need a separately tested policy. Tifa text is rendered as text, and article HTML is generated only from checked-in Markdown with raw HTML skipped and unsafe URL schemes filtered.

Keep Vercel account/team access, GitHub branch access, function spend alerts and edge firewall rules reviewed in their dashboards. App quotas protect Groq usage; they do not eliminate Vercel invocation or Redis command costs from large-scale abuse. Rotate credentials shared outside their secret store, and keep Preview credentials and storage isolated from Production.
