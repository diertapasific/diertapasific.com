'use client'

import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpRight, CaretRight, FolderSimple, GithubLogo } from '@phosphor-icons/react'
import { PROJECTS } from '../pages/Projects'
import { POSTS } from '../pages/Blog'
import { projectOverviews } from './projectOverviews'

const ArticleReader = lazy(() => import('./ArticleReader').then(module => ({ default: module.ArticleReader })))
function ReaderLoading() {
  return <div role="status" className="space-y-5 p-6"><p className="eyebrow">opening reader</p><div className="h-6 w-2/3 animate-pulse bg-zinc-200" />{[1, 2, 3].map(line => <div key={line} className="h-3 w-full animate-pulse bg-zinc-200" />)}</div>
}
const projects = PROJECTS.filter(project => ['Beacon', 'SumTube', 'Cardify', 'Rupcara', 'VeganFuel'].includes(project.name))
const external = { target: '_blank', rel: 'noopener noreferrer' }
const actionClass = 'inline-flex min-h-11 items-center justify-center gap-1.5 border px-2 font-mono text-[9px] transition-colors active:scale-[.98]'

function ProjectActions({ project, onArticle }: { project: typeof PROJECTS[number]; onArticle: () => void }) {
  const preview = project.links.find(link => link.label === 'Live Demo' || link.label === 'UI Preview')
  const repository = project.links.find(link => link.label === 'Repository')
  const article = POSTS.find(post => post.projectId === project.id)
  return <nav aria-label={`${project.name} links`} className="flex max-w-full flex-wrap gap-1.5">
    {preview && <a href={preview.href} {...external} aria-label={preview.label === 'Live Demo' ? `Try ${project.name}` : `View ${project.name} UI preview`} className={`${actionClass} border-[#313131] bg-[#313131] text-[#f6f6f6] hover:bg-[#484848]`}>{preview.label === 'Live Demo' ? 'try it' : 'UI preview'}<ArrowUpRight size={13} /></a>}
    {repository && <a href={repository.href} {...external} aria-label={`${project.name} on GitHub`} className={`${actionClass} border-zinc-300 text-zinc-600 hover:bg-zinc-200/50`}><GithubLogo size={14} />GitHub<ArrowUpRight size={12} /></a>}
    {article && <button onClick={onArticle} aria-label={`Read ${project.name} article`} className={`${actionClass} border-zinc-300 text-zinc-600 hover:bg-zinc-200/50`}>read article</button>}
  </nav>
}

export function ProjectWorkspace({ compact, height, requestedProject }: { compact: boolean; height: number; requestedProject?: {id:string;revision:number;article?:boolean}|null }) {
  const tight = compact && height < 380, short = height < 320
  const [open, setOpen] = useState<string | null>(compact ? null : projects[0].id)
  const [view, setView] = useState<'overview' | 'article'>('overview')
  const readingArticle = view === 'article', project = projects.find(item => item.id === open)
  const scrollOverview = short && !readingArticle
  const detail = useRef<HTMLDivElement>(null), title = useRef<HTMLHeadingElement>(null)
  useEffect(() => { if (!compact) setOpen(current => current ?? projects[0].id) }, [compact])
  useEffect(()=>{if(requestedProject&&projects.some(item=>item.id===requestedProject.id)){setOpen(requestedProject.id);setView(requestedProject.article?'article':'overview')}},[requestedProject?.id,requestedProject?.revision])
  useEffect(() => {
    detail.current?.scrollTo({ top: 0 })
    if (open && compact && !readingArticle) title.current?.focus({ preventScroll: true })
  }, [open, compact, view, readingArticle])

  return <div className="flex h-full min-h-0 flex-col bg-[#f8f8f8]">
    <div className={`flex shrink-0 items-center justify-between border-b border-zinc-300 px-3 font-mono text-[9px] text-zinc-500 ${compact ? 'h-11' : 'h-8'}`}>
      {compact && project ? <button onClick={() => { setOpen(null); setView('overview') }} className="flex min-h-11 items-center gap-2 text-[10px]"><ArrowLeft size={13} />all projects</button> : <span>dipa / workspace</span>}
      <span className="flex items-center gap-1.5" aria-hidden="true"><i className="size-1.5 rounded-full border border-zinc-400" /><i className="size-1.5 rounded-full border border-zinc-400" /><i className="size-1.5 rounded-full border border-zinc-400" /></span>
    </div>
    <div className={`grid min-h-0 flex-1 ${compact ? 'grid-cols-1' : 'grid-cols-[minmax(170px,.58fr)_minmax(0,2fr)]'}`}>
      {(!compact || !project) && <aside aria-label="Project selection" className={`min-h-0 border-r border-zinc-300 px-3 py-2 ${short ? 'surface-scroll overflow-y-auto overscroll-contain' : 'flex flex-col'}`}>
        <div className="mb-1 flex h-6 shrink-0 items-center justify-between px-2"><h2 tabIndex={-1} data-surface-heading className="text-[20px] leading-none tracking-[-.04em] outline-none">projects.</h2><span className="font-mono text-[9px] text-zinc-400">{String(projects.length).padStart(2, '0')}</span></div>
        <div className={`divide-y divide-zinc-200 ${short ? '' : 'surface-scroll min-h-0 flex-1 overflow-y-auto'}`}>{projects.map(item => <button key={item.id} onClick={() => { setOpen(item.id); setView('overview') }} aria-pressed={open === item.id} className={`flex min-h-11 w-full items-center gap-3 px-2 text-left transition-colors active:scale-[.98] ${open === item.id ? 'bg-zinc-200/70' : 'hover:bg-zinc-200/40'}`}><FolderSimple size={16} weight="light" className="shrink-0" /><span className="flex-1 text-[14px]">{item.name}</span><CaretRight size={12} /></button>)}</div>
        <a className="inline-flex min-h-11 shrink-0 items-center gap-2 px-2 text-[11px] text-zinc-500 underline underline-offset-4" href="https://github.com/diertapasific" {...external}>more on GitHub<ArrowUpRight size={13} /></a>
      </aside>}
      {project && <div ref={scrollOverview ? detail : undefined} data-project-overview-scroll={scrollOverview || undefined} className={scrollOverview ? 'surface-scroll min-h-0 overflow-y-auto overscroll-contain' : 'flex min-h-0 flex-col overflow-hidden'}>
        <Suspense fallback={<ReaderLoading />}>{readingArticle ? <ArticleReader projectId={project.id} projectName={project.name} onBack={() => setView('overview')} /> : <>
          <header className={`shrink-0 border-b border-zinc-300 ${compact ? tight ? 'p-2.5' : 'p-3' : 'px-5 py-3'}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><p className="mb-1 font-mono text-[8px] uppercase tracking-[.08em] text-zinc-400">project / {project.id}</p><h3 ref={title} tabIndex={-1} className={`${compact ? 'text-[26px]' : 'text-[32px]'} leading-none tracking-[-.05em] outline-none`}>{project.name}</h3></div>
              <ProjectActions project={project} onArticle={() => setView('article')} />
            </div>
            {!tight && <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[8px] text-zinc-400" aria-label="Built with">{project.tags.map(tag => <span key={tag}>{tag}</span>)}</p>}
          </header>
          <div ref={scrollOverview ? undefined : detail} data-project-detail={project.id} className={`${scrollOverview ? '' : 'surface-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain'} ${compact ? 'p-3' : 'px-5 py-4'}`}>
            <article key={project.id} data-project-overview className="content-enter space-y-5">
              <p className={`${compact ? 'text-[13px] leading-[1.65]' : 'max-w-[65ch] text-[14px] leading-[1.7]'} text-zinc-600`}>{projectOverviews[project.id].intro}</p>
              <section aria-label="How it works"><h4 className="mb-3 font-mono text-[9px] uppercase tracking-[.08em] text-zinc-400">how it works</h4>
                <ol className={`border-y border-zinc-300 ${compact ? 'divide-y divide-zinc-200' : 'grid grid-cols-3 divide-x divide-zinc-200'}`}>{projectOverviews[project.id].flow.map((step, index) => <li key={step.title} className={`relative ${compact ? 'grid grid-cols-[18px_minmax(0,1fr)] gap-2 py-3' : 'px-3 py-3 first:pl-0 last:pr-0'}`}>
                  <span className="font-mono text-[9px] text-zinc-400">0{index + 1}</span><div><h5 className={`${compact ? '' : 'mt-2'} text-[13px] tracking-tight`}>{step.title}</h5><p className="mt-1 text-[12px] leading-[1.55] text-zinc-500">{step.description}</p></div>{!compact && index < 2 && <ArrowRight aria-hidden="true" size={12} className="absolute -right-1.5 top-3 bg-[#f8f8f8] text-zinc-400" />}
                </li>)}</ol>
              </section>
              <section aria-label="Build notes"><h4 className="mb-3 font-mono text-[9px] uppercase tracking-[.08em] text-zinc-400">build notes</h4><div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-2 gap-5'}`}>{projectOverviews[project.id].notes.map(note => <div key={note.title}><h5 className="text-[14px] tracking-tight">{note.title}</h5><p className="mt-2 text-[12px] leading-[1.7] text-zinc-500">{note.body}</p></div>)}</div></section>
              <section aria-label="Project takeaway" className="border-t border-zinc-300 pb-2 pt-4"><h4 className="mb-2 font-mono text-[9px] uppercase tracking-[.08em] text-zinc-400">what stayed with me</h4><p className="max-w-[65ch] text-[13px] leading-[1.7] text-zinc-600">{projectOverviews[project.id].takeaway}</p></section>
            </article>
          </div>
        </>}</Suspense>
      </div>}
    </div>
    <div className="flex h-[22px] shrink-0 items-center justify-between border-t border-zinc-300 px-3 font-mono text-[8px] text-zinc-500"><span>{project ? `${project.name.toLowerCase()} / ${readingArticle ? 'article' : 'overview'}` : 'choose a folder'}</span><span>personal workspace</span></div>
  </div>
}
