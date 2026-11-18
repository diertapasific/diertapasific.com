'use client'

import { Html } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { HandHeart } from '@phosphor-icons/react'

// This sits inside the animated head group: the leader starts on her temple,
// and the label keeps a small screen-space gap, like the desk annotations.
export function TifaPetLabel({ enabled, happy, onPet }: { enabled: boolean; happy: boolean; onPet: () => void }) {
  const { width, height } = useThree(state => state.size)
  const mobile = width < 768, compact = mobile && height < 620
  if (!enabled || (mobile && height < 480)) return null
  const x = mobile ? 28 : 54, y = compact ? 12 : -18
  return <Html position={[.20, .33, .06]} center zIndexRange={[4, 4]} style={{ pointerEvents: 'none' }}>
    <div className="pointer-events-none relative size-0">
      <svg aria-hidden="true" width="1" height="1" className="absolute left-0 top-0 overflow-visible" fill="none" stroke="#a8a8a8" strokeWidth=".7"><path d={`M0,0 L${x},${y}`} /><circle r="1.5" fill="#f6f6f6" /></svg>
      <div className="absolute left-0 top-0" style={{ transform: `translate3d(${x}px,${y-22}px,0)` }}>
        <button type="button" data-desk-control="tifa" aria-label="Pet Tifa" title="Pet Tifa" onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); onPet() }} className={`object-label pointer-events-auto !min-h-11 after:hidden ${compact ? '!min-w-11 justify-center' : '!min-w-[114px] justify-center'}`}>
          <HandHeart size={15} aria-hidden="true" />
          {!compact && <><span>{happy ? 'happy Tifa' : 'pet Tifa'}</span><span className="label-plus" aria-hidden="true">+</span></>}
        </button>
      </div>
      <span className="sr-only" role="status">{happy ? 'Tifa enjoys the head scratch.' : ''}</span>
    </div>
  </Html>
}
