'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BackSide, BufferAttribute, BufferGeometry, Float32BufferAttribute, FrontSide, PlaneGeometry } from 'three'
import type { Group, LineBasicMaterial, Texture } from 'three'
import { bookSpineX, createPaperSurface, paperElevation, paperSize, updatePaperSurface } from './paperMotion'

// Arc-length-preserving cross sections keep the paper's width constant as it
// curls. A small phase offset across its depth makes one corner lead the turn.
export function CurlingPage({ forward, front, back, onStart, onComplete }: { forward: boolean; front: Texture; back: Texture; onStart: () => void; onComplete: () => void }) {
  const hinge = useRef<Group>(null)
  const edgeInk = useRef<LineBasicMaterial>(null)
  const paper = useMemo(() => {
    const surface = createPaperSurface(forward), { columns, rows } = surface, { width, height } = paperSize
    const geometry = new PlaneGeometry(width, height, columns, rows)
    geometry.setAttribute('position', new BufferAttribute(surface.positions, 3))
    geometry.setAttribute('color', new BufferAttribute(surface.colors, 3))
    geometry.computeVertexNormals(); geometry.computeBoundingSphere()
    const edgeIndices = [
      ...Array.from({ length: columns + 1 }, (_, i) => i),
      ...Array.from({ length: rows }, (_, i) => (i + 1) * (columns + 1) + columns),
      ...Array.from({ length: columns }, (_, i) => rows * (columns + 1) + columns - 1 - i),
      ...Array.from({ length: rows }, (_, i) => (rows - 1 - i) * (columns + 1)), 0,
    ]
    const outline = new BufferGeometry()
    outline.setAttribute('position', new Float32BufferAttribute(new Float32Array(edgeIndices.length * 3), 3))
    const edge = outline.attributes.position, positions = geometry.attributes.position
    edgeIndices.forEach((index, i) => edge.setXYZ(i, positions.getX(index), positions.getY(index), positions.getZ(index)))
    outline.computeBoundingSphere()
    return { geometry, outline, edgeIndices, surface, elapsed: 0, started: false, done: false }
  }, [forward])
  useEffect(() => () => { paper.geometry.dispose(); paper.outline.dispose() }, [paper])
  useFrame((_, delta) => {
    if (paper.done) return
    if (!paper.started) { paper.started = true; onStart() }
    else paper.elapsed = Math.min(1, paper.elapsed + Math.min(delta, .05) / 1.15)
    const t = paper.elapsed, eased = t * t * t * (t * (t * 6 - 15) + 10), progress = forward ? eased : 1 - eased
    if (hinge.current) hinge.current.position.y = paperElevation(progress)
    // The resting page already supplies its border. Reveal the curl's edge
    // only as it lifts, so a new rectangle cannot flash over the flat spread.
    if (edgeInk.current) edgeInk.current.opacity = Math.min(1, Math.sin(Math.PI * progress) * 4)
    const positions = paper.geometry.attributes.position, colors = paper.geometry.attributes.color
    updatePaperSurface(paper.surface, progress)
    positions.needsUpdate = true; colors.needsUpdate = true
    paper.geometry.computeVertexNormals(); paper.geometry.computeBoundingSphere()
    const edge = paper.outline.attributes.position
    paper.edgeIndices.forEach((index, i) => edge.setXYZ(i, positions.getX(index), positions.getY(index), positions.getZ(index)))
    edge.needsUpdate = true; paper.outline.computeBoundingSphere()
    if (t === 1) { paper.done = true; onComplete() }
  })
  return <group ref={hinge} position={[bookSpineX, paperElevation(forward ? 0 : 1), 0]}>
    <mesh geometry={paper.geometry}><meshBasicMaterial map={front} side={FrontSide} vertexColors /></mesh>
    <mesh geometry={paper.geometry}><meshBasicMaterial map={back} side={BackSide} vertexColors /></mesh>
    <lineLoop geometry={paper.outline}><lineBasicMaterial ref={edgeInk} color="#a5a5a5" transparent opacity={0} /></lineLoop>
  </group>
}
