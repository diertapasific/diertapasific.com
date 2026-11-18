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
const {nativePaperLayout,writingReaderAvailable,nativeWritingRequested}=await import(await load(new URL('../src/desk/nativePaperLayout.ts',import.meta.url)))
const {nativeReadingImageLayout}=await import(await load(new URL('../src/desk/nativeReadingScene.ts',import.meta.url)))
const {landReadingCamera,readingReturnDelta}=await import(await load(new URL('../src/desk/readingCamera.ts',import.meta.url)))
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
    landReadingCamera(camera,width,height,true)
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


test('graphics failure keeps Writing available across native and projected reader modes',()=>{
  for(const native of [true,false]){
    assert.equal(writingReaderAvailable('writing',native,true),true)
    assert.equal(writingReaderAvailable(null,native,true),false)
    assert.equal(writingReaderAvailable('about',native,true),false)
  }
  assert.equal(writingReaderAvailable('writing',true,false),true)
  assert.equal(writingReaderAvailable('writing',false,false),false)
})

test('both paper palettes keep body and heading ink readable against their background',async()=>{
  const css=await readFile(new URL('../src/desk/desk.css',import.meta.url),'utf8')
  const light=css.match(/\.writing-sheet \{([^}]+)\}/)[1]
  const dark=css.match(/\.writing-sheet\[data-theme="dark"\] \{([^}]+)\}/)[1]
  const luminance=hex=>{
    const values=hex.match(/\w\w/g).map(value=>parseInt(value,16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4)
    return values[0]*.2126+values[1]*.7152+values[2]*.0722
  }
  for(const palette of [light,dark]){
    const color=name=>palette.match(new RegExp(`--sheet-${name}: #([a-f0-9]{6})`))[1]
    const paper=luminance(color('paper'))
    for(const name of ['body','ink']){
      const ink=luminance(color(name)),ratio=(Math.max(paper,ink)+.05)/(Math.min(paper,ink)+.05)
      assert.ok(ratio>=4.5,`${name} contrast is readable`)
    }
  }
})


test('the retained scene image follows the physical paper through resizing and rotation',()=>{
  for(const [oldWidth,oldHeight] of sizes)for(const [width,height] of sizes){
    const view=focusView('writing',oldWidth,oldHeight),after=nativePaperLayout(width,height)
    const before={left:(oldWidth-1.15*view.zoom)/2,top:(oldHeight-1.6*view.zoom)/2-view.shift,width:1.15*view.zoom,height:1.6*view.zoom}
    const frame=nativeReadingImageLayout({width:oldWidth,height:oldHeight},width,height)
    const scale=frame.width/oldWidth
    assert.ok(Math.abs(frame.left+before.left*scale-after.left)<1e-8,'paper left edge stays aligned')
    assert.ok(Math.abs(frame.top+before.top*scale-after.top)<1e-8,'paper top edge stays aligned')
    assert.ok(Math.abs(before.width*scale-after.width)<=.5,'paper width stays aligned')
    assert.ok(Math.abs(before.height*scale-after.height)<=.5,'paper height stays within half a pixel')
    assert.ok(frame.width>0&&frame.height>0)
  }
})


test('a delayed fresh-renderer frame cannot skip the return camera movement',async()=>{
  const {createCameraMotion,advanceCameraMotion}=await import(await load(new URL('../src/desk/cameraMotion.ts',import.meta.url)))
  for(const delay of [.5,2]){
    const camera=new OrthographicCamera(),motion=createCameraMotion()
    landReadingCamera(camera,440,956,true)
    const from=camera.position.clone(),target=new Vector3(0,3.1,0),position=new Vector3(8,8,12),up=new Vector3(0,1,0)
    advanceCameraMotion(camera,motion,position,target,up,30,readingReturnDelta(delay,true))
    const fraction=camera.position.distanceTo(from)/from.distanceTo(position)
    assert.ok(fraction>0&&fraction<.25,'the first resumed frame moves gradually after a shader stall')
    assert.equal(readingReturnDelta(delay,false),delay,'ordinary navigation keeps elapsed-time behavior')
  }
})


test('Writing uses the live paper by default and retains explicit native recovery links',()=>{
  for(const search of ['', '?camera=fresh', '?paper=immersive-v2', '?paper=ink-recovery']) assert.equal(nativeWritingRequested(search),false)
  for(const search of ['?paper=native', '?camera=parked', '?paper=native&camera=fresh']) assert.equal(nativeWritingRequested(search),true)
})
