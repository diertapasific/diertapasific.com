export const systemThemeQuery = '(prefers-color-scheme: dark)'

// Start from the current browser preference and follow later system changes.
// A manual toggle lasts until that preference changes or the page reloads.
export function followSystemTheme(media: MediaQueryList, update: (dark: boolean) => void) {
  const change = () => update(media.matches)
  media.addEventListener('change', change)
  change()
  return () => media.removeEventListener('change', change)
}
