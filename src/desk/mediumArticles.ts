import articles from 'virtual:medium-editions'

export type MediumArticle = { title: string; author: string; publishedAt: string; url: string; firstHeading: string; html: string; bodyHtml: string }
export const mediumArticles: Record<string, MediumArticle> = articles

export function findMediumArticle(url: string): MediumArticle | undefined {
  const canonical = url.split(/[?#]/)[0].replace(/\/$/, '')
  return Object.values(mediumArticles).find(article => article.url === canonical)
}
