import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { SiteAnalytics } from './SiteAnalytics'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <SiteAnalytics />
  </StrictMode>,
)
