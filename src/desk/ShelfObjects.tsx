'use client'

import { memo, useEffect, useMemo } from 'react'
import type { MutableRefObject } from 'react'
import * as THREE from 'three'
import { Plate, Stroke, roundedPath } from './geometry'
import { InteractiveMiniature } from './InteractiveMiniature'
import type { Point } from './model'

function MetalWire({ points, radius = .006, color = '#999999' }: { points: Point[]; radius?: number; color?: string }) {
  const geometry = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 40, radius, 6, false), [points, radius])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry}><meshBasicMaterial color={color} /></mesh>
}

const SilverGlasses = memo(function SilverGlasses() {
  const lens = useMemo(() => roundedPath(.30, .20, .055), [])
  const outline = useMemo(() => lens.getPoints(16).map(p => [p.x, p.y, .006] as Point), [lens])
  return <group position={[.98, .47, -.46]} rotation={[.12, .14, -.02]}>
    {[-.182, .182].map(x => <group key={x} position={[x, 0, 0]} rotation={[0, x > 0 ? .07 : -.07, 0]}>
      <mesh><shapeGeometry args={[lens]} /><meshBasicMaterial color="#a8a8a8" transparent opacity={.14} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      <MetalWire points={outline} radius={.0075} color="#777777" />
      <Stroke points={outline.map(([px, py, pz]) => [px, py + .002, pz + .005] as Point)} width={.7} color="#bcbcbc" />
      <Stroke points={[[-.11, .064, .008], [-.065, .082, .008]]} width={.65} color="#c2c2c2" />
    </group>)}
    <MetalWire points={[[-.032, .035, .008], [-.016, .052, .019], [.016, .052, .019], [.032, .035, .008]]} radius={.006} color="#7e7e7e" />
    {[-1, 1].map(side => <group key={side}>
      <Plate size={[.018, .025, .016]} radius={.004} position={[side * .333, .035, -.006]} color="#aaaaaa" ink="#777777" />
      <MetalWire points={[[side * .333, .035, -.008], [side * .35, .035, -.07], [side * .347, .015, -.44], [side * .326, -.05, -.56], [side * .30, -.187, -.62]]} radius={.007} color="#777777" />
      <MetalWire points={[[side * .326, -.05, -.56], [side * .315, -.13, -.605], [side * .30, -.187, -.62]]} radius={.009} color="#ababab" />
      <Plate size={[.014, .032, .006]} radius={.006} position={[side * .041, -.005, -.007]} color="#d6d6d6" ink="#b0b0b0" />
    </group>)}
  </group>
})

export const ShelfObjects = memo(function ShelfObjects({ interactive, suppressClickUntil }: { interactive: boolean; suppressClickUntil: MutableRefObject<number> }) {
  return <><InteractiveMiniature enabled={interactive} suppressClickUntil={suppressClickUntil} /><SilverGlasses /></>
})
