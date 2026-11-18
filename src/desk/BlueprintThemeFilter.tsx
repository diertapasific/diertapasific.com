// One ink transfer covers WebGL, live HTML, and the captured folding pages.
// Applying the same palette after composition keeps their boundaries aligned.
export function BlueprintThemeFilter() {
  return <svg width="0" height="0" aria-hidden="true" focusable="false" className="pointer-events-none absolute">
    <defs><filter id="blueprint-dark-theme" colorInterpolationFilters="sRGB">
      <feColorMatrix type="saturate" values="0" />
      <feComponentTransfer>
        <feFuncR type="table" tableValues="0.94 0.86 0.70 0.48 0.25 0.065" />
        <feFuncG type="table" tableValues="0.95 0.87 0.71 0.49 0.26 0.073" />
        <feFuncB type="table" tableValues="0.96 0.88 0.72 0.50 0.27 0.082" />
      </feComponentTransfer>
    </filter></defs>
  </svg>
}
