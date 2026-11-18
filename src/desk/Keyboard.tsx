'use client'

import { memo, useEffect, useMemo } from 'react'
import { BoxGeometry, EdgesGeometry, Euler, ExtrudeGeometry, Matrix4, RingGeometry, Vector3 } from 'three'
import type { Point } from './model'
import { roundedPath } from './geometry'
import { keyboardPosition } from './motion'
import { createStaticModel, disposeStaticModel } from './staticModel'

const transform = (position: Point = [0, 0, 0], rotation: Point = [0, 0, 0]) => new Matrix4().makeRotationFromEuler(new Euler(...rotation)).setPosition(...position)

function makeKeyboard() {
  const model = createStaticModel()
  const plate = (size: Point, radius: number, matrix: Matrix4, color: string, ink: string) => {
    const shape = roundedPath(size[0], size[1], radius)
    model.mesh(new ExtrudeGeometry(shape, { depth: size[2], bevelEnabled: false, curveSegments: 8 }), { color, polygonOffset: true, polygonOffsetFactor: 1 }, matrix.clone().multiply(transform([0, 0, -size[2] / 2])))
    const outline = shape.getPoints(8)
    model.line(outline.map(p => [p.x, p.y, size[2] / 2 + .001]), ink, matrix)
    model.line(outline.map(p => [p.x, p.y, -size[2] / 2]), ink, matrix)
  }
  plate([2.19, .96, .055], .065, transform([0, 0, 0], [-Math.PI / 2, 0, 0]), '#e9e9e9', '#606060')
  const back = new BoxGeometry(1.98, .075, .11), edges = new EdgesGeometry(back, 25), edge = new Vector3()
  const backMatrix = transform([0, -.005, -.39])
  model.line(Array.from({ length: edges.attributes.position.count }, (_, i) => edge.fromBufferAttribute(edges.attributes.position, i).toArray()), '#969696', backMatrix, true)
  edges.dispose()
  model.mesh(back, { color: '#f6f6f6', polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }, backMatrix)
  const rows = [
    [.9, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5],
    [1.35, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.15],
    [1.6, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.9],
    [2, 1, 1, 1, 1, 1, 1, 1, 1, 2.5],
    [1, 1, 1.1, 1.2, 4.3, 1.1, 1, 1, 1, 1],
  ]
  rows.forEach((row, r) => {
    const total = row.reduce((sum, w) => sum + w, 0); let start = -.99
    row.forEach((units, i) => {
      const width = units / total * 1.98 - .025, x = start + width / 2; start += width + .025
      const matrix = transform([x, .039, -.365 + r * .143], [-Math.PI / 2, 0, 0])
      plate([width, r === 0 ? .09 : .118, .012], .024, matrix, '#f8f8f8', '#888888')
      if (r > 0 && units < 1.2) model.mesh(new RingGeometry(.029, .031, 18), { color: '#d1d1d1' }, matrix.clone().multiply(transform([0, 0, .007])))
      if (r === 5 && i >= 8) model.line([[-width / 2 + .012, 0, .008], [width / 2 - .012, 0, .008]], '#aaa', matrix)
    })
  })
  return model.finish()
}

export const Keyboard = memo(function Keyboard() {
  const model = useMemo(makeKeyboard, [])
  useEffect(() => () => disposeStaticModel(model), [model])
  return <group name="keyboard" position={keyboardPosition} rotation={[-.055, 0, 0]}><primitive object={model} dispose={null} /></group>
})
