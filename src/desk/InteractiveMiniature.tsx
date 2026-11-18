'use client'

import { useEffect, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import { ArrowBendUpLeft } from '@phosphor-icons/react'
import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { FormulaCar } from './FormulaCar'
import { miniatureHome, miniatureRoll, miniatureRollDuration } from './objectMotion'

export function InteractiveMiniature({ enabled, suppressClickUntil }: { enabled: boolean; suppressClickUntil: MutableRefObject<number> }) {
  const rig = useRef<THREE.Group>(null), distance = useRef(0), elapsed = useRef(miniatureRollDuration)
  const [running, setRunning] = useState(false), [hovered, setHovered] = useState(false), [discovered, setDiscovered] = useState(false)
  const mobile = useThree(state => state.size.width < 768)
  useEffect(() => { if (!enabled) { elapsed.current = miniatureRollDuration; setRunning(false); setHovered(false) } }, [enabled])
  const roll = () => {
    if (!enabled || running || performance.now() < suppressClickUntil.current) return
    elapsed.current = 0; setRunning(true); setDiscovered(true)
  }
  useFrame((_, delta) => {
    if (!rig.current) return
    if (enabled && elapsed.current < miniatureRollDuration) {
      elapsed.current = Math.min(miniatureRollDuration, elapsed.current + Math.min(delta, .05))
      distance.current = miniatureRoll(elapsed.current)
      if (elapsed.current === miniatureRollDuration && running) setRunning(false)
    } else {
      distance.current = THREE.MathUtils.damp(distance.current, 0, 12, Math.min(delta, .05))
      if (Math.abs(distance.current) < .0001) distance.current = 0
    }
    rig.current.position.x = distance.current
  })
  return <group ref={rig} onPointerOver={event => { event.stopPropagation(); if (enabled && !mobile && event.pointerType === 'mouse') setHovered(true) }} onPointerOut={() => setHovered(false)} onClick={event => { event.stopPropagation(); if (event.delta < 6) roll() }}>
    <FormulaCar wheelTravel={distance} />
    {enabled && <Html position={[miniatureHome[0], miniatureHome[1] + .12, miniatureHome[2]]} center zIndexRange={[4, 3]}>
      <button data-desk-control="miniature" aria-label="Roll the F1 miniature" disabled={running} className={`miniature-trigger relative block h-11 ${mobile ? 'is-mobile w-14' : 'w-[88px]'} bg-transparent ${hovered ? 'is-hovered' : ''}`}
        onPointerEnter={event => setHovered(!mobile && event.pointerType === 'mouse')} onPointerLeave={() => setHovered(false)} onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); roll() }}>
        <span className="sr-only">Roll the F1 miniature</span><span aria-hidden="true" className={`miniature-cue pointer-events-none absolute left-1/2 top-1/2 mt-2 flex items-center gap-1 whitespace-nowrap font-mono text-[8px] sm:mt-4 text-zinc-500 ${!discovered || running ? 'is-visible' : ''}`}><ArrowBendUpLeft size={12} weight="light" />{running ? 'a quick lap.' : 'tap to roll'}</span>
      </button><span className="sr-only" role="status">{running ? 'The F1 miniature is rolling and will park itself.' : ''}</span>
    </Html>}
  </group>
}
