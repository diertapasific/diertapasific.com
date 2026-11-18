'use client'

import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { MutableRefObject, ReactNode, RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { destinations, deskHeight, focusView, overviewPose } from './model'
import { advanceDeskMotion, bookPose, bookPoses, cardPoses, contentIsReady, createDeskMotion, motionProgress, deskControlPosition, deskDimensionLines, deskSize, deskmatPosition, monitorDepth, paperPosition, speakerPosition } from './motion'
import type { DeskMotion } from './motion'
import type { AboutSection, Destination, Point } from './model'
import { Block, Face, Keyboard, PAPER, Plate, Ring, Stroke } from './geometry'
import { Mouse } from './Mouse'
import { ObjectSurface } from './ObjectSurface'
import { useDeskDrag } from './useDeskDrag'
import { AboutBook } from './AboutBook'
import { Speaker } from './Speaker'
import { ReadingBook } from './ReadingBook'
import { ArticlePapers } from './ArticlePapers'
import { ShelfObjects } from './ShelfObjects'
import { HangingCard } from './HangingCard'
import { MobileDeskLabels } from './MobileDeskLabels'
import type { AnnotationPlan } from './annotationPlan'
import { DeskOpening } from './DeskOpening'
import { createOpeningTimeline, openingPose } from './opening'
import type { OpeningMode, OpeningTimeline } from './opening'
import { TifaCompanion } from './TifaCompanion'
import { tifaView } from './tifaView'
import { DeskBackdrop } from './DeskBackdrop'
import { FocusDismiss } from './SceneFocusDismiss'
import { advanceCameraMotion, createCameraMotion } from './cameraMotion'

type SceneProps = {
  dark: boolean; selected: Destination | null; onSelect: (id: Destination) => void; aboutSection: AboutSection; onAboutSection: (section: AboutSection) => void;
  reducedMotion: boolean; reset: number; standing: boolean; surface: RefObject<HTMLDivElement>; onReady: () => void; onFailure: () => void;
  openingMode: OpeningMode; onOpeningComplete: () => void; onDismiss: () => void;
  chatOpen?: boolean; onAsk?: () => void; replyPulse?: number; projectRequest?: {id:string;revision:number;article?:boolean}|null;
}
type ObjectProps = Pick<SceneProps, 'dark' | 'selected' | 'onSelect' | 'aboutSection' | 'onAboutSection' | 'reducedMotion' | 'openingMode' | 'chatOpen' | 'projectRequest'> & { motion: MutableRefObject<DeskMotion>; contentReady: boolean }

function Target({ id, position, marker, children, selected, hovered, onHover, onSelect, suppressClickUntil }: {
  id: Destination; position: Point; marker: Point; children: ReactNode; selected: Destination | null; hovered: Destination | null; onHover: (id: Destination | null) => void; onSelect: (id: Destination) => void; suppressClickUntil: MutableRefObject<number>;
}) {
  const item = destinations.find(d => d.id === id)!
  const mobile = useThree(state => state.size.width < 768)
  return <group position={position} userData={{ deskFocus: id }}
    onPointerOver={e => { if (!selected) { e.stopPropagation(); onHover(id) } }}
    onPointerOut={() => onHover(null)}
    onClick={e => { e.stopPropagation(); if (!selected && e.delta < 6 && performance.now() > suppressClickUntil.current) onSelect(id) }}>
    {children}
    {!selected && !mobile && <Html position={marker} center zIndexRange={[3, 1]}><button className={`object-label ${hovered === id ? 'is-hovered' : ''}`} aria-label={`Explore ${item.label}`} onPointerEnter={() => onHover(id)} onPointerLeave={() => onHover(null)} onClick={() => { if (performance.now() > suppressClickUntil.current) onSelect(id) }}><span className="object-number">{item.number}</span><span>{item.label}</span><span className="label-plus">+</span></button></Html>}
  </group>
}

const MonitorArm = memo(function MonitorArm() {
  return <group position={[.2, 0, 0]}>
    <Block size={[.26, .14, .36]} position={[0, .06, -2.34]} color="#dedede" ink="#777777" />
    <Block size={[.12, 1.20, .12]} position={[0, .72, -2.27]} ink="#777777" />
    <Block size={[.14, .14, .76]} position={[0, 1.32, -1.96]} rotation={[-.12, 0, 0]} color="#e4e4e4" />
    <Block size={[.13, .13, .60]} position={[0, 1.42, -1.37]} rotation={[-.20, 0, 0]} color="#e4e4e4" />
    <Block size={[.30, .34, .10]} position={[0, 1.57, -1.11]} ink="#777777" />
    <group position={[0, 1.36, -1.64]} rotation={[0, 0, Math.PI / 2]}><mesh><cylinderGeometry args={[.10, .10, .18, 24]} /><meshBasicMaterial color="#bdbdbd" /></mesh></group>
    <Stroke points={[[.09, .22, -2.29], [.09, 1.22, -2.29], [.09, 1.24, -1.99], [.09, 1.30, -1.65], [.09, 1.40, -1.17]]} color="#999999" />
  </group>
})

const MonitorShelf = memo(function MonitorShelf() {
  return <group position={[.2, 0, -.93]}>
    <Plate size={[4.4, 1.12, .08]} radius={.055} position={[0, .31, 0]} rotation={[-Math.PI / 2, 0, 0]} color="#efefef" ink="#777777" />
    {[-1.8, 1.8].map(x => <Block key={x} size={[.14, .19, .84]} position={[x, .175, 0]} ink="#999999" color="#dedede" />)}
  </group>
})

function Monitors(props: ObjectProps & { suppressClickUntil: MutableRefObject<number> }) {
  const { size } = useThree()
  const mobile = size.width < 768, active = props.selected === 'projects' && props.contentReady
  const surface = { dark: props.dark, destination: 'projects' as const, aboutSection: props.aboutSection, onAboutSection: props.onAboutSection, reducedMotion: props.reducedMotion }
  return <group position={[0, 0, monitorDepth + 1]}>
    <MonitorArm /><MonitorShelf /><ShelfObjects interactive={!props.selected && !props.chatOpen && props.openingMode === 'none'} suppressClickUntil={props.suppressClickUntil} />
    <group position={[.2, 1.57, -1.0]}>
      <Plate size={[4.4, 1.92, .12]} radius={.055} ink={active ? '#353535' : '#626262'} />
      <Plate size={[4.22, 1.76, .015]} radius={.02} position={[0, .015, .069]} ink="#9a9a9a" />
      <Ring radius={.014} position={[1.96, -.9, .063]} color="#666666" />
      <Stroke points={[[-.16, -.902, .063], [.16, -.902, .063]]} color="#aaa" />
      <ObjectSurface {...surface} projectRequest={props.projectRequest} interactive={active} position={[0, .015, .083]} worldSize={[mobile ? 1.45 : 4.19, 1.73]} />
    </group>
  </group>
}

function Notebook({ id, ...props }: ObjectProps & { id: 'about' | 'reading' }) {
  const active = props.selected === id
  const cover = useRef<THREE.Group>(null), book = useRef<THREE.Group>(null)
  const base = bookPoses[id].rest
  useFrame(() => {
    if (!cover.current || !book.current) return
    const pose = bookPose(id, motionProgress(props.motion.current, id))
    book.current.position.set(...pose.position)
    book.current.rotation.y = pose.yaw
    cover.current.rotation.z = pose.cover
  })
  return <>
    {id === 'reading' && [0, 1].map(i => <group key={i} position={[base[0], base[1] - .26 + i * .13, base[2]]} rotation={[0, i ? -.09 : .12, 0]}><Block size={[1.25, .12, 1.49]} color={i ? '#e8e8e8' : PAPER} ink="#777777" /><Face kind="reading" book={i ? 'psychology-of-money' : 'let-them-theory'} position={[0, .061, 0]} rotation={[-Math.PI / 2, 0, 0]} size={[1.21, 1.45]} /><Stroke points={[[-.57, 0, .75], [.57, 0, .75]]} color="#aaa" /></group>)}
    <group ref={book} position={base}>
      <Plate size={[1.32, 1.68, .045]} position={[0, -.035, 0]} rotation={[-Math.PI / 2, 0, 0]} radius={.045} />
      <Block size={[1.25, .105, 1.59]} position={[.015, .03, 0]} color="#eeeeee" ink="#a4a4a4" />
      {[0, 1, 2, 3].map(i => <Stroke key={i} points={[[-.59, .004 + i * .02, .799], [.64, .004 + i * .02, .799]]} color="#c0c0c0" />)}
      <Block size={[1.24, .008, 1.58]} position={[.015, .087, 0]} color="#f8f8f8" ink="#a8a8a8" />
      <group ref={cover} position={[-.65, .1, 0]}>
        <Plate size={[1.32, 1.68, .035]} position={[.65, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} radius={.045} />
        <Face kind={id === 'about' ? 'book' : 'reading'} position={[.65, .019, 0]} rotation={[-Math.PI / 2, 0, 0]} size={[1.25, 1.59]} />
        {!(active && props.contentReady) && <Face kind={id === 'about' ? 'inner' : 'reading'} position={[.65, -.019, 0]} rotation={[Math.PI / 2, 0, Math.PI]} size={[1.24, 1.58]} />}
      </group>
      <Stroke points={[[-.65, -.03, -.84], [-.65, .11, -.84], [-.65, .11, .84], [-.65, -.03, .84]]} color="#747474" />
      {active && props.contentReady && (id === 'about'
        ? <AboutBook section={props.aboutSection} onSection={props.onAboutSection} reducedMotion={props.reducedMotion} />
        : <ReadingBook reducedMotion={props.reducedMotion} />)}
    </group>
  </>
}




function Desk(props: ObjectProps & Pick<SceneProps, 'standing'> & { annotationPlan: MutableRefObject<AnnotationPlan | null>; suppressClickUntil: MutableRefObject<number> }) {
  const [hovered, setHovered] = useState<Destination | null>(null)
  const top = useRef<THREE.Group>(null), columns = useRef<THREE.Group>(null)
  const h = deskHeight(props.standing)
  const mobile = useThree(state => state.size.width < 768)
  const targetProps = { selected: props.chatOpen ? 'projects' as const : props.selected, hovered, onHover: setHovered, onSelect: props.onSelect, suppressClickUntil: props.suppressClickUntil }
  useFrame((_, dt) => {
    if (!top.current || !columns.current) return
    const current = THREE.MathUtils.damp(top.current.position.y, h, props.reducedMotion ? 1000 : 4, Math.min(dt, .05))
    top.current.position.y = current
    columns.current.scale.y = (current - .9) / 2.2
  })
  return <group>
    {[-3.5, 3.5].map(x => <group key={x} position={[x, 0, -.08]}>
      <Plate size={[.48, 2.95, .14]} radius={.09} position={[0, .12, 0]} rotation={[-Math.PI / 2, 0, 0]} color="#e8e8e8" ink="#777777" />
      <Block size={[.36, 1.35, .36]} position={[0, .85, 0]} color="#e9e9e9" ink="#858585" />
      {[-1.25, 1.25].map(z => <Block key={z} size={[.34, .055, .27]} position={[0, .025, z]} ink="#777777" />)}
    </group>)}
    <group ref={columns} position={[0, .9, -.08]}>{[-3.5, 3.5].map(x => <group key={x} position={[x, 0, 0]}><Block size={[.29, 1.45, .29]} position={[0, .72, 0]} ink="#777777" /><Block size={[.22, 1.15, .22]} position={[0, 1.64, 0]} color="#ededed" ink="#777777" /></group>)}</group>
    <group ref={top} position={[0, h, 0]}>
      <Block size={[7.3, .22, .28]} position={[0, -.25, -.08]} ink="#909090" />
      {[-3.5, 3.5].map(x => <Block key={x} size={[.42, .14, 2.8]} position={[x, -.13, -.08]} ink="#8b8b8b" />)}
      <Block size={[2.8, .3, .42]} position={[.1, -.3, -1.7]} color="#eeeeee" ink="#a3a3a3" />
      <Plate size={[deskSize[0], deskSize[2], deskSize[1]]} radius={.13} rotation={[-Math.PI / 2, 0, 0]} ink="#777777" />
      <Plate size={[4.7, 1.82, .018]} radius={.15} position={deskmatPosition} rotation={[-Math.PI / 2, 0, 0]} color="#e9e9e9" ink="#9b9b9b" />
      <group rotation={[-Math.PI / 2, 0, 0]} position={[deskmatPosition[0], .11, deskmatPosition[2]]}><Stroke points={useMemo(() => {
        const p: Point[] = []; const w = 4.58, h = 1.7, r = .12
        for (let c = 0; c < 4; c++) for (let i = 0; i <= 12; i++) { const a = -Math.PI / 2 + c * Math.PI / 2 + i / 12 * Math.PI / 2; const x = c < 2 ? w / 2 - r : -w / 2 + r, y = c === 0 || c === 3 ? -h / 2 + r : h / 2 - r; p.push([x + Math.cos(a) * r, y + Math.sin(a) * r, 0]) } p.push(p[0]); return p
      }, [])} color="#b9b9b9" dashed /></group>
      {mobile && !props.selected && !props.chatOpen && <MobileDeskLabels annotationPlan={props.annotationPlan} height={h} onSelect={props.onSelect} suppressClickUntil={props.suppressClickUntil} />}
      <Target {...targetProps} id="projects" position={[0, 0, 0]} marker={[.35, 2.98, monitorDepth]}><Monitors {...props} suppressClickUntil={props.suppressClickUntil} /></Target>
      <Keyboard /><Mouse />
      <Target {...targetProps} id="about" position={[0, 0, 0]} marker={[bookPoses.about.rest[0], .85, bookPoses.about.rest[2] + .2]}><Notebook {...props} id="about" /></Target>
      <Target {...targetProps} id="reading" position={[0, 0, 0]} marker={[bookPoses.reading.rest[0], 1.25, bookPoses.reading.rest[2]]}><Notebook {...props} id="reading" /></Target>
      <Target {...targetProps} id="music" position={[0, 0, 0]} marker={[speakerPosition[0], 1.95, speakerPosition[2]]}><Speaker active={props.selected === 'music' && props.contentReady} {...props} /></Target>
      <Target {...targetProps} id="writing" position={[0, 0, 0]} marker={[paperPosition[0], .95, paperPosition[2] + .15]}><ArticlePapers dark={props.dark} active={props.selected === 'writing' && props.contentReady} motion={props.motion} reducedMotion={props.reducedMotion} /></Target>
      <Target {...targetProps} id="contact" position={[0, 0, 0]} marker={[cardPoses.rest[0], -1.3, cardPoses.rest[2] + .05]}><HangingCard dark={props.dark} selected={props.selected === 'contact'} active={props.selected === 'contact' && props.contentReady} motion={props.motion} reducedMotion={props.reducedMotion} /></Target>
      <group position={deskControlPosition}><Plate size={[.72, .23, .15]} radius={.045} color="#dcdcdc" ink="#777777" /><Face kind={props.standing ? 'height' : 'height-seated'} position={[-.16, 0, .077]} size={[.2, .14]} /><Stroke points={[[.06, 0, .078], [.13, .045, .078], [.2, 0, .078]]} /><Stroke points={[[.22, .035, .078], [.29, -.01, .078], [.35, .035, .078]]} /></group>
    </group>
    <Stroke points={[[-deskSize[0] / 2 - .3, .02, deskDimensionLines.widthZ], [deskSize[0] / 2 + .3, .02, deskDimensionLines.widthZ]]} color="#bcbcbc" />
    {[-deskSize[0] / 2, deskSize[0] / 2].map(x => <Stroke key={x} points={[[x, .02, deskDimensionLines.widthZ - .16], [x, .02, deskDimensionLines.widthZ + .16]]} color="#bcbcbc" />)}
    <Stroke points={[[deskDimensionLines.heightX, 0, deskDimensionLines.heightZ], [deskDimensionLines.heightX, h, deskDimensionLines.heightZ]]} color="#bababa" dashed />
  </group>
}

const Ground = memo(function Ground() {
  const points = useMemo(() => { const p: number[] = []; for (let i = -10; i <= 10; i++) { p.push(i * .7, -.02, -5.5, i * .7, -.02, 5.5); p.push(-7, -.02, i * .55, 7, -.02, i * .55) } return new Float32Array(p) }, [])
  return <lineSegments><bufferGeometry><bufferAttribute attach="attributes-position" args={[points, 3]} /></bufferGeometry><lineBasicMaterial color="#d4d4d4" transparent opacity={.28} /></lineSegments>
})

function CameraRig({ selected, reducedMotion, standing, orbit, annotationPlan, openingMode, opening, chatOpen }: Pick<SceneProps, 'selected' | 'reducedMotion' | 'standing' | 'openingMode' | 'chatOpen'> & { orbit: MutableRefObject<{ x: number; y: number }>; annotationPlan: MutableRefObject<AnnotationPlan | null>; opening: MutableRefObject<OpeningTimeline> }) {
  const { camera, size } = useThree()
  const start = useRef(true), travel = useMemo(createCameraMotion, [])
  const target = useMemo(() => new THREE.Vector3(), []), position = useMemo(() => new THREE.Vector3(), [])
  const focusUp = useMemo(() => new THREE.Vector3(), []), focusDirection = useMemo(() => new THREE.Vector3(), [])
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), [])
  useFrame((_, delta) => {
    const cam = camera as THREE.OrthographicCamera
    up.set(0, 1, 0)
    const h = deskHeight(standing)
    // Follow navigation immediately. Physical objects still close in sequence,
    // but the camera can pull back while they return to their resting poses.
    let zoom: number
    if(chatOpen){
      const view=tifaView(size.width,size.height)
      target.set(...view.target);position.set(...view.offset).add(target);zoom=view.zoom
    } else if (selected) {
      const v = focusView(selected, size.width, size.height)
      if (selected === 'writing' || selected === 'about' || selected === 'reading') up.set(0, 0, -1)
      target.set(...v.target); target.y += h; position.set(...v.offset).add(target); zoom = v.zoom
      // Account for top chrome vs the two-row mobile footer by shifting both
      // camera and target in the view's up direction, without view-offset matrices.
      const shift = v.shift / zoom
      focusDirection.set(...v.offset).normalize()
      focusUp.copy(up).projectOnPlane(focusDirection).normalize().multiplyScalar(-shift)
      target.add(focusUp); position.add(focusUp)
    } else {
      const plan = annotationPlan.current
      const fit = plan?.width === size.width && plan.height === size.height ? plan.zoom : undefined
      const view = overviewPose(size.width, size.height, orbit.current, standing, fit)
      if (openingMode !== 'none') {
        const arrival = openingPose(view, h, opening.current.progress, openingMode)
        camera.position.set(...arrival.position); camera.lookAt(...arrival.target)
        cam.zoom = arrival.zoom; cam.updateProjectionMatrix(); start.current = false
        return
      }
      target.set(...view.target); position.set(...view.position); zoom = view.zoom
    }
    advanceCameraMotion(cam, travel, position, target, up, zoom, delta, reducedMotion || start.current)
    start.current = false
  })
  return null
}

function Ready({ onReady, onFailure }: Pick<SceneProps, 'onReady' | 'onFailure'>) {
  const { gl } = useThree()
  useEffect(() => {
    onReady()
    const lost = (event: Event) => { event.preventDefault(); onFailure() }
    gl.domElement.addEventListener('webglcontextlost', lost)
    return () => gl.domElement.removeEventListener('webglcontextlost', lost)
  }, [gl, onReady, onFailure])
  return null
}

function AnimatedDesk(props: SceneProps & { annotationPlan: MutableRefObject<AnnotationPlan | null>; motion: MutableRefObject<DeskMotion>; orbit: MutableRefObject<{ x: number; y: number }>; suppressClickUntil: MutableRefObject<number>; opening: MutableRefObject<OpeningTimeline> }) {
  const [presentation, setPresentation] = useState<{ id: Destination | null; ready: boolean }>({ id: null, ready: false })
  const previous = useRef(presentation)
  useFrame((_, delta) => {
    advanceDeskMotion(props.motion.current, props.selected, delta, props.reducedMotion)
    const next = { id: props.motion.current.id, ready: contentIsReady(props.motion.current, props.selected) }
    if (next.id !== previous.current.id || next.ready !== previous.current.ready) {
      previous.current = next
      setPresentation(next)
    }
  }, -2)
  return <><CameraRig {...props} /><Ground /><DeskOpening mode={props.openingMode} timeline={props.opening} height={deskHeight(props.standing)} surface={props.surface} onComplete={props.onOpeningComplete}><DeskBackdrop chatting={Boolean(props.chatOpen)} openingMode={props.openingMode}><Desk {...props} selected={presentation.id} contentReady={presentation.ready} /></DeskBackdrop><TifaCompanion dark={props.dark} enabled={!props.selected&&!props.chatOpen&&props.openingMode==='none'} chatting={Boolean(props.chatOpen)} replyPulse={props.replyPulse??0} onAsk={props.onAsk} suppressClickUntil={props.suppressClickUntil} reducedMotion={props.reducedMotion} /></DeskOpening><Ready onReady={props.onReady} onFailure={props.onFailure} /></>
}

export default function DeskScene(props: SceneProps) {
  const { orbit, suppressClickUntil } = useDeskDrag(props.surface, !props.selected && !props.chatOpen && props.openingMode === 'none', props.reset)
  const motion = useRef(createDeskMotion())
  const opening = useRef(createOpeningTimeline(props.openingMode))
  const annotationPlan = useRef<AnnotationPlan | null>(null)
  return <Canvas flat orthographic camera={{ position: [8, 8, 12], zoom: 70, near: .1, far: 100 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true, localClippingEnabled: true }}>
    <FocusDismiss focus={props.openingMode === 'none' ? props.chatOpen ? 'tifa' : props.selected : null} onDismiss={props.onDismiss} />
    <AnimatedDesk {...props} opening={opening} annotationPlan={annotationPlan} motion={motion} orbit={orbit} suppressClickUntil={suppressClickUntil} />
  </Canvas>
}
