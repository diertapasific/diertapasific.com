import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tifaPlugin } from './server/tifaPlugin'
import { spotifyPlugin } from './server/spotify.mjs'
import { articleEditionsPlugin } from './server/articleEditionsPlugin'

// Share cards always identify the public site, including on Preview builds.
const siteUrl = 'https://www.diertapasific.com'

export default defineConfig({
  plugins: [react(), articleEditionsPlugin(), spotifyPlugin(), tifaPlugin(), {
    name: 'portfolio-public-metadata',
    transformIndexHtml: html => html.replaceAll('__SITE_URL__', siteUrl),
  }],
  publicDir: 'public',
  base: '/',
  build: {
    outDir: 'dist',
  },
})
