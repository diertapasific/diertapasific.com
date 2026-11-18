import * as THREE from 'three'

type Point = [number, number, number]
type Lock = { points: Point[]; width: number; normal: Point; shade?: number; depth?: number; seed?: number }
const noise = (n: number) => { const x = Math.sin(n * 127.1 + 31.7) * 43758.5453; return x - Math.floor(x) }

/** A coat is a single merged surface of overlapping, tapered locks.
 * Their shallow ridges carry the fur direction without hundreds of separate meshes. */
export class CoatBuilder {
  private positions: number[] = []
  private colors: number[] = []
  private indices: number[] = []
  private lines: number[] = []

  lock({ points, width, normal, shade = .79, depth = .019, seed = 0 }: Lock) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)))
    const outward = new THREE.Vector3(...normal).normalize(), across = new THREE.Vector3()
    const rows = 9
    const sample = (t: number, u: number) => {
      const center = curve.getPoint(t), tangent = curve.getTangent(t)
      across.crossVectors(tangent, outward).normalize()
      // Broad roots nest into the coat; ends narrow gradually into wisps.
      const taper = (.48 + .52 * Math.sin(Math.PI * Math.min(1, t * 1.25))) * Math.pow(1 - t, .58)
      const ridge = Math.pow(Math.max(0, 1 - u * u), .65)
      const channel = 1 - .11 * Math.cos(u * Math.PI * 5 + t * 1.4)
      return center.addScaledVector(across, u * width * taper).addScaledVector(outward, depth * ridge * Math.sin(Math.PI * t) * channel)
    }
    const fibres = Math.max(5, Math.round(width / .0035))
    for (let fibre = 0; fibre < fibres; fibre++) {
      const u = (fibre + .5) / fibres * 2 - 1, offset = this.positions.length / 3
      const shadeShift = (noise(seed * 37 + fibre * 7) - .5) * .12
      const end = .86 + noise(seed + fibre * 19) * .14
      for (let row = 0; row <= rows; row++) {
        const t = row / rows * end
        for (let col = 0; col < 3; col++) {
          const spread = .80 / fibres * (col - 1), p = sample(t, u + spread)
          this.positions.push(p.x, p.y, p.z)
          const value = Math.min(.97, shade + shadeShift + .045 * (1 - Math.abs(u)) + (col === 1 ? .018 : -.008))
          const color = new THREE.Color().setRGB(value, value, value, THREE.SRGBColorSpace)
          this.colors.push(color.r, color.g, color.b)
          if (row && col) { const b = offset + row * 3 + col; this.indices.push(b, b - 1, b - 3, b - 1, b - 4, b - 3) }
        }
      }
    }
  }

  finish() {
    const surface = new THREE.BufferGeometry()
    surface.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3))
    surface.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3))
    surface.setIndex(this.indices); surface.computeVertexNormals()
    const strands = new THREE.BufferGeometry()
    strands.setAttribute('position', new THREE.Float32BufferAttribute(this.lines, 3))
    return { surface, strands }
  }
}

export function bodyCoat() {
  const positions: number[] = [], colors: number[] = [], indices: number[] = [], lines: number[] = []
  const rows = 110, columns = 80
  // A single flowing coat. Fine furrows travel from the part down the flanks;
  // no separate plates, leaves, or disconnected strands on the torso.
  const sample = (u: number, angle: number) => {
    const end = Math.pow(Math.max(0, Math.sin(Math.PI * u)), .42)
    const side = Math.sin(angle), top = Math.cos(angle)
    const flow = u * 86 + .38 * Math.sin(angle * 1.7 + u * 7) + .15 * Math.sin(angle * 4 - u * 13)
    const ridge = Math.sin(flow * Math.PI * 2) * .0045 + Math.sin(flow * Math.PI * 4 + .7) * .0018
    const loose = Math.sin(u * 61 + Math.sin(u * 29) * 2) * .007
    const spread = .275 * end + ridge
    const y = .49 + .26 * top * end + ridge * top - Math.pow(Math.max(0, -top), .6) * (.065 + loose)
    return { p: new THREE.Vector3(side * spread, y, -.66 + u * 1.04 + .018 * Math.sin(angle * 1.7) * end), ridge, top, flow }
  }
  for (let row = 0; row <= rows; row++) {
    const u = row / rows
    for (let col = 0; col <= columns; col++) {
      const angle = col / columns * Math.PI * 2, { p, ridge, top } = sample(u, angle)
      positions.push(p.x, p.y, p.z)
      const value = .76 + .12 * Math.max(0, top) + ridge * 7 + .018 * Math.sin(u * 21)
      const color = new THREE.Color().setRGB(value, value, value, THREE.SRGBColorSpace)
      colors.push(color.r, color.g, color.b)
      if (row && col) { const b = row * (columns + 1) + col; indices.push(b, b - 1, b - columns - 1, b - 1, b - columns - 2, b - columns - 1) }
    }
  }
  // Fine overlapping locks stay close to the ribs and fall freely at their tips.
  // Width is in hair bundles, not broad plates; the dense undercoat fills the gaps.
  for (const side of [-1, 1]) for (let i = 0; i < 640; i++) {
    const u = .025 + noise(i * 3 + 2) * .95, root = noise(i + 8) * 1.05
    const end = Math.pow(Math.sin(Math.PI * u), .42), z = -.66 + u * 1.04
    const tipY = .20 + noise(i + 301) * .15 + (1 - end) * .22
    const wave = noise(i + 91) * Math.PI * 2, width = .0021 + noise(i + 65) * .0018
    const start = positions.length / 3, segments = 13
    let previous: THREE.Vector3 | undefined
    for (let j = 0; j <= segments; j++) {
      const t = j / segments, a = root + t * (1.78 - root), free = Math.max(0, (t - .68) / .32)
      const x = side * ((.278 * Math.sin(Math.min(a, 1.62)) + .009 * Math.sin(t * 5 + wave) * Math.sin(t * Math.PI)) * end + free * free * (.010 + noise(i + 82) * .012))
      const y = (.49 + .26 * Math.cos(a) * end) * (1 - free) + tipY * free
      const drift = Math.sin(t * 3.8 + wave) * .008 * t + t * (.014 + noise(i + 81) * .018)
      const center = new THREE.Vector3(x, y, z - drift), w = width * Math.pow(1 - t, .45)
      for (let col = 0; col < 3; col++) {
        positions.push(x + side * (col === 1 ? .0016 : 0), y, center.z + (col - 1) * w)
        const value = .71 + noise(i + 11) * .19 + .045 * Math.max(0, Math.cos(a)) + (col === 1 ? .02 : -.015)
        const color = new THREE.Color().setRGB(value, value, value, THREE.SRGBColorSpace)
        colors.push(color.r, color.g, color.b)
        if (j && col) { const b = start + j * 3 + col; indices.push(b, b - 1, b - 3, b - 1, b - 4, b - 3) }
      }
      if (i % 5 === 0 && previous) lines.push(previous.x, previous.y, previous.z, center.x + side * .002, center.y, center.z)
      previous = center
    }
  }
  const surface = new THREE.BufferGeometry(), strands = new THREE.BufferGeometry()
  surface.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); surface.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); surface.setIndex(indices); surface.computeVertexNormals()
  strands.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3))
  return { surface, strands }
}

export function chestCoat() {
  const coat = new CoatBuilder()
  // Full chest ruff bridges the shoulder and neck.
  for (let row = 0; row < 3; row++) for (let i = 0; i < 12; i++) {
    const a = i / 11 * Math.PI * 1.5 - Math.PI * .75, y = .85 - row * .14
    const x = Math.sin(a) * .19, z = .30 + Math.cos(a) * .19
    coat.lock({ points: [[x, y, z], [x * 1.17, y - .12, z + .045], [x * 1.20, y - .25, z + .03], [x * 1.08, y - .32 - noise(i) * .05, z]], width: .058, normal: [Math.sin(a), .1, Math.cos(a)], shade: .85, seed: i + row * 19 })
  }
  return coat.finish()
}

export function faceCoat() {
  const coat = new CoatBuilder()
  // Side curtains follow the centre part, leaving clear eye sockets and muzzle.
  for (const side of [-1, 1]) {
    for (let row = 0; row < 2; row++) for (let i = 0; i < 10; i++) {
      const a = i / 9 * 2.3 - .65, rootX = side * (.03 + row * .08), rootY = 1.17 - row * .11
      const z = .44 + Math.sin(a) * .16, reach = .22 + .025 * noise(i + row)
      coat.lock({ points: [[rootX, rootY, z], [side * .19, rootY - .055, z + .045], [side * .265, rootY - .17, z + .065], [side * reach, rootY - .32 - noise(i + 8) * .10, z + .055]], width: .052, normal: [side * .65, .25, Math.sin(a) * .6], shade: .87 + noise(i) * .04, seed: i + row * 29 })
    }
    // Swept eyebrows finish above the eyes rather than hiding them.
    for (let i = 0; i < 7; i++) {
      const x = side * (.018 + i * .022)
      coat.lock({ points: [[x, 1.16 - i * .006, .55], [x + side * .025, 1.12, .61], [side * (.10 + i * .017), 1.06, .667], [side * (.14 + i * .013), 1.015 - i * .006, .664]], width: .026, normal: [side * .15, .3, 1], shade: .89, depth: .013, seed: i })
    }
    // Moustache flares from a short muzzle; the beard hangs below the jaw.
    for (let row = 0; row < 2; row++) for (let i = 0; i < 7; i++) {
      const x = side * (.018 + i * .013), y = .914 - row * .037, z = .799 - i * .004
      coat.lock({ points: [[x, y, z], [side * (.10 + i * .01), y - .04, z + .012], [side * (.15 + i * .008), y - .15, z - .014], [side * (.12 + i * .01), .65 - noise(i + row) * .05, z - .075]], width: .037, normal: [side * .35, .05, 1], shade: .87 + noise(i) * .045, depth: .013, seed: i + row * 11 })
    }
  }
  for (let i = 0; i < 11; i++) {
    const x = (i / 10 - .5) * .20
    coat.lock({ points: [[x, .84, .742], [x * 1.1, .76, .76], [x * .95, .65, .725], [x * .75, .59 + Math.abs(x) * .60 + noise(i) * .04, .68]], width: .034, normal: [0, 0, 1], shade: .83, seed: i })
  }
  const result = coat.finish()
  result.surface.translate(0, -.75, -.32); result.strands.translate(0, -.75, -.32)
  return result
}

export function legCoat(seed: number) {
  const coat = new CoatBuilder()
  for (let row = 0; row < 2; row++) for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2, x = Math.sin(a) * .075, z = Math.cos(a) * .075, y = -.02 - row * .12
    coat.lock({ points: [[x, y, z], [x * 1.16, y - .07, z * 1.16], [x * 1.2, y - .14, z * 1.2 + .008], [x * 1.1, Math.max(-.30, y - .21 - noise(i + seed) * .025), z * 1.1 + .016]], normal: [Math.sin(a), 0, Math.cos(a)], width: .025, depth: .008, shade: .87, seed: seed + i })
  }
  return coat.finish()
}

export function tailCoat() {
  const coat = new CoatBuilder()
  for (let row = 0; row < 5; row++) for (let i = 0; i < 9; i++) {
    const t = row / 5, a = i / 9 * Math.PI * 2, x = Math.sin(a) * .035, y = t * .31, z = -Math.sin(t * 1.8) * .18 + Math.cos(a) * .04
    coat.lock({ points: [[x, y, z], [x * 1.9, y + .08, z - .025], [x * 1.8, y + .15, z - .015], [x * .9, y + .20, z + .022]], width: .026, normal: [Math.sin(a), 0, Math.cos(a)], shade: .77, seed: i + row * 9 })
  }
  return coat.finish()
}

export function earCoat() {
  const coat = new CoatBuilder()
  // Short feathering follows the ear rim, with longer hair where it meets the head.
  for (const side of [-1, 1]) for (let i = 0; i < 23; i++) {
    const t = i / 23, y = t * .285
    const edge = side < 0 ? -.095 + .11 * t : .10 - .045 * t
    const length = .024 + (1 - t) * .035 + noise(i + 82) * .013
    coat.lock({ points: [[edge - side * .019, y, .052], [edge - side * .006, y + length * .32, .058], [edge + side * .012, y + length * .70, .055], [edge + side * .021 * (1 - t), y + length, .049]], width: .013, depth: .004, normal: [side * .25, .15, 1], shade: .85 + noise(i) * .06, seed: i + side * 32 })
  }
  for (let row = 0; row < 3; row++) for (let i = 0; i < 12; i++) {
    const x = -.080 + i / 11 * .167, y = row * .030
    coat.lock({ points: [[x, y, .059], [x * .94, y + .028, .067], [x * .87 + .008, y + .06, .065], [x * .77 + .016, y + .08 + noise(i) * .025, .061]], width: .012, depth: .003, normal: [0, 0, 1], shade: .88, seed: i + row * 17 })
  }
  return coat.finish()
}
