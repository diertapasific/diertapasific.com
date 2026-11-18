import editions from '../src/desk/data/medium-articles.json' with { type: 'json' }
import type { TifaArticle } from './tifaContext.mjs'

const topics: Record<string, { name: string; questions: string[] }> = {
  '01': { name: 'Beacon', questions: ['How does Beacon generate lessons?', 'How does spaced repetition work in Beacon?', 'What tech does Beacon use?', 'Why did Dipa build Beacon?'] },
  '02': { name: 'SumTube', questions: ['Which model does SumTube use?', 'How does SumTube handle long videos?', 'How does SumTube export PDFs?', 'Why did Dipa build SumTube?'] },
  '03': { name: 'Cardify', questions: ['Why does Cardify use two prompts?', 'How does Cardify split PDFs?', 'How are Cardify flashcards formatted?', 'What might Dipa add to Cardify?'] },
  '04': { name: 'Rupcara', questions: ['How does Rupcara handle non-banknote photos?', 'Which model does Rupcara use?', 'How was Rupcara trained?', 'How does Rupcara speak the result?'] },
  chatdp: { name: 'ChatDP', questions: ['Which model did the original ChatDP use?', 'How did ChatDP match questions?', 'Why did ChatDP use ONNX?'] },
  'mobile-development': { name: 'mobile app development', questions: ['What does Dipa say about native mobile apps?', 'Which mobile tools does his article cover?'] },
}

// The full, author-owned text editions also power the physical desk readers.
// This collection is imported only by the server and the Worker.
export const tifaArticles: TifaArticle[] = Object.entries(editions).map(([id, article]) => {
  const topic = topics[id]
  const project = ['01', '02', '03', '04'].includes(id)
  return {
    id, title: article.title, publishedAt: article.publishedAt, markdown: article.markdown,
    terms: [topic.name, article.title, ...(id === 'mobile-development' ? ['mobile development', 'native mobile apps', 'cross platform'] : [])],
    sources: project ? [{ label: `${topic.name} · Medium article`, destination: 'projects', projectId: id, articleId: id }] : [{ label: `${topic.name} · writing`, destination: 'writing' }],
    followups: topic.questions,
  }
})
