import type { Plugin } from 'vite'
import editions from '../src/desk/data/medium-articles.json'
import { renderArticles } from './renderArticles.mjs'

const name = 'virtual:medium-editions', resolved = `\0${name}`
export function articleEditionsPlugin(): Plugin {
  return {
    name: 'compiled-medium-editions',
    resolveId(id) { if (id === name) return resolved },
    load(id) { if (id === resolved) return `export default ${JSON.stringify(renderArticles(editions))}` },
  }
}
