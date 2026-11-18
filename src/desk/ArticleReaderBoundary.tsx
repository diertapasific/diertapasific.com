'use client'

import { Component } from 'react'
import type { ReactNode } from 'react'

export class ArticleReaderBoundary extends Component<{ children: ReactNode; source: string }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed ? <div role="alert" className="m-5 border-y border-zinc-300 py-4 text-sm leading-relaxed">
      <p>The article couldn’t be displayed.</p>
      <button type="button" onClick={() => window.location.reload()} className="mt-2 min-h-11 underline underline-offset-4 active:scale-[.98]">reload reader</button>
      <a href={this.props.source} target="_blank" rel="noopener noreferrer" className="mt-2 block min-h-11 text-xs underline underline-offset-4">read the original on Medium</a>
    </div> : this.props.children
  }
}
