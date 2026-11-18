'use client'

import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { Raycaster, Vector2 } from 'three'
import type { Object3D } from 'three'
import type { Destination } from './model'
import { listenForOutsideTap } from './outsideTap'

export function FocusDismiss({ focus, onDismiss }: { focus: Destination | 'tifa' | null; onDismiss: () => void }) {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    if (!focus) return
    const raycaster = new Raycaster(), pointer = new Vector2()
    raycaster.params.Line!.threshold = .01
    const inside = (x: number, y: number) => {
      const rect = gl.domElement.getBoundingClientRect()
      if (!rect.width || !rect.height) return true
      pointer.set((x - rect.left) / rect.width * 2 - 1, -(y - rect.top) / rect.height * 2 + 1)
      const objects: Object3D[] = []
      scene.traverse(object => { if (object.userData.deskFocus === focus) objects.push(object) })
      scene.updateMatrixWorld(true)
      camera.updateMatrixWorld()
      raycaster.setFromCamera(pointer, camera)
      return raycaster.intersectObjects(objects, true).length > 0
    }
    return listenForOutsideTap(gl.domElement, window, inside, onDismiss)
  }, [gl, scene, camera, focus, onDismiss])
  return null
}
