import * as THREE from 'three'

type Surface = (u: number, angle: number, lift?: number) => THREE.Vector3
const noise = (seed: number) => THREE.MathUtils.euclideanModulo(Math.sin(seed * 127.1 + 31.7) * 43758.5453, 1)

// Narrow overlapping ribbons make a soft, broken silhouette. Everything is
// merged once; each animated body part adds a single draw call for its coat.
class FurBuilder {
  private positions: number[] = []
  private shades: number[] = []
  private indices: number[] = []

  lock(path: (t: number) => THREE.Vector3, outward: (t: number) => THREE.Vector3, width: number, seed: number, fullness = 0, fibres = 4) {
    const rows = 11
    for (let fibre = 0; fibre < fibres; fibre++) {
      const start = this.positions.length / 3
      const offset = (fibre + .5) / fibres * 2 - 1
      const end = .80 + noise(seed + fibre * 17) * .20
      const shade = (noise(seed * 3 + fibre * 5) - .5) * .075
      for (let row = 0; row <= rows; row++) {
        const t = row / rows, s = t * end
        const center = path(s), normal = outward(s).normalize()
        const tangent = path(Math.min(1, s + .002)).sub(path(Math.max(0, s - .002))).normalize()
        const across = new THREE.Vector3().crossVectors(tangent, normal).normalize()
        const taper = Math.pow(Math.max(.001, 1 - t), .62 - fullness * .30)
        const spread = width * (.72 + .28 * Math.sin(Math.PI * t))
        const wander = Math.sin(t * 5 + seed) * .0025 * Math.sin(Math.PI * t)
        for (let col = 0; col < 3; col++) {
          const p = center.clone()
            .addScaledVector(across, (offset * spread + wander) * (1 - t * .24) + (col - 1) * width / fibres * (.94 + fullness * .42) * taper)
            .addScaledVector(normal, (col === 1 ? .0017 : 0) * taper)
          this.positions.push(p.x, p.y, p.z)
          this.shades.push(shade + (col === 1 ? .014 : -.006))
          if (row < rows && col < 2) {
            const a = start + row * 3 + col, b = a + 3
            this.indices.push(a, b, a + 1, b, b + 1, a + 1)
          }
        }
      }
    }
  }

  finish() {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3))
    geometry.setAttribute('furShade', new THREE.Float32BufferAttribute(this.shades, 1))
    geometry.setIndex(this.indices)
    geometry.computeVertexNormals()
    return geometry
  }
}

export function shaggyBody(surface: Surface) {
  const fur = new FurBuilder()
  // Staggered roots cover the shoulder, back and flanks evenly. A close,
  // overlapping foundation fills the gaps behind the longer, separated tips.
  for (const undercoat of [true, false]) {
    const columns = undercoat ? 20 : 31, rows = undercoat ? 3 : 6
    for (const side of [-1, 1]) for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
      const seed = row * columns + col + (side > 0 ? 803 : 11) + (undercoat ? 3601 : 0)
      const u = .075 + (col + .18 + noise(seed) * .50 + (row % 2) * .28) / columns * .86
      const root = .025 + (row + noise(seed + 23) * .66) / rows * 1.48
      const length = undercoat ? .84 + noise(seed + 45) * .24 : .86 + noise(seed + 45) * .65
      const angle = (t: number) => side * (root + t * length)
      const drift = .030 + noise(seed + 65) * .042
      fur.lock(t => {
        const a = angle(t)
        const lift = undercoat ? .003 + Math.sin(Math.PI * t) * .006 : .006 + Math.sin(Math.PI * t) * .014
        const p = surface(u - drift * t, a, lift)
        // Hair hangs away from the ribs after it passes the side of the body.
        const free = THREE.MathUtils.smoothstep(Math.abs(a), 1.32, 2.25)
        p.x += side * free * (undercoat ? .025 : .026 + noise(seed + 17) * .030)
        p.y -= free * (undercoat ? .030 + noise(seed + 18) * .015 : .035 + noise(seed + 18) * .065)
        p.z += Math.sin(t * 4 + seed) * .007 * t
        return p
      }, t => new THREE.Vector3(Math.sin(angle(t)), Math.cos(angle(t)) * .65, -.08),
      undercoat ? .022 : .013 + noise(seed + 9) * .012, seed, undercoat ? .8 : .10, undercoat ? 2 : 4)
    }
  }
  return fur.finish()
}

export function shaggyLeg(surface: Surface, hind: boolean) {
  const fur = new FurBuilder()
  for (let i = 0; i < 66; i++) {
    const seed = i + (hind ? 1501 : 1901)
    const root = .44 + noise(seed) * .44
    const length = .25 + noise(seed + 5) * .25
    const a = noise(seed + 9) * Math.PI * 2
    fur.lock(t => {
      const p = surface(Math.max(.15, root - length * t), a + Math.sin(t * 3 + seed) * .07, .003 + .009 * Math.sin(Math.PI * t))
      const free = t * t
      p.x += Math.sin(a) * .012 * free
      p.z += Math.cos(a) * .012 * free
      p.y -= .018 * free
      return p
    }, () => new THREE.Vector3(Math.sin(a), .12, Math.cos(a)), .009 + noise(seed + 15) * .007, seed)
  }
  return fur.finish()
}

export function shaggyChest() {
  const fur = new FurBuilder()
  for (let i = 0; i < 74; i++) {
    const seed = i + 2203, angle = (noise(seed) - .5) * Math.PI * 1.7
    const root = .24 + noise(seed + 7) * .98
    fur.lock(t => {
      const a = root + t * (1.0 + noise(seed + 12) * .5)
      const radius = Math.sin(Math.min(a, Math.PI - .2))
      const free = THREE.MathUtils.smoothstep(a, 1.4, 2.65)
      return new THREE.Vector3(
        Math.sin(angle) * (.149 * radius + free * .018),
        .48 + Math.cos(a) * .20 - free * (.025 + noise(seed + 8) * .035),
        .255 + Math.cos(angle) * (.149 * radius + free * .025),
      )
    }, () => new THREE.Vector3(Math.sin(angle), .1, Math.cos(angle)), .011 + noise(seed + 4) * .008, seed)
  }
  return fur.finish()
}

export function shaggyTail() {
  const fur = new FurBuilder()
  const curve = new THREE.CatmullRomCurve3([[0,0,0],[0,.16,-.12],[.02,.36,-.12],[.04,.43,-.04]].map(p => new THREE.Vector3(...p)))
  for (let i = 0; i < 66; i++) {
    const seed = i + 2801, root = noise(seed) * .74, a = noise(seed + 6) * Math.PI * 2
    const normal = new THREE.Vector3(Math.sin(a), 0, Math.cos(a))
    fur.lock(t => {
      const u = Math.min(.995, root + t * (.19 + noise(seed + 7) * .22))
      const p = curve.getPoint(u)
      const radius = .052 * Math.pow(1 - u, .6) + .018 * Math.sin(Math.PI * t)
      return p.addScaledVector(normal, radius)
    }, () => normal.clone(), .010 + noise(seed + 2) * .006, seed)
  }
  return fur.finish()
}
