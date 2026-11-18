'use client'

import { useCallback, useLayoutEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Material, MathUtils } from 'three'
import type { OpeningMode } from './opening'

type SavedMaterial = { material: Material; opacity: number; transparent: boolean; depthWrite: boolean }

// Let the desk recede while chatting, but reveal it before the return camera
// moves. A second fade-in made its objects look as though they were loading.
export function DeskBackdrop({ children, chatting, openingMode }: { children: ReactNode; chatting: boolean; openingMode: OpeningMode }) {
  const root = useRef<Group>(null), fade = useRef(chatting ? .06 : 1), last = useRef(-1)
  const saved = useRef<SavedMaterial[]>([])
  const apply = useCallback((opacity: number) => {
    if (last.current === opacity) return
    last.current = opacity
    for (const entry of saved.current) {
      const transparent = entry.transparent || opacity < 1
      if (entry.material.transparent !== transparent) {
        entry.material.transparent = transparent
        entry.material.needsUpdate = true
      }
      entry.material.opacity = entry.opacity * opacity
      // Keep hidden surfaces occluded even when the blueprint is faint.
      entry.material.depthWrite = entry.depthWrite
    }
    document.body.style.setProperty('--desk-backdrop-opacity', opacity.toFixed(3))
  }, [])

  useLayoutEffect(() => {
    const seen = new Set<Material>()
    root.current?.traverse(object => {
      const materials = (object as typeof object & { material?: Material | Material[] }).material
      for (const material of materials ? (Array.isArray(materials) ? materials : [materials]) : []) if (!seen.has(material)) {
        seen.add(material)
        saved.current.push({ material, opacity: material.opacity, transparent: material.transparent, depthWrite: material.depthWrite })
      }
    })
    const previous = document.body.style.getPropertyValue('--desk-backdrop-opacity')
    return () => {
      for (const entry of saved.current) {
        Object.assign(entry.material, { opacity: entry.opacity, transparent: entry.transparent, depthWrite: entry.depthWrite })
        entry.material.needsUpdate = true
      }
      if (previous) document.body.style.setProperty('--desk-backdrop-opacity', previous)
      else document.body.style.removeProperty('--desk-backdrop-opacity')
      saved.current = []
      last.current = -1
    }
  }, [])

  useLayoutEffect(() => {
    // Restore the meshes and native screen portals in the same pre-paint commit,
    // including direct navigation from Tifa to another desk object.
    if (openingMode === 'none' && !chatting) {
      fade.current = 1
      apply(1)
    }
  }, [chatting, openingMode, apply])

  useFrame((_, delta) => {
    if (openingMode !== 'none') return
    if (!chatting) { fade.current = 1; apply(1); return }
    fade.current = MathUtils.damp(fade.current, .06, 10, Math.min(delta, .05))
    if (Math.abs(fade.current - .06) < .001) fade.current = .06
    apply(fade.current)
  }, -2.5)
  return <group ref={root}>{children}</group>
}
