'use client'

import { memo, useEffect, useMemo } from 'react'
import { DoubleSide } from 'three'
import { Plate, Stroke } from './geometry'
import { createLanyardGeometry } from './lanyardShape'

export const BadgeLanyard = memo(function BadgeLanyard() {
  const ribbon = useMemo(createLanyardGeometry, [])
  useEffect(() => () => ribbon.geometry.dispose(), [ribbon])
  return <group name="badge-lanyard">
    <mesh geometry={ribbon.geometry}><meshBasicMaterial color="#dddddd" side={DoubleSide} /></mesh>
    {ribbon.edges.map((points, index) => <Stroke key={index} points={points} color="#858585" width={.7} />)}
    <Plate size={[.10, .13, .017]} radius={.025} position={[0, .455, .017]} color="#c9c9c9" ink="#777777" />
    <Plate size={[.045, .065, .019]} radius={.012} position={[0, .455, .018]} color="#f6f6f6" ink="#9b9b9b" />
    <Stroke points={[[-.032, .425, .03], [.032, .425, .03]]} color="#777777" width={.7} />
  </group>
})
