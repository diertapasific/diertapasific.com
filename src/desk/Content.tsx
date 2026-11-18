'use client'

import { useState } from 'react'
import { ArrowUpRight, Copy, Check, ArrowLeft, ArrowRight } from '@phosphor-icons/react'
import type { AboutSection, Destination } from './model'
import { PROJECTS } from '../pages/Projects'
import { POSTS } from '../pages/Blog'
import { readingBooks } from './books'
import { profile } from './profile'
import { MusicScreen } from './MusicScreen'

const out = { target: '_blank', rel: 'noopener noreferrer' }
const linkClass = 'inline-flex min-h-11 items-center gap-2 text-sm underline decoration-zinc-300 underline-offset-4 transition-colors hover:decoration-zinc-800 active:scale-[.98]'

function Projects() {
  const [open, setOpen] = useState<string | null>(null)
  const items = PROJECTS.filter(item => ['Beacon', 'SumTube', 'Cardify', 'Rupcara', 'VeganFuel'].includes(item.name))
  const project = items.find(item => item.id === open)
  if (project) return <div className="content-enter">
    <button className={linkClass} onClick={() => setOpen(null)}><ArrowLeft />all projects</button>
    <div className="project-drawing my-6" aria-hidden="true"><span>{project.name.slice(0, 1)}</span><i /><i /></div>
    <p className="eyebrow">{project.tags.join(' / ')}</p>
    <h3 className="mt-3 text-3xl tracking-tight">{project.name}</h3>
    <p className="mt-4 text-[15px] leading-relaxed text-zinc-600">{project.description}</p>
    <div className="mt-6 flex flex-wrap gap-x-6">{project.links.map(link => <a className={linkClass} href={link.href} key={link.label} {...out}>{link.label}<ArrowUpRight /></a>)}</div>
  </div>
  return <div>
    <p className="mb-7 text-sm leading-relaxed text-zinc-600">A few things made out of curiosity, and a reason to keep learning.</p>
    <div className="divide-y divide-zinc-300/70 border-y border-zinc-300/70">{items.map((project, i) => <button key={project.id} onClick={() => setOpen(project.id)} className="group grid w-full grid-cols-[26px_1fr_20px] gap-3 py-5 text-left transition-transform active:scale-[.98]">
      <span className="pt-1 font-mono text-[11px] text-zinc-500">{String(i + 1).padStart(2, '0')}</span>
      <span><span className="block text-xl tracking-tight">{project.name}</span><span className="mt-1 block text-xs leading-relaxed text-zinc-500">{project.tagline}</span></span>
      <ArrowUpRight className="mt-1 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
    </button>)}</div>
    <a className={`${linkClass} mt-5`} href="https://github.com/diertapasific" {...out}>more on GitHub<ArrowUpRight /></a>
  </div>
}

export const aboutPages: AboutSection[] = ['intro', 'experience', 'education']
export const aboutPageLabel = (section: AboutSection) => section === 'intro' ? 'the person' : section

export function AboutPager({ section, onSection, disabled = false }: { section: AboutSection; onSection: (section: AboutSection) => void; disabled?: boolean }) {
  const index = aboutPages.indexOf(section)
  return <nav aria-label="Turn notebook pages" className="flex shrink-0 items-center justify-between gap-3 border-t border-zinc-300 px-5 py-2 font-mono text-[10px]">
    <button aria-label="Previous page" disabled={disabled || index === 0} onClick={() => onSection(aboutPages[index - 1])} className="flex min-h-11 items-center gap-2 active:scale-[.98] disabled:opacity-25"><ArrowLeft size={15} />previous</button>
    <button aria-label={index < 2 ? `Next page: ${aboutPageLabel(aboutPages[index + 1])}` : 'Last page'} disabled={disabled || index === 2} onClick={() => onSection(aboutPages[index + 1])} className="flex min-h-11 items-center gap-2 active:scale-[.98] disabled:opacity-25">{index < 2 ? aboutPageLabel(aboutPages[index + 1]) : 'last page'}<ArrowRight size={15} /></button>
  </nav>
}

export function AboutContent({ section }: { section: AboutSection }) {
  return <div>
    <div>
      {section === 'intro' && <>
        <h3 className="text-2xl tracking-tight">hey, i'm dipa.</h3>
        <p className="mt-5 text-[15px] leading-relaxed text-zinc-600">{profile.introduction}</p>
        <p className="mt-4 text-[15px] leading-relaxed text-zinc-600">This desk is a small collection of the things I build, write, and spend time thinking about.</p>
        <div className="mt-8 border-t border-zinc-300 pt-5"><p className="eyebrow">based in</p><p className="mt-2">Jakarta, Indonesia</p></div>
      </>}
      {section === 'experience' && <div className="space-y-7">{profile.work.map(job => <article key={job.organization} className="border-l border-zinc-300 pl-5"><p className="eyebrow">{job.date}</p><h3 className="mt-2 text-xl">{job.organization}</h3><p className="mt-1 text-sm">{job.role}</p><p className="mt-3 text-sm leading-relaxed text-zinc-500">{job.description}</p></article>)}</div>}
      {section === 'education' && <article><p className="eyebrow">{profile.education.dates}</p><h3 className="mt-3 text-2xl tracking-tight">{profile.education.university}</h3><p className="mt-3 text-sm text-zinc-600">{profile.education.degree} · {profile.education.location}</p><div className="mt-8 border-t border-zinc-300 pt-5"><p className="eyebrow">thesis</p><p className="mt-3 text-sm leading-relaxed">{profile.education.thesis}</p></div></article>}
    </div>
  </div>
}

function Reading() {
  return <div><div className="divide-y divide-zinc-300">{readingBooks.map(book => <article key={book.id} className="py-5"><p className="eyebrow">{book.author}</p><h3 className="mt-3 text-2xl tracking-tight">{book.title}</h3><div className="mt-4 space-y-4 text-sm leading-relaxed text-zinc-600">{book.notes.map(note => <p key={note}>{note}</p>)}</div></article>)}</div></div>
}

function Music() {
  return <div><div className="h-[220px] overflow-hidden border border-zinc-300"><MusicScreen compact={false} active /></div><p className="mt-4 text-sm leading-relaxed text-zinc-500">Listening activity reported by Spotify. Last seen shows the most recent track the site observed.</p></div>
}

function Writing() {
  return <div className="divide-y divide-zinc-300/70 border-t border-zinc-300/70">{POSTS.map(post => <a key={post.href} href={post.href} {...out} className="group block py-6"><p className="eyebrow">{post.date}</p><div className="mt-3 flex items-start gap-5"><h3 className="text-xl leading-snug tracking-tight">{post.title}</h3><ArrowUpRight className="mt-1 shrink-0 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" /></div><p className="mt-3 text-sm leading-relaxed text-zinc-500">{post.preview}</p><p className="mt-3 font-mono text-[11px] text-zinc-600">read on Medium</p></a>)}</div>
}

function Contact() {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  async function copy() {
    try { await navigator.clipboard.writeText('pasificdierta@gmail.com'); setCopied(true); setError('') }
    catch { setError('Copy is unavailable here. You can select the email address below.') }
  }
  return <div><p className="text-[15px] leading-relaxed text-zinc-600">Have something in mind, or just want to exchange ideas? I'd like to hear it.</p><div className="mt-8 border-y border-zinc-300 py-6"><p className="eyebrow">email</p><a className={`${linkClass} mt-2 break-all`} href="mailto:pasificdierta@gmail.com">pasificdierta@gmail.com<ArrowUpRight className="shrink-0" /></a><button onClick={copy} className="mt-2 flex min-h-11 items-center gap-2 text-xs text-zinc-500 active:scale-[.98]">{copied ? <Check /> : <Copy />}{copied ? 'copied to clipboard' : 'copy email'}</button><span className="sr-only" role="status">{copied ? 'Email copied' : ''}</span>{error && <p className="mt-2 text-xs" role="alert">{error}</p>}</div><div className="mt-5 flex flex-wrap gap-7"><a className={linkClass} href="https://www.linkedin.com/in/dierta-pasific/" {...out}>LinkedIn<ArrowUpRight /></a><a className={linkClass} href="https://github.com/diertapasific" {...out}>GitHub<ArrowUpRight /></a></div></div>
}

export default function Content({ destination, aboutSection, onAboutSection }: { destination: Destination; aboutSection: AboutSection; onAboutSection: (section: AboutSection) => void }) {
  switch (destination) {
    case 'projects': return <Projects />
    case 'about': return <><AboutContent section={aboutSection} /><div className="mt-8"><AboutPager section={aboutSection} onSection={onAboutSection} /></div></>
    case 'reading': return <Reading />
    case 'music': return <Music />
    case 'writing': return <Writing />
    case 'contact': return <Contact />
  }
}
