/// <reference types="vite/client" />

declare module 'virtual:medium-editions' {
  const editions: Record<string, { title: string; author: string; publishedAt: string; url: string; firstHeading: string; html: string; bodyHtml: string }>
  export default editions
}
