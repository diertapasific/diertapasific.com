import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {OrthographicCamera,Vector3} from 'three'
import ts from 'typescript'
import {renderArticles} from '../server/renderArticles.mjs'

const editions=renderArticles(JSON.parse(await readFile(new URL('../src/desk/data/medium-articles.json',import.meta.url),'utf8')))
const dataUrl=code=>`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
const modules=new Map()
async function load(file) {
  if(modules.has(file.href))return modules.get(file.href)
  let code=ts.transpileModule(await readFile(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText
  for(const match of [...code.matchAll(/from ['"]([^'"]+)['"]/g)]) {
    const name=match[1]
    const dependency=name==='virtual:medium-editions'?dataUrl(`export default ${JSON.stringify(editions)}`):name.startsWith('.')?await load(new URL(name.replace(/\.js$/,'')+(name.endsWith('Body')||name.endsWith('Document')||name.endsWith('Boundary')?'.tsx':'.ts'),file)):import.meta.resolve(name)
    code=code.replace(match[0],`from '${dependency}'`)
  }
  const url=dataUrl(code);modules.set(file.href,url);return url
}
const {nativePaperLayout}=await import(await load(new URL('../src/desk/nativePaperLayout.ts',import.meta.url)))
const {focusView}=await import(await load(new URL('../src/desk/model.ts',import.meta.url)))
const {ArticlePage}=await import(await load(new URL('../src/desk/ArticlePage.tsx',import.meta.url)))
const {POSTS}=await import(await load(new URL('../src/data/posts.ts',import.meta.url)))
const sizes=[[320,568],[390,844],[440,956],[956,440],[844,390],[1024,768]]

test('the native paper fits portrait and landscape without covering the toolbar or dock',()=>{
  for(const [width,height] of sizes){
    const page=nativePaperLayout(width,height)
    assert.ok(page.left>=0&&page.left+page.width<=width,`${width}x${height} horizontal fit`)
    assert.ok(page.top>=(height<550?104:126),`${width}x${height} clears return control`)
    assert.ok(page.top+page.height<=height-(height<550?80:128),`${width}x${height} clears dock`)
  }
})
test('the native reader matches the same physical paper and guided camera to one pixel',()=>{
  for(const [width,height] of sizes){
    const view=focusView('writing',width,height),layout=nativePaperLayout(width,height)
    const camera=new OrthographicCamera(-width/2,width/2,height/2,-height/2,.1,100)
    const target=new Vector3(...view.target);target.y+=3.1
    const direction=new Vector3(...view.offset).normalize(),up=new Vector3(0,0,-1)
    target.add(up.clone().projectOnPlane(direction).normalize().multiplyScalar(-view.shift/view.zoom))
    camera.position.copy(target).add(new Vector3(...view.offset));camera.up.copy(up);camera.lookAt(target)
    camera.zoom=view.zoom;camera.updateProjectionMatrix();camera.updateMatrixWorld()
    const corner=new Vector3(4.05-1.15/2,3.1+.565,1.55-1.6/2).project(camera)
    assert.ok(Math.abs((corner.x+1)*width/2-layout.left)<1)
    assert.ok(Math.abs((1-corner.y)*height/2-layout.top)<1)
    assert.equal(layout.width,Math.round(1.15*view.zoom));assert.equal(layout.height,Math.round(1.6*view.zoom))
  }
})
test('all six shared paper pages contain the full edition with the same article controls',()=>{
  const endings=[/The graveyard of half-watched courses/,/The code is open-source/,/spaced repetition systems like Anki/,/keep creating, learning, and contributing/,/see AI in action/,/LinkedIn/]
  for(const [index,post] of POSTS.entries()){
    const html=renderToStaticMarkup(createElement(ArticlePage,{index,onSelect:()=>{},elementRef:{current:null},interactive:true,dark:false,width:345,height:480}))
    assert.match(html,endings[index]);assert.ok(html.includes(post.href))
    assert.match(html,/Choose an article sheet/);assert.equal((html.match(/aria-pressed="true"/g)||[]).length,1)
    assert.doesNotMatch(html,/<iframe|loading article|hasn’t been added/)
  }
})
