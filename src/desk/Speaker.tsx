'use client'

import { Block, Plate, Ring, Stroke } from './geometry'
import { ObjectSurface } from './ObjectSurface'
import { speakerPosition, speakerScreen, speakerScale } from './motion'
import type { AboutSection } from './model'

export function Speaker({ dark, active, aboutSection, onAboutSection, reducedMotion }: { dark: boolean; active: boolean; aboutSection: AboutSection; onAboutSection: (section: AboutSection) => void; reducedMotion: boolean }) {
  return <group position={speakerPosition} scale={speakerScale}>
    <Plate size={[1.58, 1.495, .74]} position={[0, -.1875, 0]} radius={.11} color="#e8e8e8" ink="#686868" />
    <Plate size={[1.44, .40, .018]} radius={.055} position={[0, -.48, .379]} color="#dedede" ink="#909090" />
    {/* Recessed drivers and a finer woven grille leave the casing legible. */}
    <Ring radius={.16} position={[-.35, -.48, .39]} color="#a0a0a0" />
    <Ring radius={.12} position={[-.35, -.48, .391]} color="#b1b1b1" />
    <Ring radius={.055} position={[-.35, -.48, .392]} color="#b7b7b7" />
    <Ring radius={.14} position={[.35, -.48, .39]} color="#a0a0a0" />
    <Ring radius={.09} position={[.35, -.48, .391]} color="#b1b1b1" />
    {Array.from({ length: 39 }, (_, i) => <Stroke key={`v${i}`} points={[[-.665 + i * .035, -.65, .394], [-.665 + i * .035, -.31, .394]]} color="#b8b8b8" width={.55} />)}
    {Array.from({ length: 11 }, (_, i) => <Stroke key={`h${i}`} points={[[-.67, -.65 + i * .032, .395], [.67, -.65 + i * .032, .395]]} color="#c3c3c3" width={.55} />)}
    {/* The scene's dark transfer maps pale source fills to dark surfaces. */}
    <Plate size={[1.32, .72, .016]} radius={.035} position={[0, .15, .379]} color={dark ? '#f4f4f4' : '#f8f8f8'} ink={dark ? '#aaaaaa' : '#686868'} />
    <ObjectSurface dark={dark} destination="music" interactive={active} position={speakerScreen} worldSize={[1.22, .64]} pixelScale={speakerScale} aboutSection={aboutSection} onAboutSection={onAboutSection} reducedMotion={reducedMotion} />
    <group position={[.52, .598, .035]}>
      <mesh><cylinderGeometry args={[.09, .09, .075, 32]} /><meshBasicMaterial color="#c5c5c5" /></mesh>
      <group rotation={[-Math.PI / 2, 0, 0]} position={[0, .039, 0]}><Ring radius={.09} color="#737373" /><Ring radius={.068} color="#aaa" /><Stroke points={[[0, .035, .001], [0, .072, .001]]} color="#737373" /></group>
    </group>
    {[-.47, -.28].map(x => <Plate key={x} size={[.13, .10, .016]} radius={.035} position={[x, .57, .05]} rotation={[-Math.PI / 2, 0, 0]} color="#dedede" ink="#888888" />)}
    <Stroke points={[[0, -.77, .373], [0, -.72, .373]]} color="#a3a3a3" />
    {[-.56, .56].map(x => <Block key={x} size={[.14, .07, .46]} position={[x, -.97, 0]} color="#a9a9a9" ink="#858585" />)}
  </group>
}
