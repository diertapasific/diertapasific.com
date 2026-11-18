'use client'

import type { CSSProperties } from 'react'
import { memo, useEffect, useRef, useState } from 'react'
import { ArrowUpRight, MusicNotes, SpotifyLogo } from '@phosphor-icons/react'
import { useSpotifyNowPlaying } from './useSpotifyNowPlaying'
import type { SpotifySnapshot } from './useSpotifyNowPlaying'

const clock = (milliseconds: number) => `${Math.floor(milliseconds / 60000)}:${String(Math.floor(milliseconds / 1000) % 60).padStart(2, '0')}`

const TrackProgress = memo(function TrackProgress({ snapshot, compact }: { snapshot: SpotifySnapshot; compact: boolean }) {
  const bar = useRef<HTMLDivElement>(null), elapsed = useRef<HTMLSpanElement>(null)
  const track = snapshot.track!
  useEffect(() => {
    let frame = 0, previousSecond = -1
    const draw = () => {
      const advancing = snapshot.status === 'playing' && !snapshot.stale
      const value = Math.min(track.durationMs, track.progressMs + (advancing ? Math.max(0, Date.now() - snapshot.updatedAt) : 0))
      if (bar.current) bar.current.style.transform = `scaleX(${track.durationMs ? value / track.durationMs : 0})`
      if (elapsed.current && Math.floor(value / 1000) !== previousSecond) { elapsed.current.textContent = clock(value); previousSecond = Math.floor(value / 1000) }
      if (advancing && !document.hidden) frame = requestAnimationFrame(draw)
    }
    const resume = () => { cancelAnimationFrame(frame); draw() }
    draw(); document.addEventListener('visibilitychange', resume)
    return () => { cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', resume) }
  }, [snapshot, track])
  return <div className="flex items-center gap-2 font-mono text-[8px] text-[var(--music-muted)]" aria-label="Track progress">
    <span ref={elapsed} className={compact ? 'sr-only' : 'w-7 tabular-nums'}>{clock(track.progressMs)}</span>
    <div className="h-px min-w-0 flex-1 bg-[var(--music-track)]"><div ref={bar} className="h-px w-full origin-left bg-[var(--music-ink)]" style={{ transform: 'scaleX(0)' }} /></div>
    <span className={compact ? 'sr-only' : 'w-7 text-right tabular-nums'}>{clock(track.durationMs)}</span>
  </div>
})

function Cover({ src, album, compact, dense }: { src: string | null; album: string; compact: boolean; dense: boolean }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])
  return <span className={`grid shrink-0 place-items-center ${dense ? 'size-7' : compact ? 'size-10' : 'size-16'}`}>
    {src && !failed ? <img src={src} alt={album ? `Cover of ${album}` : 'Album artwork'} className="size-full object-contain" referrerPolicy="no-referrer" decoding="async" onError={() => setFailed(true)} /> : <MusicNotes size={compact ? 23 : 38} weight="thin" className="text-[var(--music-muted)]" />}
  </span>
}

export function MusicScreen({ compact, dense = false, dark = false, artwork = true, active = false }: { compact: boolean; dense?: boolean; dark?: boolean; artwork?: boolean; active?: boolean }) {
  const snapshot = useSpotifyNowPlaying(active), track = snapshot.track
  const playing = snapshot.status === 'playing' && !snapshot.stale
  const status = snapshot.stale && track ? 'LAST SEEN' : ({ loading: 'CONNECTING', playing: 'NOW PLAYING', paused: 'PAUSED', recent: snapshot.source === 'observed' ? 'LAST SEEN' : 'RECENT HISTORY', idle: 'OFF AIR', disconnected: 'OFF AIR', reconnect: 'OFF AIR', access_denied: 'OFF AIR', unavailable: 'UNAVAILABLE' })[snapshot.status]
  const minutesAgo = snapshot.playedAt ? Math.max(0, Math.floor((Date.now() - snapshot.playedAt) / 60000)) : null
  const age = minutesAgo === null ? '' : minutesAgo < 1 ? 'just now' : minutesAgo < 60 ? `${minutesAgo}m ago` : minutesAgo < 1440 ? `${Math.floor(minutesAgo / 60)}h ago` : `${Math.floor(minutesAgo / 1440)}d ago`
  const canConnect = import.meta.env.DEV && ['disconnected', 'reconnect', 'access_denied'].includes(snapshot.status)
  const hasProgress = track && !snapshot.stale && (snapshot.status === 'playing' || snapshot.status === 'paused')
  const body = <>
    <header className={`flex shrink-0 items-center justify-between gap-2 border-b border-[var(--music-border)] px-3 font-mono ${dense ? 'h-4 text-[7px]' : compact ? 'h-5 text-[7px]' : 'h-6 text-[8px]'}`}><span>LISTENING</span><span className="flex items-center gap-1.5 text-[var(--music-secondary)]">{playing && <i aria-hidden="true" className="size-1 shrink-0 animate-pulse rounded-full bg-[var(--music-ink)]" />}{status}</span></header>
    <div className={`flex min-h-0 flex-1 items-center gap-3 ${compact ? 'px-3 py-1' : 'px-4 py-3'}`}>
      {snapshot.status === 'loading' ? <div role="status" aria-label="Loading Spotify listening status" className="flex w-full items-center gap-3"><div className={`${dense ? 'size-7' : compact ? 'size-10' : 'size-16'} shrink-0 animate-pulse bg-[var(--music-skeleton)]`} /><div className="min-w-0 flex-1 space-y-2"><div className="h-3 w-4/5 animate-pulse bg-[var(--music-skeleton)]" /><div className="h-2 w-1/2 animate-pulse bg-[var(--music-skeleton)]" /></div></div> : <>
        <Cover src={artwork ? track?.artwork || null : null} album={track?.album || ''} compact={compact} dense={dense} />
        <div className="min-w-0 flex-1">
          <h2 data-surface-heading tabIndex={-1} className={`${dense ? 'truncate text-[13px] leading-tight' : compact ? 'line-clamp-2 text-[16px] leading-[1.15]' : 'line-clamp-2 text-[20px] leading-[1.15]'} tracking-tight outline-none`}>{track?.title || 'Off air.'}</h2>
          <p className={`${dense ? 'mt-0.5 truncate text-[9px]' : compact ? 'mt-0.5 truncate text-[10px]' : 'mt-2 truncate text-[12px]'} leading-snug text-[var(--music-secondary)]`}>{track?.artist || (canConnect ? 'Connect Spotify to show what Dipa is listening to.' : snapshot.status === 'idle' ? 'Dipa isn’t listening right now.' : 'Listening status is unavailable right now.')}</p>
        </div>
      </>}
    </div>
    <footer className={`shrink-0 border-t border-[var(--music-border)] px-3 ${compact ? 'pb-0.5 pt-1' : 'pb-2 pt-2'}`}>
      {hasProgress && <TrackProgress snapshot={snapshot} compact={dense} />}
      <div className={`flex items-center justify-between gap-2 font-mono ${dense ? 'mt-0.5 text-[7px]' : compact ? 'mt-0.5 text-[8px]' : 'mt-2 text-[9px]'}`}>
        <span className="flex items-center gap-1"><SpotifyLogo size={compact ? 10 : 13} weight="fill" />Spotify{!dense && snapshot.status === 'recent' && age && <span className="whitespace-nowrap text-[var(--music-muted)]"> · {age}</span>}</span>
        <span className="flex items-center gap-1">{track ? 'open in Spotify' : canConnect ? 'connect Spotify' : 'DIPA / MUSIC'}{(track || canConnect) && <ArrowUpRight size={compact ? 9 : 12} />}</span>
      </div>
    </footer>
  </>
  const classes = 'flex h-full min-h-0 flex-col overflow-hidden text-[var(--music-ink)] no-underline outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--music-ink)]'
  const style = {
    background: dark ? '#202225' : '#f8f8f8',
    '--music-ink': dark ? '#eef0f2' : '#2a2a2a',
    '--music-secondary': dark ? '#bfc2c6' : '#525252',
    '--music-muted': dark ? '#a6abb1' : '#707070',
    '--music-border': dark ? '#50545a' : '#d4d4d4',
    '--music-track': dark ? '#62666b' : '#d0d0d0',
    '--music-skeleton': dark ? '#5d6166' : '#dedede',
  } as CSSProperties
  return track ? <a data-spotify-status={snapshot.status} href={track.href} target="_blank" rel="noopener noreferrer" aria-label={`Open ${track.title} by ${track.artist} on Spotify`} className={classes} style={style}>{body}</a>
    : canConnect ? <a data-spotify-status={snapshot.status} href="/api/spotify/connect" target="_blank" rel="noopener noreferrer" aria-label="Connect Spotify for Dipa’s desk" className={classes} style={style}>{body}</a>
      : <div data-spotify-status={snapshot.status} className={classes} style={style}>{body}</div>
}
