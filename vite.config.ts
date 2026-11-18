import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { tifaPlugin } from './server/tifaPlugin'
import { spotifyPlugin } from './server/spotify.mjs'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const configuredUrl = env.SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || 'https://diertapasific.github.io'
  const url = new URL(configuredUrl.includes('://') ? configuredUrl : `https://${configuredUrl}`)
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('SITE_URL must use HTTP or HTTPS')
  const siteUrl = url.origin.replaceAll('&', '&amp;').replaceAll('"', '&quot;')
  return {
    plugins: [react(), spotifyPlugin(), tifaPlugin(), {
    name: 'portfolio-public-metadata',
    transformIndexHtml: html => html.replaceAll('__SITE_URL__', siteUrl),
  }],
    publicDir: 'public',
    base: '/',
    build: {
      outDir: 'dist',
    },
  }
})
