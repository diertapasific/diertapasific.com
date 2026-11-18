import { useSyncExternalStore } from 'react'

const subscribe = (change: () => void) => {
  document.addEventListener('visibilitychange', change)
  return () => document.removeEventListener('visibilitychange', change)
}
const visible = () => !document.hidden

// Keep graphics resources ready, but do no animation work in a hidden tab.
export const useBrowserVisible = () => useSyncExternalStore(subscribe, visible, () => true)
