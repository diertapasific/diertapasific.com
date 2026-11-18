'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { ChatCircle } from '@phosphor-icons/react'
import { Group, Vector3 } from 'three'

export function placeTifaLabel(anchor:{x:number;y:number},width:number,height:number,viewport:{width:number;height:number},mobile:boolean){
  const left=mobile?anchor.x-width/2:anchor.x-width-64
  const top=anchor.y-height/2+(mobile?46:0)
  return {x:Math.max(12,Math.min(viewport.width-width-12,left)),y:Math.max(90,Math.min(viewport.height-(mobile?147:130)-height,top))}
}
const origin=()=>[0,0]

export function TifaLabel({enabled,mobile,onAsk}:{enabled:boolean;mobile:boolean;onAsk:()=>void}){
  const {camera,size}=useThree(),anchor=useRef<Group>(null),root=useRef<HTMLDivElement>(null)
  const button=useRef<HTMLButtonElement|null>(null),path=useRef<SVGPathElement>(null),dot=useRef<SVGCircleElement>(null)
  const observer=useRef<ResizeObserver|null>(null),dimensions=useRef({width:170,height:44})
  const drawn=useRef('')
  const point=useMemo(()=>new Vector3(),[])
  const attach=useCallback((node:HTMLButtonElement|null)=>{
    observer.current?.disconnect();button.current=node
    if(node){const measure=()=>{dimensions.current={width:node.offsetWidth,height:node.offsetHeight}};measure();observer.current=new ResizeObserver(measure);observer.current.observe(node)}
  },[])
  useEffect(()=>()=>observer.current?.disconnect(),[])
  useFrame(()=>{
    if(!root.current||!button.current||!anchor.current)return
    const visibility=enabled?'visible':'hidden'
    if(root.current.style.visibility!==visibility)root.current.style.visibility=visibility
    if(!enabled)return
    anchor.current.updateWorldMatrix(true,false);camera.updateMatrixWorld()
    anchor.current.getWorldPosition(point);point.project(camera)
    const projected={x:(point.x+1)*size.width/2,y:(1-point.y)*size.height/2}
    const {width,height}=dimensions.current,position=placeTifaLabel(projected,width,height,size,mobile)
    const signature=`${position.x},${position.y},${projected.x},${projected.y}`
    if(drawn.current===signature)return
    drawn.current=signature
    button.current.style.transform=`translate3d(${position.x}px,${position.y}px,0)`
    const x=Math.max(position.x,Math.min(position.x+width,projected.x)),y=Math.max(position.y,Math.min(position.y+height,projected.y))
    path.current?.setAttribute('d',`M${x},${y}L${projected.x},${projected.y}`)
    dot.current?.setAttribute('cx',String(projected.x));dot.current?.setAttribute('cy',String(projected.y))
  })
  return <group ref={anchor} position={mobile?[0,.1,0]:[0,.3,.2]}>
    <Html calculatePosition={origin} zIndexRange={[4,4]} style={{pointerEvents:'none'}}>
      <div ref={root} data-tifa-annotation className="pointer-events-none absolute left-0 top-0" style={{width:size.width,height:size.height,visibility:'hidden'}}>
        <svg width={size.width} height={size.height} className="absolute inset-0 overflow-visible" aria-hidden="true" fill="none" stroke="#b0b0b0" strokeWidth=".7"><path ref={path}/><circle ref={dot} r="1.5" fill="#f6f6f6"/></svg>
        <button ref={attach} type="button" data-desk-control="tifa" disabled={!enabled} aria-label="Ask Tifa about Dipa" aria-hidden={!enabled||undefined} onPointerDown={event=>event.stopPropagation()} onClick={event=>{event.stopPropagation();onAsk()}} className={`tifa-trigger ${enabled?'is-ready':''} pointer-events-auto absolute left-0 top-0 min-h-11 min-w-11 p-0`}>
          <span className="tifa-label-face flex min-h-11 min-w-11 items-center justify-center gap-2 whitespace-nowrap border border-zinc-300 bg-[#f6f6f6] px-2.5 font-mono text-[10px] text-zinc-600">{!mobile&&<ChatCircle size={15}/>}<span>Tifa{!mobile&&<span className="ml-2 text-zinc-400">ask about Dipa</span>}</span></span>
        </button>
      </div>
    </Html>
  </group>
}
