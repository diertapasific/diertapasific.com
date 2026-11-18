'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Plate, PAPER } from './geometry'
import { tifaHome, tifaMat, tifaPose } from './tifaMotion'
import { YorkieModel } from './YorkieModel'
import { TifaLabel } from './TifaLabel'
import { TifaPetLabel } from './TifaPetLabel'

const MatName=memo(function MatName(){
  const texture=useMemo(()=>{
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=96
    const c=canvas.getContext('2d')!;c.fillStyle=PAPER;c.fillRect(0,0,256,96);c.fillStyle='#858585';c.font='27px monospace';c.textAlign='center';c.fillText('T I F A',128,60)
    const result=new THREE.CanvasTexture(canvas);result.colorSpace=THREE.SRGBColorSpace;return result
  },[])
  useEffect(()=>()=>texture.dispose(),[texture])
  return <mesh position={[0,.017,.54]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.55,.20]} /><meshBasicMaterial map={texture} /></mesh>
})

export const TifaCompanion=memo(function TifaCompanion({dark,enabled,chatting,replyPulse,onAsk,suppressClickUntil,reducedMotion}:{dark:boolean;enabled:boolean;chatting:boolean;replyPulse:number;onAsk?:()=>void;suppressClickUntil:MutableRefObject<number>;reducedMotion:boolean}){
  const mobile=useThree(state=>state.size.width<768)
  const rig=useRef<THREE.Group>(null)
  const time=useRef(0),baseYaw=useRef(-.18),attention=useRef(false),lastPet=useRef(Number.NEGATIVE_INFINITY)
  const [petPulse,setPetPulse]=useState(0),[happy,setHappy]=useState(false)
  const pet=useCallback(()=>{const now=performance.now();if(!chatting||now<suppressClickUntil.current||now-lastPet.current<400)return;lastPet.current=now;setPetPulse(value=>value+1)},[chatting,suppressClickUntil])
  useEffect(()=>{if(!petPulse)return;setHappy(true);const timer=window.setTimeout(()=>setHappy(false),2600);return()=>window.clearTimeout(timer)},[petPulse])
  const passive=useMemo(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches,[])
  const ask=()=>{if(enabled&&onAsk&&performance.now()>suppressClickUntil.current)onAsk()}
  useFrame((_,delta)=>{
    const dt=Math.min(.05,delta),animate=!reducedMotion&&!passive
    if(animate)time.current+=dt
    const pose=tifaPose(time.current,!animate)
    if(rig.current){
      rig.current.position.x=THREE.MathUtils.damp(rig.current.position.x,pose.x,8,dt)
      rig.current.position.z=THREE.MathUtils.damp(rig.current.position.z,pose.z,8,dt)
      baseYaw.current=THREE.MathUtils.damp(baseYaw.current,chatting?-.30:-.18,7,dt)
      rig.current.rotation.y=baseYaw.current+pose.turn
    }
  }, -1)
  return <group position={tifaHome} userData={{ deskFocus: 'tifa' }}>
    <Plate size={tifaMat} radius={.21} rotation={[-Math.PI/2,0,0]} color="#f0f0f0" ink="#b2b2b2" /><MatName />
    <group ref={rig} position={[0,.005,0]} scale={mobile?1:.88} onPointerOver={event=>{event.stopPropagation();attention.current=true}} onPointerOut={()=>{attention.current=false}} onClick={event=>{event.stopPropagation();if(event.delta<6){if(chatting&&performance.now()>suppressClickUntil.current)pet();else if(!chatting)ask()}}}>
      <YorkieModel motionTime={time} petPulse={petPulse} attention={attention} dark={dark} active chatting={chatting} replyPulse={replyPulse} reducedMotion={reducedMotion||passive}><TifaPetLabel enabled={chatting} happy={happy} onPet={pet} /></YorkieModel>
    </group>
    <TifaLabel enabled={enabled&&Boolean(onAsk)} mobile={mobile} onAsk={ask}/>
  </group>
})
