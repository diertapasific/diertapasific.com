'use client'

import type { MutableRefObject, ReactNode } from 'react'
import { tifaPose, tifaPetIntensity, tifaFeet } from './tifaMotion'
import { memo, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { shaggyChest, shaggyTail } from './yorkieFur'
import { bodyCoat, chestCoat, earShape, furLock, hairLines, headCoat, legCoat, tailCoat } from './yorkieGeometry'

type Point = [number, number, number]
type Props = { children?: ReactNode; motionTime: MutableRefObject<number>; petPulse: number; attention: MutableRefObject<boolean>; dark: boolean; active: boolean; chatting: boolean; replyPulse: number; reducedMotion: boolean }
type Tone = 'coat' | 'face' | 'muzzle' | 'ear' | 'ink' | 'glint' | 'collar' | 'leg' | 'chest' | 'tongue'
const tones: Record<Tone, [number, number]> = {
  coat: [.49, .67], face: [.83, .46], muzzle: [.91, .37], ear: [.55, .64],
  ink: [.13, .96], glint: [.96, .13], collar: [.32, .78], leg: [.77,.52], chest: [.77,.52], tongue: [.56,.65],
}
const pivot: Point = [0, .77, .33]

function makeMaterial(tone: Tone, fur = false, rig?: 'BODY_RIG' | 'LEG_RIG') {
  return new THREE.ShaderMaterial({
    defines: { ...(fur ? { FUR: 1 } : {}), ...(rig ? { [rig]: 1 } : {}) },
    side: fur ? THREE.DoubleSide : THREE.FrontSide,
    uniforms: { shoulderYaw: { value: 0 }, hipYaw: { value: 0 }, bodyDrop: { value: 0 }, footYaw: { value: 0 }, jointYaw: { value: 0 }, footOffset: { value: new THREE.Vector3() }, jointOffset: { value: new THREE.Vector3() }, paper: { value: tones[tone][0] }, coat: { value: tones.coat[0] }, limb: { value: tone==='leg'?1:0 }, dark: { value: 0 }, unlit: { value: tone === 'ink' || tone === 'glint' ? 1 : 0 } },
    vertexShader: `varying vec3 n; varying float height;
      uniform float shoulderYaw; uniform float hipYaw; uniform float bodyDrop;
      uniform float footYaw; uniform float jointYaw; uniform vec3 footOffset; uniform vec3 jointOffset;
      vec2 rotateXZ(vec2 p,float angle){float c=cos(angle),s=sin(angle);return mat2(c,-s,s,c)*p;}
      #ifdef FUR
      attribute float furShade; varying float strandShade;
      #endif
      void main(){
      #ifdef FUR
      strandShade=furShade;
      #endif
      height=position.y;
      vec3 p=position,localNormal=normal;
      #ifdef BODY_RIG
      float bodyYaw=mix(hipYaw,shoulderYaw,smoothstep(-.32,.23,p.z));
      p.xz=rotateXZ(p.xz,bodyYaw);p.y+=bodyDrop;
      localNormal.xz=rotateXZ(localNormal.xz,bodyYaw);
      #endif
      #ifdef LEG_RIG
      float lower=1.-smoothstep(-.16,.10,p.y);
      float legYaw=mix(jointYaw,footYaw,lower);
      p.xz=rotateXZ(p.xz,legYaw);p+=mix(jointOffset,footOffset,lower);
      localNormal.xz=rotateXZ(localNormal.xz,legYaw);
      #endif
      n=normalize(normalMatrix*localNormal);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`,
    fragmentShader: `uniform float paper;uniform float dark;uniform float unlit;uniform float coat;uniform float limb;varying vec3 n;varying float height;
      #ifdef FUR
      varying float strandShade;
      #endif
      void main(){
        vec3 normal=normalize(n);
        #ifdef FUR
        normal*=gl_FrontFacing?1.:-1.;
        #endif
        float light=max(0.0,dot(normal,normalize(vec3(-.45,.8,1.0))));
        float edge=1.0-smoothstep(.03,.16,abs(normal.z));
        #ifdef FUR
        float shade=(light-.55)*.09-edge*.055;
        #else
        float shade=(light-.55)*.11-edge*.16;
        #endif
        float base=mix(paper,coat,smoothstep(-.015,.095,height)*limb);
        #ifdef FUR
        base+=strandShade*mix(1.,-.7,dark);
        #endif
        float value=clamp(base+shade*mix(1.,-.7,dark)*(1.-unlit),.06,.98);
        gl_FragColor=vec4(vec3(value),1.0);
      }`,
  })
}

function Oval({ position, scale, material, geometry }: { position: Point; scale: Point; material: THREE.Material; geometry: THREE.BufferGeometry }) {
  return <mesh position={position} scale={scale} geometry={geometry} material={material} dispose={null} />
}

function makeGeometry() {
  const headPaths: Point[][] = []
  const cheekLocks: THREE.BufferGeometry[] = [], forelocks: THREE.BufferGeometry[] = []
  for (const side of [-1, 1]) {
    cheekLocks.push(furLock([[side*.08,1.06,.535],[side*.22,.99,.53],[side*.26,.82,.475]], .07))
    cheekLocks.push(furLock([[side*.07,.948,.63],[side*.16,.90,.66],[side*.21,.77,.58]], .07))
    forelocks.push(furLock([[side*.015,1.15,.405],[side*.045,1.13,.51],[side*.12,1.055,.568]], .055))
    for (let i = 0; i < 3; i++) {
      headPaths.push([[side*(.018+i*.027),1.132,.46+i*.015],[side*(.065+i*.035),1.085,.552],[side*(.10+i*.042),1.035,.574]])
      headPaths.push([[side*(.06+i*.032),.945,.676-i*.009],[side*(.12+i*.03),.89,.674-i*.02],[side*(.13+i*.036),.79,.60-i*.025]])
    }
    headPaths.push([[side*.205,1.02,.498],[side*.25,.94,.503],[side*.25,.845,.465]])
  }
  headPaths.push([[0,1.147,.442],[0,1.11,.535],[0,1.065,.582]])
  const torso=bodyCoat(), front=legCoat(false), hind=legCoat(true)
  return {
    body:torso.geometry, bodyFur:torso.fur, frontLeg:front.geometry, hindLeg:hind.geometry,
    frontFur:front.fur, hindFur:hind.fur, chestFur:shaggyChest(), tailFur:shaggyTail(),
    collar: new THREE.TorusGeometry(.137,.018,8,32),
    sphere: new THREE.SphereGeometry(1, 28, 20), head: headCoat(),
    ear: earShape(), innerEar: earShape(true), tail: tailCoat(),
    beard: furLock([[0,.91,.61],[0,.80,.625],[.015,.715,.525]], .12, .025),
    chest: chestCoat(),
    earFringe:[-1,1].map(side=>furLock([[side*.065,.105,.05],[side*.085,.055,.055],[side*.12,-.025,.035]],.026,.01)),
    cheekLocks, forelocks, headLines: hairLines(headPaths),
    tongueLine: hairLines([[[.004,.895,.729],[.005,.888,.730],[.005,.880,.727]]]),
    mouth: hairLines([[[0,.924,.721],[0,.901,.721],[-.038,.887,.696]],[[0,.901,.721],[.038,.887,.696]]]),
    toes: hairLines([[[-.027,.050,.132],[-.027,.072,.125],[-.027,.095,.106]],[[.027,.050,.132],[.027,.072,.125],[.027,.095,.106]]]),
    earHair: hairLines([[[-.065,.03,.056],[-.073,.10,.055],[-.017,.255,.042]],[[.065,.03,.056],[.072,.10,.055],[.026,.24,.042]]]),
  }
}

export const YorkieModel = memo(function YorkieModel({ children, motionTime, petPulse, attention, dark, active, chatting, replyPulse, reducedMotion }: Props) {
  const parts = useMemo(makeGeometry, [])
  const materials = useMemo(() => Object.fromEntries(Object.keys(tones).map(tone => [tone, makeMaterial(tone as Tone)])) as Record<Tone, THREE.ShaderMaterial>, [])
  const hair = useMemo(() => new THREE.LineBasicMaterial({ transparent: true, opacity: .55, depthWrite: false }), [])
  const furMaterials = useMemo(() => ({coat:makeMaterial('coat',true),leg:makeMaterial('leg',true),chest:makeMaterial('chest',true)}), [])
  const bodyMaterials = useMemo(() => [makeMaterial('coat',false,'BODY_RIG'),makeMaterial('coat',true,'BODY_RIG')], [])
  const legMaterials = useMemo(() => tifaFeet.map(() => [makeMaterial('leg',false,'LEG_RIG'),makeMaterial('leg',true,'LEG_RIG')]), [])
  const mouth = useMemo(() => new THREE.LineBasicMaterial(), [])
  const head = useRef<THREE.Group>(null), tail = useRef<THREE.Group>(null), chest = useRef<THREE.Group>(null), neck = useRef<THREE.Group>(null)
  const ears = useRef<(THREE.Group | null)[]>([]), eyes = useRef<(THREE.Group | null)[]>([]), toes = useRef<(THREE.LineSegments | null)[]>([])
  const activity = useRef(0), reaction = useRef(3), petAge = useRef(4), attentionAmount = useRef(0)
  useEffect(()=>{if(petPulse)petAge.current=0},[petPulse])
  useEffect(() => { if (chatting) reaction.current = 0 }, [chatting, replyPulse])
  useEffect(() => {
    for (const [name, material] of [...Object.entries(materials),...Object.entries(furMaterials)]) {
      material.uniforms.dark.value = dark ? 1 : 0
      material.uniforms.coat.value = tones.coat[dark ? 1 : 0]
      material.uniforms.paper.value = tones[name as Tone][dark ? 1 : 0]
    }
    for (const material of [...bodyMaterials,...legMaterials.flat()]) {
      material.uniforms.dark.value=dark?1:0
      material.uniforms.coat.value=tones.coat[dark?1:0]
      material.uniforms.paper.value=(material.defines.BODY_RIG?tones.coat:tones.leg)[dark?1:0]
    }
    hair.color.set(dark ? '#999999' : '#8b8b8b')
    mouth.color.set(dark ? '#f0f0f0' : '#555555')
  }, [dark, materials, furMaterials, bodyMaterials, legMaterials, hair, mouth])
  useEffect(() => () => {
    Object.values(parts).flat().forEach(geometry => geometry.dispose())
    Object.values(materials).forEach(material => material.dispose())
    Object.values(furMaterials).forEach(material=>material.dispose())
    ;[...bodyMaterials,...legMaterials.flat()].forEach(material=>material.dispose())
    hair.dispose(); mouth.dispose()
  }, [parts, materials, furMaterials, bodyMaterials, legMaterials, hair, mouth])

  useFrame((_, delta) => {
    const dt = Math.min(.05, delta), animated = active && !reducedMotion
    activity.current = THREE.MathUtils.damp(activity.current, animated ? 1 : 0, 8, dt)
    reaction.current = Math.min(3, reaction.current + dt)
    petAge.current = Math.min(4,petAge.current+dt)
    attentionAmount.current=THREE.MathUtils.damp(attentionAmount.current,attention.current?1:0,6,dt)
    const time = motionTime.current, amount = activity.current
    const pose=tifaPose(time,!animated),pet=tifaPetIntensity(petAge.current)*amount,curious=attentionAmount.current*amount
    const hello = Math.sin(reaction.current / 3 * Math.PI) ** 2 * amount
    if (head.current) {
      head.current.position.set(Math.sin(pose.shoulder)*pivot[2],pivot[1]-.10+pose.drop,Math.cos(pose.shoulder)*pivot[2])
      head.current.rotation.y = .30 + (Math.sin(time*.45)*.06+pose.headTurn)*amount
      head.current.rotation.z = (Math.sin(time*.35)*.025 + hello*.09)*amount + curious*.025 + pet*(.13+Math.sin(time*6)*.035)
      head.current.rotation.x = (Math.sin(time*.7)*.018+pose.sniff*.18)*amount-pet*.07
    }
    if (chest.current) {
      chest.current.scale.y = 1 + Math.sin(time*1.7)*.009*amount
      chest.current.rotation.y=pose.shoulder;chest.current.position.y=pose.drop
    }
    if(neck.current){neck.current.rotation.y=pose.shoulder;neck.current.position.y=pose.drop}
    for(const material of bodyMaterials){
      material.uniforms.shoulderYaw.value=pose.shoulder
      material.uniforms.hipYaw.value=pose.hip
      material.uniforms.bodyDrop.value=pose.drop
    }
    if (tail.current) {
      tail.current.rotation.z = Math.sin(time*(pet>.05?11:hello>.1?8:4))*(.13+hello*.17+pet*.28+curious*.09)*amount
      tail.current.position.set(Math.sin(pose.hip)*-.44,.54+pose.drop,Math.cos(pose.hip)*-.44)
      tail.current.rotation.y = pose.hip+Math.sin(time*8)*pet*.10
    }
    ears.current.forEach((ear, i) => {
      const phase = (time + i*2.8)%9
      const twitch = phase < .7 ? Math.sin(phase/.7*Math.PI)**2 : 0
      if (ear) ear.rotation.z = (i ? -.23 : .23) + (i ? -1 : 1)*twitch*.12*amount+(i?-1:1)*pet*.075
    })
    const phase = time%5.9, blink = animated && phase > 5.64 ? Math.max(.08, Math.abs(phase-5.77)/.13) : 1
    eyes.current.forEach(eye => { if (eye) eye.scale.y = blink*(1-pet*.43) })
    const pawPhase=time%36
    const pawLift=pawPhase>18&&pawPhase<19.4?Math.sin((pawPhase-18)/1.4*Math.PI)**2:0
    tifaFeet.forEach(([x,z],i)=>{
      const foot=pose.feet[i],joint=i%2?pose.shoulder:pose.hip
      const jointX=Math.cos(joint)*x+Math.sin(joint)*z-x
      const jointZ=-Math.sin(joint)*x+Math.cos(joint)*z-z
      const lift=foot.y+(i===1?pawLift*.028*amount:0)
      for(const material of legMaterials[i]){
        material.uniforms.footYaw.value=foot.yaw
        material.uniforms.jointYaw.value=joint
        material.uniforms.footOffset.value.set(foot.x,lift,foot.z)
        material.uniforms.jointOffset.value.set(jointX,pose.drop,jointZ)
      }
      const toe=toes.current[i]
      if(toe){toe.position.set(foot.x,-.30+lift,foot.z);toe.rotation.y=foot.yaw}
    })
  })

  return <group dispose={null}>
    <mesh geometry={parts.body} material={bodyMaterials[0]} />
    <mesh geometry={parts.bodyFur} material={bodyMaterials[1]} />
    <group ref={chest}>
      <mesh geometry={parts.chest} material={materials.chest} />
      <mesh geometry={parts.chestFur} material={furMaterials.chest} />
    </group>
    {[-1, 1].flatMap((side, i) => [-.32, .23].map((z, j) => <group key={`${side}-${z}`} position={[side*(j?.120:.145),.30,z]}>
      <mesh geometry={j?parts.frontLeg:parts.hindLeg} material={legMaterials[i*2+j][0]} />
      <mesh geometry={j?parts.frontFur:parts.hindFur} material={legMaterials[i*2+j][1]} />
      <lineSegments ref={node=>{toes.current[i*2+j]=node}} position={[0,-.30,0]} geometry={parts.toes} material={hair} />
    </group>))}
    <group ref={tail} position={[0,.54,-.44]}>
      <mesh geometry={parts.tail} material={materials.coat} />
      <mesh geometry={parts.tailFur} material={furMaterials.coat} />
    </group>
    <group ref={head} position={[pivot[0],pivot[1]-.10,pivot[2]]}>
      <group position={pivot.map(value => -value) as Point}>
        <mesh geometry={parts.head} material={materials.face} />
        {parts.cheekLocks.map((geometry, i) => <mesh key={i} geometry={geometry} material={materials.face} />)}
        <mesh geometry={parts.beard} material={materials.muzzle} />
        {parts.forelocks.map((geometry, i) => <mesh key={i} geometry={geometry} material={materials.face} />)}
        {[-1, 1].map((side, i) => <group key={side} ref={node => { ears.current[i] = node }} position={[side*.17,1.075,.36]} scale={[1,.82,1]} rotation={[.08,side*-.10,side*-.23]}>
          <mesh geometry={parts.ear} material={materials.face} />
          <mesh position={[0,0,.044]} geometry={parts.innerEar} material={materials.ear} />
          <lineSegments geometry={parts.earHair} material={hair} />
          {parts.earFringe.map((geometry,index)=><mesh key={index} geometry={geometry} material={materials.face}/>)}
        </group>)}
        {[-1, 1].map((side, i) => <group key={side} position={[side*.104,1.012,.579]} rotation={[0,side*.22,0]}>
          <Oval geometry={parts.sphere} material={materials.ear} position={[0,0,-.004]} scale={[.042,.037,.017]} />
          <group ref={node => { eyes.current[i] = node }}>
            <Oval geometry={parts.sphere} material={materials.ink} position={[0,0,.008]} scale={[.031,.030,.018]} />
            <Oval geometry={parts.sphere} material={materials.glint} position={[-.008,.009,.024]} scale={[.006,.006,.003]} />
          </group>
        </group>)}
        {[-1, 1].map(side => <Oval key={side} geometry={parts.sphere} material={materials.muzzle} position={[side*.057,.923,.61]} scale={[.095,.073,.09]} />)}
        <Oval geometry={parts.sphere} material={materials.ink} position={[0,.957,.702]} scale={[.052,.032,.031]} />
        <Oval geometry={parts.sphere} material={materials.glint} position={[-.011,.969,.729]} scale={[.013,.004,.002]} />
        <lineSegments geometry={parts.headLines} material={hair} />
        <Oval geometry={parts.sphere} material={materials.tongue} position={[.004,.885,.719]} scale={[.018,.018,.008]} />
        <lineSegments geometry={parts.tongueLine} material={mouth} />
        <lineSegments geometry={parts.mouth} material={mouth} />
      </group>
      {children}
    </group>
    <group ref={neck}>
    <mesh position={[0,.58,.27]} rotation={[Math.PI/2,0,0]} geometry={parts.collar} material={materials.collar} />
    <Oval geometry={parts.sphere} material={materials.ear} position={[0,.475,.405]} scale={[.037,.046,.013]} />
    </group>
  </group>
})
