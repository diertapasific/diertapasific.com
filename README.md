# Dipa's desk

Dierta Pasific's monochrome, interactive 3D portfolio. Explore projects, writing, experience, education, reading notes, music and a contact badge through guided object views. Tifa is the desk's Yorkie companion.

Built with React 18, TypeScript, Vite 6, Three.js and React Three Fiber.

Run `npm install`, then `npm run dev`. Build with `npm run build`. Local and hosted backends are added separately.

The local Vite server supplies `/api/tifa` and `/api/spotify/now-playing`. Set server-only `GROQ_API_KEY`, `GROQ_MODEL` and public `SPOTIFY_CLIENT_ID` in ignored `.env.local`. Spotify uses PKCE through `http://127.0.0.1:5173/api/spotify/connect`; register the matching `/api/spotify/callback` redirect. Tokens stay in ignored `.spotify/`. The retained Worker uses the same Tifa knowledge and full saved Medium articles; `npm run build:worker` builds it without publishing.
