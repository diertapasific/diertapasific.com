import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import ts from 'typescript'
import { selectTifaContext, suggestQuestions, compactTifaHistory, MAX_ARTICLE_CHARS, MAX_NOTE_CHARS } from '../server/tifaContext.mjs'
import { handleTifa, publicAnswer, systemPrompt } from '../server/tifa.mjs'

const editions = JSON.parse(await fs.readFile(new URL('../src/desk/data/medium-articles.json', import.meta.url)))
const articleSource = await fs.readFile(new URL('../server/tifaArticles.ts', import.meta.url), 'utf8')
const code = ts.transpileModule(articleSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText
  .replace(/import editions from [^\n]+/, `const editions = ${JSON.stringify(editions)};`)
const { tifaArticles } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
const notes = [
  { id: 'about', terms: ['who is dipa'], answer: 'Dipa is an engineer in Jakarta.', sources: [] },
  { id: 'current-work', terms: ['work', 'current role'], answer: 'Dipa is a Jr Forward Deployed Engineer at Staffinc.', sources: [] },
  { id: 'education', terms: ['education', 'study'], answer: 'Dipa studied Computer Science at BINUS.', sources: [] },
  ...['01','02','03','04','08'].map((id, i) => ({ id: `project:${id}`, terms: [['Beacon','SumTube','Cardify','Rupcara','VeganFuel'][i]], answer: 'A short project overview.', sources: [{ label: 'project', destination: 'projects', projectId: id }], followups: ['Tell me more', 'Show me his projects'] })),
]
const user = content => ({ role: 'user', content })

test('all six full editions are available, including technical details omitted from summaries', () => {
  assert.equal(tifaArticles.length, 6)
  const context = selectTifaContext([user('How did Rupcara handle non-banknote photos and train its model?')], notes, tifaArticles)
  assert.equal(context.articles.length, 1)
  assert.equal(context.articles[0].sourceId, 'article:04')
  assert.match(context.articles[0].text, /Unknown class/)
  assert.match(context.articles[0].text, /20 epochs/)
  assert.match(context.articles[0].text, /batch size of 32/)
  assert.match(context.articles[0].text, /2011, 2016, and 2022/)
  assert.doesNotMatch(context.articles[0].text, /facebook\/bart-large-cnn/)
})
test('article follow-ups retain the named project and an explicit profile topic resets it', () => {
  const history = [user('Tell me about Rupcara'), { role: 'assistant', content: 'It recognizes money.' }]
  const context = selectTifaContext([...history, user('What batch size did he train with?')], notes, tifaArticles)
  assert.deepEqual(context.articles.map(article => article.sourceId), ['article:04'])
  assert.equal(selectTifaContext([...history, user('What did Dipa study?')], notes, tifaArticles).articles.length, 0)
})
test('a project without a Medium article cannot inherit another project’s implementation', () => {
  const context = selectTifaContext([user('Tell me about SumTube'), { role: 'assistant', content: 'A video summary app.' }, user('What is the backend stack for VeganFuel?')], notes, tifaArticles)
  assert.equal(context.articles.length, 0)
  assert.ok(context.notes.some(note => note.id === 'project:08'))
})
test('comparisons and long conversations stay inside the reference and history budgets', () => {
  const context = selectTifaContext([user('Compare the model training in Rupcara and the architecture in Cardify')], notes, tifaArticles)
  assert.equal(context.articles.length, 2)
  assert.ok(context.articles.reduce((sum, article) => sum + article.text.length, 0) <= MAX_ARTICLE_CHARS)
  assert.ok(context.notes.reduce((sum, note) => sum + note.answer.length + (note.detail?.length || 0), 0) <= MAX_NOTE_CHARS)
  assert.equal(compactTifaHistory(Array.from({length: 11}, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'x'.repeat(2000) }))).length, 7)
  assert.ok(compactTifaHistory([{role:'assistant',content:'x'.repeat(2000)}])[0].content.length <= 700)
})
test('suggestions are short visitor questions, grounded in the current article, and do not repeat asked questions', () => {
  const messages = [user('Why does Cardify use two prompts?')]
  const context = selectTifaContext(messages, notes, tifaArticles)
  const questions = suggestQuestions(['project:03','article:03'], context.notes, messages)
  assert.equal(questions.length, 2)
  assert.ok(questions.every(question => /Cardify/.test(question) && question.length <= 64))
  assert.ok(!questions.includes(messages[0].content))
  const multipart=[user('Why does Cardify use two prompting steps, and how are its flashcards formatted?')]
  const suggestions=suggestQuestions(['article:03'],context.notes,multipart)
  assert.ok(!suggestions.includes('Why does Cardify use two prompts?'))
  assert.ok(!suggestions.includes('How are Cardify flashcards formatted?'))
  const answer = publicAnswer({reply:'An article-backed answer.',sourceIds:['article:03'],followups:['Would you like help?', 'What is the weather?']},context.notes,messages)
  assert.deepEqual(answer.answer.followups, questions)
  assert.equal(answer.answer.sources[0].articleId,'03')
  const detailed=[user('How did Rupcara handle non-banknote images, and what image size, epochs, optimizer and batch size did it use?')]
  const rupcara=selectTifaContext(detailed,notes,tifaArticles)
  assert.ok(!suggestQuestions(['article:04'],rupcara.notes,detailed).includes('How does Rupcara handle non-banknote photos?'))
})
test('the actual provider prompt includes the full relevant article and consumes only server-owned source IDs', async () => {
  let payload
  const messages = [user('What image size, epochs and batch size did Rupcara use?')]
  const response = await handleTifa(new Request('https://local/api/tifa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages,articles:[{markdown:'Untrusted browser source'}]})}),{GROQ_API_KEY:'test-only'},notes,async (url, init) => {
    payload=JSON.parse(init.body)
    return Response.json({choices:[{message:{content:JSON.stringify({reply:'224×224 pixels, 20 epochs and a batch size of 32.',sourceIds:['article:04','unknown']})}}]})
  },tifaArticles)
  assert.equal(response.status,200)
  assert.match(payload.messages[0].content,/20 epochs/)
  assert.doesNotMatch(payload.messages[0].content,/Untrusted browser source/)
  assert.doesNotMatch(payload.messages[0].content,/facebook\/bart-large-cnn/)
  assert.deepEqual(payload.response_format.json_schema.schema.required,['reply','sourceIds'])
  const answer=await response.json()
  assert.equal(answer.answer.sources[0].articleId,'04')
  assert.match(systemPrompt([],[]),/historical biographical/)
})
