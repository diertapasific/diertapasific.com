'use client'

import { useEffect, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { IconContext } from '@phosphor-icons/react'
import { cardPose, cardPoses, deskSize, motionProgress } from './motion'
import type { DeskMotion } from './motion'
import { Plate, Stroke } from './geometry'
import { ProjectedSurface } from './ProjectedSurface'
import { ContactCard } from './ContactCard'
import { focusView } from './model'
import { advanceIdReveal, createIdReveal, idCardZ } from './objectMotion'

export function HangingCard({ dark, selected, active, motion, reducedMotion }: {
  dark: boolean; selected: boolean; active: boolean; motion: MutableRefObject<DeskMotion>; reducedMotion: boolean;
}) {
  const card = useRef<THREE.Group>(null), flip = useRef<THREE.Group>(null)
  const spring = useRef(createIdReveal())
  const [back, setBack] = useState(false), [turning, setTurning] = useState(false)
  const { size } = useThree(), { zoom } = focusView('contact', size.width, size.height)
  const width = Math.round(.54 * 1.8 * zoom), height = Math.round(.75 * 1.8 * zoom)
  useEffect(() => { if (!selected) { setBack(false); setTurning(false) } }, [selected])
  useFrame(({ clock }, dt) => {
    if (!card.current || !flip.current) return
    const progress = motionProgress(motion.current, 'contact'), pose = cardPose(progress)
    card.current.position.set(...pose.position); card.current.scale.setScalar(pose.scale)
    card.current.rotation.z = (.08 + (reducedMotion ? 0 : Math.sin(clock.elapsedTime * .8) * .018)) * (1 - progress)
    card.current.rotation.y = -.14 * (1 - progress)
    const settled = advanceIdReveal(spring.current, { selected, active, back, turning, reducedMotion }, dt)
    flip.current.rotation.y = spring.current.angle
    card.current.position.z = idCardZ(pose.position[2], pose.scale, progress, spring.current.angle, deskSize[2] / 2)
    if (settled && turning) setTurning(false)
  })
  const onFlip = () => { if (active && !turning) { setBack(v => !v); setTurning(true) } }
  const [x, , z] = cardPoses.rest
  return <>
    <group position={[x, 0, z]}>
      <Stroke points={[[-.08, .10, -.18], [-.08, .10, -.07], [-.08, -.04, -.07], [.08, -.04, -.07], [.08, .10, -.07], [.08, .10, -.18]]} color="#777777" />
      {!selected && <><Stroke points={[[-.05, -.04, -.06], [-.05, -.12, 0], [-.03, -.17, .02]]} color="#858585" width={2} /><Stroke points={[[.05, -.04, -.06], [.05, -.12, 0], [.03, -.17, .02]]} color="#858585" width={2} /></>}
    </group>
    <group ref={card} position={cardPoses.rest}>
      <group ref={flip}>
        <Plate size={[.60, .92, .035]} radius={.045} ink="#6d6d6d" />
        {[1, -1].map(side => <group key={side} rotation={[0, side === -1 ? Math.PI : 0, 0]}>
          <Plate size={[.15, .045, .006]} radius={.02} position={[0, .395, .022]} color="#d5d5d5" ink="#9c9c9c" />
          <ProjectedSurface nativeColors position={[0, -.04, .023]} rotation={[0, 0, 0]} worldSize={[.54, .75]} pixelWidth={width} pixelHeight={height} interactive={active && !turning && back === (side === -1)}>
            <IconContext.Provider value={{ weight: 'light', size: 18 }}><ContactCard dark={dark} back={side === -1} enabled={active && !turning && back === (side === -1)} turning={turning} onFlip={onFlip} width={width} height={height} /></IconContext.Provider>
          </ProjectedSurface>
        </group>)}
      </group>
    </group>
  </>
}
