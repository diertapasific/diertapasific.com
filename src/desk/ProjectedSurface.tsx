'use client'

import { useCallback, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { Group, Vector3 } from 'three'
import type { Point } from './model'
import { surfacePresentation } from './surfaceProjection'

const origin = () => [0, 0]
const surfaceStyle = { transformOrigin: '0 0', visibility: 'hidden' as const }

// An orthographic camera maps a flat page to an exact 2D affine transform.
// Project its corners directly instead of shrinking HTML into world units and
// enlarging it again with nested CSS 3D transforms (which rasterize soft text).
export function ProjectedSurface({ children, position, rotation, worldSize, pixelWidth, pixelHeight, layer = 8, interactive = true, nativeColors = false, nativeLayout = false }: {
  children: ReactNode; position: Point; rotation: Point; worldSize: [number, number]; pixelWidth: number; pixelHeight: number; layer?: number; interactive?: boolean; nativeColors?: boolean; nativeLayout?: boolean;
}) {
  const portal = useMemo(() => nativeColors ? { current: document.body } : undefined, [nativeColors])
  const anchor = useRef<Group>(null)
  const element = useRef<HTMLDivElement | null>(null)
  const { camera, size } = useThree()
  const points = useMemo(() => [new Vector3(), new Vector3(), new Vector3()], [])
  const project = useCallback(() => {
    if (!anchor.current || !element.current) return
    anchor.current.updateWorldMatrix(true, false)
    camera.updateMatrixWorld()
    const [topLeft, topRight, bottomLeft] = points
    topLeft.set(-worldSize[0] / 2, worldSize[1] / 2, 0)
    topRight.set(worldSize[0] / 2, worldSize[1] / 2, 0)
    bottomLeft.set(-worldSize[0] / 2, -worldSize[1] / 2, 0)
    for (const point of points) {
      point.applyMatrix4(anchor.current.matrixWorld).project(camera)
      point.x = (point.x + 1) * size.width / 2
      point.y = (1 - point.y) * size.height / 2
    }
    const a = (topRight.x - topLeft.x) / pixelWidth, b = (topRight.y - topLeft.y) / pixelWidth
    const c = (bottomLeft.x - topLeft.x) / pixelHeight, d = (bottomLeft.y - topLeft.y) / pixelHeight
    const presentation = surfacePresentation({ a, b, c, d, x: topLeft.x, y: topLeft.y, width: pixelWidth, height: pixelHeight }, nativeLayout)
    const node = element.current
    for (const property of ['transform', 'left', 'top'] as const) if (node.style[property] !== presentation[property]) node.style[property] = presentation[property]
    node.style.visibility = a * d - b * c > 0 && Math.abs(topLeft.z) <= 1 ? 'visible' : 'hidden'
    node.dataset.renderMode = presentation.mode
  }, [camera, size.width, size.height, pixelWidth, pixelHeight, worldSize[0], worldSize[1], points, nativeLayout])
  const attach = useCallback((node: HTMLDivElement | null) => {
    element.current = node
    // Html mounts into a separate React root. Position it synchronously on
    // attachment so a newly mounted page never paints at the viewport origin.
    if (node) project()
  }, [project])
  useFrame(project)
  return <group ref={anchor} position={position} rotation={rotation}>
    <Html wrapperClass={nativeLayout ? 'paper-surface-portal' : undefined} portal={portal} ref={attach} calculatePosition={origin} style={{ ...surfaceStyle, pointerEvents: interactive ? 'auto' : 'none' }} zIndexRange={[layer, layer]}>
      {children}
    </Html>
  </group>
}
