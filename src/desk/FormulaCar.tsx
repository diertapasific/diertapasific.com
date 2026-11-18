'use client'

import { memo, useEffect, useMemo, useRef } from 'react'
import type { MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Block, Plate, Ring, Stroke } from './geometry'
import type { Point } from './model'
import { miniatureHome } from './objectMotion'

// X runs from nose to rear axle; dimensions stay inside the shelf's clearance.
type Section = [x: number, halfWidth: number, bottom: number, top: number]

function Bodywork({ sections, color = '#e5e5e5' }: { sections: Section[]; color?: string }) {
  const model = useMemo(() => {
    const segments = 12, vertices: number[] = [], indices: number[] = [], shades: number[] = []
    for (const [x, halfWidth, bottom, top] of sections) for (let i = 0; i < segments; i++) {
      const angle = i / segments * Math.PI * 2
      vertices.push(x, (top + bottom) / 2 + Math.sin(angle) * (top - bottom) / 2, Math.cos(angle) * halfWidth)
      const shade = .82 + .18 * Math.max(0, Math.sin(angle)); shades.push(shade, shade, shade)
    }
    for (let section = 0; section < sections.length - 1; section++) for (let i = 0; i < segments; i++) {
      const a = section * segments + i, b = section * segments + (i + 1) % segments, c = a + segments, d = b + segments
      indices.push(a, b, c, b, d, c)
    }
    for (let i = 1; i < segments - 1; i++) {
      indices.push(0, i + 1, i)
      const last = (sections.length - 1) * segments; indices.push(last, last + i, last + i + 1)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(shades, 3))
    geometry.setIndex(indices); geometry.computeVertexNormals()
    const contours = [-1, 1].map(side => sections.map(([x, w, bottom, top]) => [x, bottom + (top - bottom) * .72, side * w * .90] as Point))
    return { geometry, contours }
  }, [sections])
  useEffect(() => () => model.geometry.dispose(), [model])
  return <><mesh geometry={model.geometry}><meshBasicMaterial color={color} vertexColors side={THREE.DoubleSide} /></mesh>{model.contours.map((points, i) => <Stroke key={i} points={points} color="#858585" width={.65} />)}</>
}

function Tube({ points, radius = .0045, color = '#777777' }: { points: Point[]; radius?: number; color?: string }) {
  const geometry = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 28, radius, 6, false), [points, radius])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry}><meshBasicMaterial color={color} /></mesh>
}

function Aerofoil({ points, height, thickness = .008, color = '#dedede' }: { points: [number, number][]; height: number; thickness?: number; color?: string }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape(); points.forEach(([x, z], i) => { if (i) shape.lineTo(x, -z); else shape.moveTo(x, -z) }); shape.closePath()
    return new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false })
  }, [points, thickness])
  useEffect(() => () => geometry.dispose(), [geometry])
  const outline: Point[] = [...points, points[0]].map(([x, z]) => [x, height + thickness / 2 + .001, z])
  return <><mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, height - thickness / 2, 0]}><meshBasicMaterial color={color} /></mesh><Stroke points={outline} color="#727272" width={.7} /></>
}

function Wheel({ rear, side, travel }: { rear: boolean; side: number; travel?: MutableRefObject<number> }) {
  const wheel = useRef<THREE.Group>(null)
  const radius = rear ? .078 : .071, width = rear ? .079 : .067, x = rear ? .29 : -.275
  const model = useMemo(() => {
    const profile = [[.039, -width / 2], [radius - .011, -width / 2], [radius - .003, -width / 2 + .007], [radius, -width / 2 + .015], [radius, width / 2 - .015], [radius - .003, width / 2 - .007], [radius - .011, width / 2], [.039, width / 2], [.039, -width / 2]]
    const tire = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 32)
    const spokes: number[] = []
    for (let i = 0; i < 10; i++) { const angle = i / 10 * Math.PI * 2; spokes.push(Math.cos(angle) * .011, Math.sin(angle) * .011, side * (width / 2 + .003), Math.cos(angle + .08) * .034, Math.sin(angle + .08) * .034, side * (width / 2 + .003)) }
    const spokeGeometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(spokes, 3))
    return { tire, spokeGeometry }
  }, [radius, width, side])
  useEffect(() => () => { model.tire.dispose(); model.spokeGeometry.dispose() }, [model])
  useFrame(() => { if (wheel.current && travel) wheel.current.rotation.z = -travel.current / radius })
  return <group ref={wheel} position={[x, radius, side * .158]}>
    <mesh geometry={model.tire} rotation={[Math.PI / 2, 0, 0]}><meshBasicMaterial color="#707070" /></mesh>
    <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.038, .038, width + .002, 24]} /><meshBasicMaterial color="#bebebe" /></mesh>
    <Ring radius={radius - .009} position={[0, 0, side * (width / 2 + .001)]} color="#aaaaaa" />
    <Ring radius={.037} position={[0, 0, side * (width / 2 + .003)]} color="#666666" />
    <Ring radius={.030} position={[0, 0, side * (width / 2 + .004)]} color="#eeeeee" />
    <lineSegments geometry={model.spokeGeometry}><lineBasicMaterial color="#666666" /></lineSegments>
    <mesh position={[0, 0, side * (width / 2 + .005)]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.010, .010, .005, 6]} /><meshBasicMaterial color="#777777" /></mesh>
  </group>
}

export const FormulaCar = memo(function FormulaCar({ wheelTravel }: { wheelTravel?: MutableRefObject<number> }) {
  return <group position={miniatureHome} rotation={[0, -.04, 0]}>
    {/* Low floor and tapered monocoque, with a separate raised engine cover. */}
    <Aerofoil height={.027} points={[[-.20, -.105], [.08, -.135], [.33, -.10], [.37, -.07], [.37, .07], [.33, .10], [.08, .135], [-.20, .105]]} color="#a6a6a6" />
    <Bodywork sections={[[-.44, .018, .052, .074], [-.32, .024, .055, .093], [-.19, .040, .052, .12], [-.08, .059, .044, .133], [.08, .061, .04, .136], [.21, .044, .034, .11], [.35, .023, .032, .074]]} />
    <Bodywork sections={[[.08, .039, .09, .17], [.13, .037, .07, .205], [.20, .027, .058, .157], [.30, .017, .044, .105], [.36, .009, .037, .067]]} color="#eeeeee" />
    <Stroke points={[[.13, .207, 0], [.21, .16, 0], [.32, .106, 0]]} color="#858585" width={.75} />
    {/* Cockpit recess, seat, steering wheel, halo and overhead air intake. */}
    <Plate size={[.145, .077, .009]} radius={.032} position={[-.013, .134, 0]} rotation={[-Math.PI / 2, 0, 0]} color="#555555" ink="#777777" />
    <Block size={[.024, .038, .054]} position={[.043, .148, 0]} rotation={[0, 0, -.18]} color="#999999" ink="#777777" />
    <group position={[-.069, .15, 0]} rotation={[0, Math.PI / 2, 0]}><mesh><torusGeometry args={[.023, .004, 6, 18]} /><meshBasicMaterial color="#777777" /></mesh></group>
    <Tube points={[[.065, .153, -.048], [-.035, .193, -.047], [-.098, .188, 0], [-.035, .193, .047], [.065, .153, .048]]} radius={.0065} color="#666666" />
    <Tube points={[[-.098, .188, 0], [-.104, .133, 0]]} radius={.005} />
    <Plate size={[.048, .031, .01]} radius={.012} position={[.111, .187, 0]} rotation={[0, -Math.PI / 2, 0]} color="#666666" ink="#999999" />
    {[-1, 1].map(side => <group key={side}>
      {/* Undercut sidepods have an intake lip and a taper toward the gearbox. */}
      <group position={[0, 0, side * .075]}>
        <Bodywork sections={[[-.07, .027, .055, .115], [-.025, .052, .045, .124], [.09, .046, .033, .105], [.19, .025, .032, .073], [.26, .010, .032, .05]]} color="#d9d9d9" />
        <Plate size={[.043, .025, .005]} radius={.008} position={[-.071, .090, side * .008]} rotation={[0, -Math.PI / 2, 0]} color="#666666" ink="#999999" />
        {[0, 1, 2, 3].map(i => <Stroke key={i} points={[[.035 + i * .017, .116 - i * .003, -.020], [.043 + i * .017, .114 - i * .003, .022]]} color="#8b8b8b" width={.55} />)}
      </group>
      {/* Two wishbones and a pushrod at each exposed wheel. */}
      {[-.275, .29].map((x, i) => <group key={x}>
        <Tube points={[[x - .065, .058, side * .035], [x, i ? .078 : .071, side * .137], [x + .072, .058, side * .035]]} radius={.0035} />
        <Tube points={[[x - .058, .094, side * .033], [x, i ? .086 : .079, side * .137], [x + .059, .098, side * .035]]} radius={.003} />
        <Tube points={[[x + .052, .12, side * .025], [x - .01, .06, side * .13]]} radius={.0035} />
      </group>)}
      <Wheel side={side} rear={false} travel={wheelTravel} /><Wheel side={side} rear travel={wheelTravel} />
      <Tube points={[[-.08, .118, side * .055], [-.06, .145, side * .108]]} radius={.0035} />
      <Plate size={[.043, .020, .022]} radius={.008} position={[-.06, .15, side * .11]} color="#d4d4d4" ink="#7d7d7d" />
      <Block size={[.096, .074, .007]} position={[.39, .173, side * .165]} color="#dddddd" ink="#858585" />
      <Tube points={[[.32, .08, side * .040], [.35, .18, side * .045]]} radius={.005} />
      <Block size={[.085, .035, .006]} position={[-.435, .050, side * .186]} color="#dddddd" ink="#888888" />
    </group>)}
    {/* Three swept front-wing elements, twin rear elements and a beam wing. */}
    {[0, 1, 2].map(i => <Aerofoil key={i} height={.037 + i * .014} thickness={.006} points={[[-.48 + i * .025, -.18 + i * .008], [-.448 + i * .025, -.18 + i * .008], [-.418 + i * .025, -.065], [-.438 + i * .025, 0], [-.418 + i * .025, .065], [-.448 + i * .025, .18 - i * .008], [-.48 + i * .025, .18 - i * .008], [-.458 + i * .025, 0]]} color={i === 1 ? '#cccccc' : '#e6e6e6'} />)}
    <Aerofoil height={.207} points={[[.337, -.16], [.405, -.16], [.41, -.08], [.41, .08], [.405, .16], [.337, .16]]} />
    <Aerofoil height={.224} thickness={.006} points={[[.405, -.155], [.437, -.155], [.437, .155], [.405, .155]]} color="#ededed" />
    <Aerofoil height={.122} thickness={.006} points={[[.335, -.13], [.385, -.13], [.385, .13], [.335, .13]]} color="#bfbfbf" />
    {[-.064, -.032, 0, .032, .064].map(z => <Block key={z} size={[.079, .022, .004]} position={[.32, .032, z]} rotation={[0, 0, -.15]} color="#999999" ink="#888888" />)}
    <Tube points={[[.265, .102, 0], [.353, .087, 0]]} radius={.009} color="#888888" />
  </group>
})
