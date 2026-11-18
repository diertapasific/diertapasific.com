'use client'

import { useLayoutEffect, useMemo, useRef } from 'react'
import type { MutableRefObject, ReactNode, RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Material, Plane, Vector3 } from 'three'
import { advanceOpening, openingFrame } from './opening'
import type { OpeningMode, OpeningTimeline } from './opening'

type SavedMaterial = { material: Material; opacity: number; transparent: boolean; depthWrite: boolean; clippingPlanes: Plane[] | null; stroke: boolean }

// The opening operates on the existing desk. Its physical object animations and
// projected HTML remain attached to the same world transforms throughout.
export function DeskOpening({ children, mode, timeline, height, surface, onComplete }: {
  children: ReactNode; mode: OpeningMode; timeline: MutableRefObject<OpeningTimeline>; height: number;
  surface: RefObject<HTMLDivElement>; onComplete: () => void;
}) {
  const root = useRef<Group>(null), saved = useRef<SavedMaterial[]>([])
  const frames = useRef(0), finished = useRef(false)
  const clip = useMemo(() => new Plane(new Vector3(-1, 0, 0), -6), [])

  useLayoutEffect(() => {
    if (mode !== 'full' || !root.current) return
    const seen = new Set<Material>()
    root.current.traverse(object => {
      const materials = (object as typeof object & { material?: Material | Material[] }).material
      if (!materials) return
      for (const material of Array.isArray(materials) ? materials : [materials]) {
        if (seen.has(material)) continue
        seen.add(material)
        const stroke = Boolean((material as Material & { isLineMaterial?: boolean; isLineBasicMaterial?: boolean }).isLineMaterial || (material as Material & { isLineBasicMaterial?: boolean }).isLineBasicMaterial)
        saved.current.push({ material, opacity: material.opacity, transparent: material.transparent, depthWrite: material.depthWrite, clippingPlanes: material.clippingPlanes, stroke })
        material.transparent = true; material.opacity = 0; material.depthWrite = false
        material.clippingPlanes = [clip]; material.needsUpdate = true
      }
    })
    return () => {
      for (const { material, opacity, transparent, depthWrite, clippingPlanes } of saved.current) {
        Object.assign(material, { opacity, transparent, depthWrite, clippingPlanes }); material.needsUpdate = true
      }
      saved.current = []
      if (root.current) { root.current.scale.y = 1; root.current.position.y = 0 }
    }
  }, [mode, clip])

  useFrame((_, delta) => {
    if (mode === 'none') return
    // Give Html portals and the mobile layout two frames to attach and measure.
    if (frames.current++ < 2) return
    advanceOpening(timeline.current, delta, document.visibilityState !== 'hidden')
    const progress = timeline.current.progress, frame = openingFrame(progress, mode)
    if (root.current) { root.current.scale.y = frame.depth; root.current.position.y = height * (1 - frame.depth) }
    clip.constant = -6 + frame.trace * 12
    for (const item of saved.current) {
      item.material.opacity = item.opacity * (item.stroke ? frame.ink : frame.paper)
      item.material.depthWrite = item.depthWrite && (item.stroke || frame.paper === 1)
    }
    const scene = surface.current, main = scene?.closest<HTMLElement>('.desk-app')
    if (scene) scene.dataset.openingProgress = progress.toFixed(3)
    const set = (node: HTMLElement | null | undefined, name: string, value: number) => {
      const next = value.toFixed(3)
      if (node && node.style.getPropertyValue(name) !== next) node.style.setProperty(name, next)
    }
    set(main, '--desk-opening-scene', frame.scene)
    set(main, '--desk-opening-copy', frame.copy)
    set(main, '--desk-opening-chrome', frame.chrome)
    set(main, '--desk-opening-labels', frame.labels)
    set(document.body, '--desk-opening-screen', frame.screen)
    if (progress === 1 && !finished.current) { finished.current = true; onComplete() }
  }, -3)

  return <group ref={root} scale={[1, mode === 'full' ? .025 : 1, 1]} position={[0, mode === 'full' ? height * .975 : 0, 0]}>{children}</group>
}
