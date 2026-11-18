import { BufferGeometry, Float32BufferAttribute, Group, Matrix4, Mesh, MeshBasicMaterial, Vector3 } from 'three'
import type { MeshBasicMaterialParameters } from 'three'
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'

// Bake only rigid, untextured pieces. Moving objects and interactive surfaces
// stay separate. Matching materials share a draw without removing any detail.
export function createStaticModel() {
  const solids = new Map<string, { positions: number[]; material: MeshBasicMaterialParameters }>()
  const outlines = new Map<string, number[]>()
  const point = new Vector3()
  const mesh = (geometry: BufferGeometry, material: MeshBasicMaterialParameters, transform: Matrix4) => {
    const key = JSON.stringify(material)
    if (!solids.has(key)) solids.set(key, { positions: [], material })
    const positions = solids.get(key)!.positions, source = geometry.getAttribute('position')
    const count = geometry.index?.count ?? source.count
    for (let i = 0; i < count; i++) {
      const index = geometry.index ? geometry.index.getX(i) : i
      point.fromBufferAttribute(source, index).applyMatrix4(transform)
      positions.push(point.x, point.y, point.z)
    }
    geometry.dispose()
  }
  const line = (points: readonly number[][], color: string, transform: Matrix4, segments = false) => {
    if (!outlines.has(color)) outlines.set(color, [])
    const positions = outlines.get(color)!
    for (let i = 0; i + 1 < points.length; i += segments ? 2 : 1) {
      for (const index of [i, i + 1]) {
        point.fromArray(points[index]).applyMatrix4(transform)
        positions.push(point.x, point.y, point.z)
      }
    }
  }
  return { mesh, line, finish: () => {
    const group = new Group()
    for (const { positions, material } of solids.values()) {
      const geometry = new BufferGeometry().setAttribute('position', new Float32BufferAttribute(positions, 3))
      geometry.computeBoundingSphere()
      group.add(new Mesh(geometry, new MeshBasicMaterial(material)))
    }
    for (const [color, positions] of outlines) {
      const geometry = new LineSegmentsGeometry().setPositions(positions)
      const outline = new LineSegments2(geometry, new LineMaterial({ color, linewidth: 1 }))
      // These outlines, like drei's Edges, do not intercept pointer targets.
      outline.raycast = () => undefined
      group.add(outline)
    }
    return group
  } }
}

export function disposeStaticModel(group: Group) {
  group.traverse(object => {
    if (!(object instanceof Mesh)) return
    object.geometry.dispose()
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose()
  })
}
