'use client'

import { memo, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { Plate, Ring, Stroke } from './geometry'
import type { Point } from './model'
import { mousePosition, mouseScale } from './motion'

function curve(points: Point[]) {
  return new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)))
}

function surface(sample: (u: number, v: number) => THREE.Vector3, columns = 32, rows = 48) {
  const positions: number[] = [], indices: number[] = []
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= columns; i++) positions.push(...sample(i / columns, j / rows).toArray())
  for (let j = 0; j < rows; j++) for (let i = 0; i < columns; i++) {
    const a = j * (columns + 1) + i, b = a + columns + 1
    indices.push(a, b, a + 1, b, b + 1, a + 1)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices); geometry.computeVertexNormals()
  return geometry
}

const trace = (sample: (t: number) => THREE.Vector3, steps = 48): Point[] => Array.from({ length: steps + 1 }, (_, i) => sample(i / steps).toArray() as Point)

export const Mouse = memo(function Mouse() {
  const model = useMemo(() => {
    // Longitudinal sections: Z, half-width, crown height. The high rear palm
    // slopes down into broad, separate front buttons instead of a hemisphere.
    const profile = curve([[-.48, 0, .08], [-.455, .20, .18], [-.32, .245, .23], [-.05, .27, .35], [.16, .26, .39], [.34, .21, .30], [.46, .10, .13], [.48, 0, .045]])
    const shellPoint = (u: number, v: number) => {
      const p = profile.getPoint(v), angle = u * Math.PI * 2, up = Math.max(0, Math.sin(angle))
      return new THREE.Vector3(Math.cos(angle) * p.y - .045 * up, .035 + (p.z - .035) * Math.pow(up, .7) + Math.min(0, Math.sin(angle)) * .02, p.x)
    }
    const shell = surface(shellPoint, 48, 64)
    const wingInner = curve([[-.20, .055, -.31], [-.255, .15, -.17], [-.30, .19, .03], [-.26, .18, .27], [-.14, .08, .43]])
    const wingOuter = curve([[-.22, .035, -.31], [-.38, .035, -.17], [-.43, .035, .05], [-.36, .035, .30], [-.14, .04, .43]])
    const wingPoint = (u: number, v: number) => {
      const inner = wingInner.getPoint(v), outer = wingOuter.getPoint(v)
      const point = outer.lerp(inner, u)
      point.y = .035 + (inner.y - .035) * u * u
      return point
    }
    const wing = surface(wingPoint, 20, 40)
    const buttons = [[.08, .235], [.265, .42]].map(([start, end]) => {
      const point = (u: number, v: number) => shellPoint(start + (end - start) * u, .105 + .29 * v).add(new THREE.Vector3(0, .003, 0))
      return {
        geometry: surface(point, 14, 24),
        outline: [...trace(t => point(t, 0), 12), ...trace(t => point(1, t), 24), ...trace(t => point(1 - t, 1), 12), ...trace(t => point(0, 1 - t), 24)],
      }
    })
    return {
      shell, wing, buttons,
      base: [...trace(t => shellPoint(0, t)), ...trace(t => shellPoint(.5, 1 - t))],
      wingEdge: trace(t => wingOuter.getPoint(t)),
      shoulder: trace(t => shellPoint(.39, .12 + .78 * t)),
      grips: [.36, .46, .56, .66, .76].map(v => trace(u => wingPoint(.12 + u * .68, v).add(new THREE.Vector3(0, .002, 0)), 12)),
    }
  }, [])
  useEffect(() => () => { model.shell.dispose(); model.wing.dispose(); model.buttons.forEach(b => b.geometry.dispose()) }, [model])
  return <group position={mousePosition} rotation={[0, -.1, 0]} scale={mouseScale}>
    <mesh geometry={model.wing}><meshBasicMaterial color="#d5d5d5" side={THREE.DoubleSide} /></mesh>
    <mesh geometry={model.shell}><meshBasicMaterial color="#e7e7e7" side={THREE.DoubleSide} /></mesh>
    <Stroke points={model.base} color="#606060" />
    <Stroke points={model.wingEdge} color="#606060" />
    <Stroke points={model.shoulder} color="#868686" />
    {model.grips.map((points, i) => <Stroke key={i} points={points} color="#a2a2a2" />)}
    {model.buttons.map((button, i) => <group key={i}>
      <mesh geometry={button.geometry}><meshBasicMaterial color="#f4f4f4" side={THREE.DoubleSide} /></mesh>
      <Stroke points={button.outline} color="#707070" />
    </group>)}
    <Plate size={[.09, .20, .012]} radius={.035} position={[-.043, .228, -.285]} rotation={[-Math.PI / 2 + .28, 0, 0]} color="#777777" ink="#707070" />
    <group position={[-.043, .233, -.285]} rotation={[0, 0, Math.PI / 2]}>
      <mesh><cylinderGeometry args={[.068, .068, .057, 32]} /><meshBasicMaterial color="#b0b0b0" /></mesh>
      {[-.023, -.0115, 0, .0115, .023].map(y => <group key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}><Ring radius={.069} color="#6d6d6d" /></group>)}
    </group>
    <Plate size={[.065, .085, .013]} radius={.025} position={[-.044, .314, -.12]} rotation={[-Math.PI / 2 + .28, 0, 0]} color="#d2d2d2" ink="#777777" />
    <group position={[-.275, .209, -.12]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh><cylinderGeometry args={[.047, .047, .135, 24]} /><meshBasicMaterial color="#adadad" /></mesh>
      {[-.05, -.025, 0, .025, .05].map(y => <group key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}><Ring radius={.048} color="#777777" /></group>)}
    </group>
    {[-.13, -.035].map(z => <Plate key={z} size={[.08, .036, .012]} radius={.012} position={[-.288, .139, z]} rotation={[0, -Math.PI / 2, -.18]} color="#bfbfbf" ink="#777777" />)}
    <Plate size={[.10, .035, .012]} radius={.014} position={[0, .078, -.471]} color="#777777" ink="#777777" />
  </group>
})
