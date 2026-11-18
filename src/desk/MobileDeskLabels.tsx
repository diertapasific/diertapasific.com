'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { MutableRefObject } from 'react'
import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { destinations } from './model'
import type { Destination } from './model'
import { annotationObjects } from './annotationGeometry'
import { createAnnotationPlan } from './annotationPlan'
import type { AnnotationPlan } from './annotationPlan'

const origin = () => [0, 0]

export function MobileDeskLabels({ height, annotationPlan, onSelect, suppressClickUntil }: {
  height: number; annotationPlan: MutableRefObject<AnnotationPlan | null>; onSelect: (id: Destination) => void; suppressClickUntil: MutableRefObject<number>;
}) {
  const { camera, size } = useThree()
  const buttons = useRef<(HTMLButtonElement | null)[]>([]), paths = useRef<(SVGPathElement | null)[]>([])
  const dots = useRef<(SVGCircleElement | null)[]>([]), root = useRef<HTMLDivElement | null>(null)
  const observer = useRef<ResizeObserver | null>(null), measurement = useRef('')
  const drawnPlan = useRef<AnnotationPlan | null>(null)
  const lastMatrix = useRef(new Float64Array(32).fill(NaN))
  const project = useMemo(() => new Vector3(), [])
  const anchors = useMemo(() => annotationObjects.map(item => new Vector3(item.anchor[0], item.anchor[1] + height, item.anchor[2])), [height])
  const attach = useCallback((node: HTMLDivElement | null) => {
    observer.current?.disconnect(); root.current = node; measurement.current = ''
    if (!node) return
    const main = node.closest('main'), intro = main?.querySelector('.desk-intro'), footer = main?.querySelector('.desk-footer'), header = main?.querySelector('.desk-header')
    const measure = () => {
      const area = { left: 12, top: (header?.getBoundingClientRect().bottom ?? 84) + 8, right: size.width - 12, bottom: (footer?.getBoundingClientRect().top ?? size.height - 132) - 16 }
      const chrome = [...(main?.querySelectorAll('.desk-intro, .reset-view, .desk-instructions') ?? [])].map(element => { const rect = element.getBoundingClientRect(); if (element.matches('.desk-intro')) { const el = element as HTMLElement, parent = main!.getBoundingClientRect(); return { left: parent.left + el.offsetLeft, top: parent.top + el.offsetTop, right: parent.left + el.offsetLeft + el.offsetWidth, bottom: parent.top + el.offsetTop + el.offsetHeight } } return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom } })
      const signature = JSON.stringify({ area, chrome })
      if (signature === measurement.current) return
      measurement.current = signature
      const plan = createAnnotationPlan(size.width, size.height, area, chrome, height)
      if (plan) annotationPlan.current = plan
    }
    measure()
    observer.current = new ResizeObserver(measure)
    if (intro) observer.current.observe(intro)
    if (header) observer.current.observe(header)
    if (footer) observer.current.observe(footer)
  }, [size.width, size.height, height, annotationPlan])
  useEffect(() => () => observer.current?.disconnect(), [])
  useFrame(() => {
    const plan = annotationPlan.current
    if (!root.current || !plan || plan.width !== size.width || plan.height !== size.height) return
    camera.updateMatrixWorld()
    const matrix = [...camera.matrixWorldInverse.elements, ...camera.projectionMatrix.elements]
    if (drawnPlan.current === plan && matrix.every((value, i) => Math.abs(value - lastMatrix.current[i]) < .000001)) return
    lastMatrix.current.set(matrix); drawnPlan.current = plan
    anchors.forEach((anchor, i) => {
      project.copy(anchor).project(camera)
      const x = (project.x + 1) * size.width / 2, y = (1 - project.y) * size.height / 2
      const offset = plan.offsets[i], point = { x: x + offset.x, y: y + offset.y }
      if (buttons.current[i]) buttons.current[i]!.style.transform = `translate3d(${point.x - 22}px,${point.y - 22}px,0)`
      paths.current[i]?.setAttribute('d', `M${point.x},${point.y} L${x},${y}`)
      dots.current[i]?.setAttribute('cx', String(x)); dots.current[i]?.setAttribute('cy', String(y))
    })
    // Wait for the initial pull-back from a focused object. During an overview
    // drag the zoom is constant, so all six cards remain visible.
    root.current.style.visibility = camera.zoom <= plan.zoom + .03 ? 'visible' : 'hidden'
  })
  return <Html calculatePosition={origin} zIndexRange={[3, 3]} style={{ pointerEvents: 'none' }}>
    <div ref={attach} data-mobile-annotations className="pointer-events-none absolute left-0 top-0" style={{ width: size.width, height: size.height, visibility: 'hidden' }}>
      <svg aria-hidden="true" width={size.width} height={size.height} className="absolute inset-0 overflow-visible" fill="none" stroke="#999999" strokeWidth=".8">
        {annotationObjects.map((item, i) => <g key={item.id}><path ref={node => { paths.current[i] = node }} /><circle ref={node => { dots.current[i] = node }} r="1.6" fill="#f6f6f6" /></g>)}
      </svg>
      {annotationObjects.map((item, i) => <button key={item.id} ref={node => { buttons.current[i] = node }} data-label-for={item.id} aria-label={`Explore ${destinations.find(d => d.id === item.id)!.label}`} className="mobile-object-label pointer-events-auto absolute left-0 top-0 grid size-11 place-items-center font-mono text-[10px]" onClick={() => { if (performance.now() > suppressClickUntil.current) onSelect(item.id) }}>
        <span className="grid size-8 place-items-center border border-[#a8a8a8] bg-[#f6f6f6] text-[#454545]">{destinations.find(d => d.id === item.id)!.number}</span>
      </button>)}
    </div>
  </Html>
}
