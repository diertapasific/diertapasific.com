'use client'

import { useEffect, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { FormulaCar } from './FormulaCar'
import { miniatureHome, miniatureRoll, miniatureRollDuration } from './objectMotion'

export function InteractiveMiniature({ enabled, suppressClickUntil }: { enabled: boolean; suppressClickUntil: MutableRefObject<number> }) {
  const rig = useRef<THREE.Group>(null), distance = useRef(0), elapsed = useRef(miniatureRollDuration)
  const [running, setRunning] = useState(false)
  const introduced = useRef(false), automatic = useRef(false), arrivalDelay = useRef(0)
  const mobile = useThree(state => state.size.width < 768)
  useEffect(() => {
    if (!enabled) { arrivalDelay.current = 0; elapsed.current = miniatureRollDuration; setRunning(false) }
    else if (!introduced.current) { introduced.current = true; arrivalDelay.current = .45 }
  }, [enabled])
  const roll = () => {
    if (!enabled || running || performance.now() < suppressClickUntil.current) return
    arrivalDelay.current = 0; automatic.current = false; elapsed.current = 0; setRunning(true)
  }
  useFrame((_, delta) => {
    if (!rig.current) return
    if (enabled && arrivalDelay.current > 0) {
      arrivalDelay.current = Math.max(0, arrivalDelay.current - Math.min(delta, .05))
      if (arrivalDelay.current === 0) { automatic.current = true; elapsed.current = 0; setRunning(true) }
    }
    if (enabled && elapsed.current < miniatureRollDuration) {
      elapsed.current = Math.min(miniatureRollDuration, elapsed.current + Math.min(delta, .05))
      distance.current = miniatureRoll(elapsed.current) * (automatic.current ? .6 : 1)
      if (elapsed.current === miniatureRollDuration && running) setRunning(false)
    } else {
      distance.current = THREE.MathUtils.damp(distance.current, 0, 12, Math.min(delta, .05))
      if (Math.abs(distance.current) < .0001) distance.current = 0
    }
    rig.current.position.x = distance.current
  })
  return <group ref={rig} onPointerOver={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); if (event.delta < 6) roll() }}>
    <FormulaCar wheelTravel={distance} />
    {enabled && <Html position={[miniatureHome[0], miniatureHome[1] + .12, miniatureHome[2]]} center zIndexRange={[4, 3]}>
      <button data-desk-control="miniature" aria-label="Roll the F1 miniature" disabled={running} className={`miniature-trigger relative block h-11 ${mobile ? 'is-mobile w-14' : 'w-[88px]'} bg-transparent`}
        onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); roll() }}>
        <span className="sr-only">Roll the F1 miniature</span>
      </button><span className="sr-only" role="status">{running && !automatic.current ? 'The F1 miniature is rolling and will park itself.' : ''}</span>
    </Html>}
  </group>
}
