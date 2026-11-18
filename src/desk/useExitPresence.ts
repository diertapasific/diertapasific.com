'use client'

import { useEffect, useState } from 'react'

// Keep only the closing UI mounted; route/camera movement starts immediately.
export function useExitPresence(open: boolean, duration = 180) {
  const [retained, setRetained] = useState(open)
  useEffect(() => {
    if (open) { setRetained(true); return }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setRetained(false); return }
    const timer = window.setTimeout(() => setRetained(false), duration)
    return () => window.clearTimeout(timer)
  }, [open, duration])
  return open || retained
}
