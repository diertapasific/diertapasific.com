'use client'

import { Analytics } from '@vercel/analytics/react'
import { publicPageView } from './analytics'

export function SiteAnalytics() {
  if (!import.meta.env.PROD) return null
  return <Analytics beforeSend={publicPageView} debug={false} />
}
