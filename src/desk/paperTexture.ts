import { CanvasTexture, LinearFilter, SRGBColorSpace } from 'three'

// Capture the laid-out text for the brief WebGL page turn. Reading always uses
// live HTML; the texture preserves the exact wrapping and scroll position while
// the sheet bends. No external image service or HTML screenshot library needed.
export function paperTexture(root: HTMLElement, page = { width: 1.22, height: 1.56, contentWidth: 1.22, contentHeight: 1.56, offsetX: 0 }) {
  const scaleX = root.offsetWidth / page.contentWidth, scaleY = root.offsetHeight / page.contentHeight
  const width = page.width * scaleX, height = page.height * scaleY
  const canvas = document.createElement('canvas'), ratio = 2
  canvas.width = Math.ceil(width * ratio); canvas.height = Math.ceil(height * ratio)
  const c = canvas.getContext('2d')!
  c.scale(ratio, ratio); c.fillStyle = '#f8f8f8'; c.fillRect(0, 0, width, height)
  c.translate(((page.width - page.contentWidth) / 2 + page.offsetX) * scaleX, (page.height - page.contentHeight) * scaleY / 2)
  const bounds = root.getBoundingClientRect()
  const rect = (r: DOMRect) => ({ x: r.x - bounds.x, y: r.y - bounds.y, width: r.width, height: r.height })
  const range = document.createRange()
  function paint(element: Element) {
    const style = getComputedStyle(element), r = rect(element.getBoundingClientRect())
    if (!r.width || !r.height || r.y > root.offsetHeight || r.y + r.height < 0) return
    c.save()
    if (element === root || /(hidden|auto|scroll)/.test(`${style.overflowX} ${style.overflowY}`)) {
      c.beginPath(); c.rect(r.x, r.y, r.width, r.height); c.clip()
    }
    const fragments = style.display === 'inline' ? Array.from(element.getClientRects(), rect) : [r]
    for (const fragment of fragments) {
      const { x, y, width: w, height: h } = fragment
      if (style.backgroundColor !== 'rgba(0, 0, 0, 0)') { c.fillStyle = style.backgroundColor; c.fillRect(x, y, w, h) }
      for (const [side, bx, by, bw, bh] of [
        ['Top', x, y, w, parseFloat(style.borderTopWidth)],
        ['Bottom', x, y + h - parseFloat(style.borderBottomWidth), w, parseFloat(style.borderBottomWidth)],
        ['Left', x, y, parseFloat(style.borderLeftWidth), h],
        ['Right', x + w - parseFloat(style.borderRightWidth), y, parseFloat(style.borderRightWidth), h],
      ] as const) {
        c.fillStyle = style[`border${side}Color`]; if (bw && bh) c.fillRect(bx, by, bw, bh)
      }
    }
    if (element instanceof HTMLCanvasElement) c.drawImage(element, r.x, r.y, r.width, r.height)
    for (const child of element.childNodes) {
      if (child instanceof Element) { if (!(child instanceof SVGElement)) paint(child); continue }
      if (child.nodeType !== Node.TEXT_NODE || !child.textContent?.trim()) continue
      c.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
      ;(c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = style.letterSpacing === 'normal' ? '0px' : style.letterSpacing
      c.fillStyle = style.color; c.textBaseline = 'alphabetic'
      const ascent = c.measureText('Mg').fontBoundingBoxAscent || parseFloat(style.fontSize)
      const text = style.textTransform === 'uppercase' ? child.textContent.toUpperCase() : child.textContent
      for (const match of text.matchAll(/\S+/g)) {
        range.setStart(child, match.index!); range.setEnd(child, match.index! + match[0].length)
        if (range.getClientRects().length <= 1) {
          const word = rect(range.getBoundingClientRect())
          c.fillText(match[0], word.x, word.y + ascent)
        } else {
          // A hyphenated word can occupy two lines. Its union rectangle starts
          // at the left margin, so drawing the whole word there overlaps text.
          // Register each glyph only for these split words.
          let offset = match.index!
          for (const character of match[0]) {
            range.setStart(child, offset); offset += character.length; range.setEnd(child, offset)
            const glyph = rect(range.getBoundingClientRect())
            c.fillText(character, glyph.x, glyph.y + ascent)
          }
        }
      }
    }
    c.restore()
  }
  paint(root)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace; texture.minFilter = LinearFilter; texture.generateMipmaps = false; texture.anisotropy = 4
  return texture
}
