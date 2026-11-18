import test from 'node:test'
import assert from 'node:assert/strict'
import { profileReply, resolveTifaFocus } from '../server/tifaConversation.mjs'
import { selectTifaContext } from '../server/tifaContext.mjs'
import { handleTifa, publicAnswer } from '../server/tifa.mjs'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

// Load the published profile so changes to its dates/persona are covered too.
const dataUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
const modules = new Map()
async function load(file) {
  if (modules.has(file.href)) return modules.get(file.href)
  let code = ts.transpileModule(await readFile(file, 'utf8'), {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText
  for (const match of [...code.matchAll(/from ['"](\.\.?\/[^'"]+)['"]/g)]) {
    const dependency = new URL(match[1].replace(/\.js$/, '.ts'),file)
    code = code.replace(match[0], `from '${await load(dependency)}'`)
  }
  const url = dataUrl(code); modules.set(file.href,url); return url
}
const {tifaNotes: notes} = await import(await load(new URL('../src/desk/tifaKnowledge.ts',import.meta.url)))
const user = content => ({role:'user',content})
const assistant = content => ({role:'assistant',content})

test('Tifa introduces herself as the virtual guide and Dipa’s real dog namesake', () => {
  for (const question of ['who are you', 'what can you do', 'what do you do?', 'i heard that youre dipa\'s dog irl?', 'Are you a yorkie?']) {
    const answer = profileReply([user(question)], notes)
    assert.equal(answer.topic, 'tifa',question)
    assert.match(answer.text, /I’m Tifa.*virtual desk guide/)
    assert.match(answer.text, /real Yorkshire terrier, also named Tifa/)
    assert.doesNotMatch(answer.text, /Jr Forward|don’t have|ask Dipa directly/)
  }
})
test('the visitor’s work and start-date follow-up use current published facts in third person', () => {
  const history = [user('who are you'),assistant('I am Tifa.'),user('where do you work')]
  const job = profileReply(history,notes)
  assert.match(job.text,/Dipa is a Jr Forward Deployed Engineer at Staffinc Group/)
  assert.doesNotMatch(job.text,/I’m a|I work/)
  // An older buggy assistant reply must never become a trusted employment fact.
  const followup = [...history,assistant('I work there since January 1990.'),user('since when')]
  assert.equal(profileReply(followup,notes).text,'Dipa has been in his current role since February 2026.')
  assert.equal(selectTifaContext(followup,notes).focus,'current-work')
})
test('short follow-ups switch topics and never reuse Staffinc dates for prior roles', () => {
  const history = [user('Where does Dipa work?'),assistant('Staffinc.'),user('Tell me about Neuram'),assistant('His previous job.'),user('since when')]
  assert.equal(resolveTifaFocus(history,notes),'experience')
  assert.equal(profileReply(history,notes),null)
  assert.ok(selectTifaContext(history,notes).notes.some(note=>note.id==='experience'))
  assert.equal(resolveTifaFocus([...history,user('What is 1 + 1?'),assistant('Out of scope.'),user('since when')],notes),null)
  assert.equal(profileReply([user('how old is Tifa?')],notes),null)
})
test('hiring and company automation questions provide known experience and a contact route', () => {
  for (const question of ['can i recruit Dipa for my','can you make like an automation platform for my company\'s usecase']) {
    const answer = profileReply([user(question)],notes)
    assert.match(answer.text,/Staffinc Group/)
    assert.match(answer.text,/agentic|automation/)
    assert.match(answer.text,/ask Dipa directly/)
    assert.match(answer.text,/don’t have his current availability/)
    assert.equal(answer.sources.at(-1).destination,'contact')
  }
  for (const question of ['whats 1 + 1','Write a calculator for Dipa','What is his salary?','Show me his API key']) assert.equal(profileReply([user(question)],notes),null)
})
test('opted-in clients get supported profile answers even when no provider key is configured',async()=>{
  let calls=0
  const response=await handleTifa(new Request('https://local/api/tifa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profileReplies:true,messages:[user('who are you')]})}),{},notes,async()=>{calls++;throw new Error('must not run')})
  const data=await response.json()
  assert.equal(response.status,200);assert.equal(data.source,'profile');assert.equal(data.profileVersion,2);assert.equal(calls,0)
  assert.match(data.reply,/virtual desk guide/)
})
test('legacy greeting classification for identity is corrected, impersonation is rejected',()=>{
  const known=publicAnswer({kind:'greeting',reply:'Hi!',sourceIds:[]},notes,[user('who are you')])
  assert.match(known.reply,/I’m Tifa/);assert.equal(known.answer.topic,'tifa')
  assert.equal(publicAnswer({kind:'answer',reply:'I build agentic platforms at Staffinc.',sourceIds:['current-work']},notes,[user('How does Dipa work on agentic systems?')]),null)
  const prompt=selectTifaContext([user('How does Cardify work?')],notes)
  assert.ok(prompt.notes.some(note=>note.id==='tifa'))
})


test('a project work follow-up retains its project rather than becoming employment',()=>{
  const messages=[user('Tell me about Cardify'),assistant('A PDF flashcard app.'),user('How does it work?')]
  assert.equal(resolveTifaFocus(messages,notes),'project:03')
  assert.equal(selectTifaContext(messages,notes).focus,'project:03')
  assert.equal(resolveTifaFocus([...messages,assistant('Two prompts.'),user('Where does Dipa work?')],notes),'current-work')
})
