import * as THREE from 'three'
import { shaggyBody, shaggyLeg } from './yorkieFur'

type Point = [number, number, number]
const vector = (point: Point) => new THREE.Vector3(...point)

// A shallow, tapered lock follows the coat instead of forming a tube or spike.
export function furLock(points: Point[], width: number, depth = .012) {
  const curve = new THREE.CatmullRomCurve3(points.map(vector))
  const positions: number[] = [], indices: number[] = []
  const rows = 18, columns = 10
  for (let i = 0; i <= rows; i++) {
    const t = i / rows, center = curve.getPoint(t), tangent = curve.getTangent(t)
    const across = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 0, 1)).normalize()
    const normal = new THREE.Vector3().crossVectors(across, tangent).normalize()
    const taper = Math.pow(Math.max(.001, 1 - t), .58) * (.72 + Math.sin(Math.PI * t) * .45)
    for (let j = 0; j <= columns; j++) {
      const angle = j / columns * Math.PI * 2
      const point = center.clone().addScaledVector(across, Math.cos(angle) * width * taper).addScaledVector(normal, Math.sin(angle) * depth * taper)
      positions.push(point.x, point.y, point.z)
      if (i < rows && j < columns) {
        const a = i * (columns + 1) + j, b = a + columns + 1
        indices.push(a, b, a + 1, b, b + 1, a + 1)
      }
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices); geometry.computeVertexNormals()
  return geometry
}

export function headCoat() {
  const profile = new THREE.CatmullRomCurve3([
    new THREE.Vector3(.005, .715, .005), new THREE.Vector3(.13, .74, .10),
    new THREE.Vector3(.22, .80, .155), new THREE.Vector3(.255, .90, .18),
    new THREE.Vector3(.24, 1.01, .19), new THREE.Vector3(.18, 1.10, .13),
    new THREE.Vector3(.08, 1.145, .065), new THREE.Vector3(.001, 1.155, .001),
  ])
  const positions: number[] = [], indices: number[] = []
  const rings = 36, segments = 64
  for (let i = 0; i <= rings; i++) {
    const p = profile.getPoint(i / rings)
    for (let j = 0; j <= segments; j++) {
      const a = j / segments * Math.PI * 2
      const fringe = .012 * Math.sin(a * 9 + .6) * Math.max(0, 1 - Math.abs(p.y - .80) / .12)
      positions.push(Math.sin(a) * (p.x + fringe), p.y, .405 + Math.cos(a) * p.z)
      if (i < rings && j < segments) {
        const first = i * (segments + 1) + j, next = first + segments + 1
        indices.push(first, first + 1, next, next, first + 1, next + 1)
      }
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setIndex(indices); g.computeVertexNormals()
  return g
}

// The coat shares the torso's rounded silhouette rather than hanging as panels.
export function bodyCoat() {
  const profile = new THREE.CatmullRomCurve3([
    new THREE.Vector3(.002,.002,-.515), new THREE.Vector3(.10,.11,-.485),
    new THREE.Vector3(.20,.18,-.39), new THREE.Vector3(.223,.198,-.22),
    new THREE.Vector3(.205,.19,-.04), new THREE.Vector3(.18,.215,.14),
    new THREE.Vector3(.13,.18,.27), new THREE.Vector3(.002,.002,.345),
  ])
  const surface = (u: number, angle: number, lift = 0) => {
    const p = profile.getPoint(THREE.MathUtils.clamp(u,0,1))
    const shoulder = THREE.MathUtils.smoothstep(p.z,.08,.32)*.055
    const side = Math.sin(angle), vertical = Math.cos(angle)
    const envelope = Math.sin(Math.PI*u)**2
    const ruffle = .007*Math.sin(p.z*35+angle*7)*envelope*Math.abs(side)
    return new THREE.Vector3(side*(p.x+ruffle+lift), .435+shoulder+vertical*(p.y+ruffle+lift), p.z)
  }
  const positions: number[] = [], indices: number[] = []
  const rings = 56, segments = 56
  for (let i=0;i<=rings;i++) for (let j=0;j<=segments;j++) {
    positions.push(...surface(i/rings,j/segments*Math.PI*2).toArray())
    if(i<rings&&j<segments){const a=i*(segments+1)+j,b=a+segments+1;indices.push(a,b,a+1,b,b+1,a+1)}
  }
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals()
  return {geometry,fur:shaggyBody(surface)}
}

// Each leg and flattened paw is one continuous surface. Hind legs bend at the hock.
export function legCoat(hind: boolean) {
  const profile=new THREE.CatmullRomCurve3([
    new THREE.Vector3(.002,.009,.002),new THREE.Vector3(.055,.020,.073),
    new THREE.Vector3(.076,.055,.094),new THREE.Vector3(.071,.096,.087),
    new THREE.Vector3(.053,.145,.060),new THREE.Vector3(.051,.22,.057),
    new THREE.Vector3(hind?.088:.065,.32,hind?.093:.073),
    new THREE.Vector3(hind?.092:.070,.39,.080),new THREE.Vector3(.002,.45,.002),
  ])
  const surface = (u: number, angle: number, lift = 0) => {
    const p=profile.getPoint(THREE.MathUtils.clamp(u,0,1))
    const toe=.043*(1-THREE.MathUtils.smoothstep(p.y,.055,.18))
    const hock=hind?-.065*Math.exp(-(((p.y-.29)/.11)**2)):-.018*THREE.MathUtils.smoothstep(p.y,.15,.4)
    return new THREE.Vector3(Math.sin(angle)*(p.x+lift),p.y-.30,Math.cos(angle)*(p.z+lift)+toe+hock)
  }
  const positions: number[]=[],indices:number[]=[]
  const rings=32,segments=36
  for(let i=0;i<=rings;i++) for(let j=0;j<=segments;j++) {
    positions.push(...surface(i/rings,j/segments*Math.PI*2).toArray())
    if(i<rings&&j<segments){const a=i*(segments+1)+j,b=a+segments+1;indices.push(a,a+1,b,b,a+1,b+1)}
  }

  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals()
  return {geometry,fur:shaggyLeg(surface,hind)}
}

export function chestCoat() {
  const geometry=new THREE.SphereGeometry(1,32,24)
  geometry.scale(.145,.20,.145);geometry.translate(0,.48,.255)
  return geometry
}

export function earShape(inner = false) {
  const shape = new THREE.Shape()
  if (inner) {
    shape.moveTo(-.049, .035); shape.quadraticCurveTo(-.035, .12, .012, .212)
    shape.quadraticCurveTo(.052, .125, .054, .035); shape.quadraticCurveTo(.004, .065, -.049, .035)
  } else {
    shape.moveTo(-.087, -.025); shape.quadraticCurveTo(-.11, .09, -.018, .255)
    shape.quadraticCurveTo(.012, .30, .031, .251); shape.quadraticCurveTo(.113, .07, .083, -.025)
    shape.quadraticCurveTo(0, .012, -.087, -.025)
  }
  return new THREE.ExtrudeGeometry(shape, { depth: inner ? .008 : .035, bevelEnabled: true, bevelSize: inner ? .007 : .018, bevelThickness: .009, bevelSegments: 3, curveSegments: 16 })
}

export function hairLines(paths: Point[][]) {
  const vertices: number[] = []
  for (const path of paths) {
    const points = new THREE.CatmullRomCurve3(path.map(vector)).getPoints(24)
    for (let i = 1; i < points.length; i++) vertices.push(...points[i - 1].toArray(), ...points[i].toArray())
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  return geometry
}

export function tailCoat() {
  const points: Point[] = [[0, 0, 0], [0, .16, -.12], [.02, .36, -.12], [.04, .43, -.04]]
  return furLock(points, .070, .055)
}
