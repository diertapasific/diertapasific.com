import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
const source=await readFile(new URL('../src/desk/deskGestures.ts',import.meta.url),'utf8')
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText
const {listenForDeskGestures,clampDeskZoom,scaleDeskZoom}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
function setup(){
  const root=new EventTarget(),scope=new EventTarget(),capture=new Set(),orbit={current:{x:0,y:0,zoom:1}},suppress={current:0}
  Object.assign(root,{dataset:{},clientHeight:700,closest:()=>null,setPointerCapture:id=>capture.add(id),hasPointerCapture:id=>capture.has(id),releasePointerCapture:id=>capture.delete(id)})
  const cleanup=listenForDeskGestures(root,scope,orbit,suppress,()=>1000)
  const emit=(name,extra={})=>{const e=new Event(name,{cancelable:true});Object.assign(e,{pointerId:1,pointerType:'touch',isPrimary:true,button:0,detail:1,clientX:100,clientY:100,deltaY:0,deltaMode:0,...extra});(['pointermove','pointerup','pointercancel','blur','keydown'].includes(name)?scope:root).dispatchEvent(e);return e}
  return {root,scope,orbit,suppress,emit,cleanup,capture}
}
test('wheel and Safari trackpad zoom stop at the configured bounds',()=>{
  const s=setup()
  assert.ok(s.emit('wheel',{deltaY:-100}).defaultPrevented);assert.ok(s.orbit.current.zoom>1)
  for(let i=0;i<100;i++)s.emit('wheel',{deltaY:-100})
  assert.equal(s.orbit.current.zoom,1.6)
  for(let i=0;i<100;i++)s.emit('wheel',{deltaY:100})
  assert.equal(s.orbit.current.zoom,.8)
  s.emit('gesturestart');s.emit('gesturechange',{scale:2});assert.equal(s.orbit.current.zoom,1.6)
  assert.equal(clampDeskZoom(NaN),1);assert.equal(scaleDeskZoom(1,0),1)
  s.cleanup()
})
test('two-finger pinch zooms without orbiting or clicking through, then rebases the remaining finger',()=>{
  const s=setup()
  s.emit('pointerdown',{clientX:100});s.emit('pointerdown',{pointerId:2,isPrimary:false,clientX:200})
  s.emit('pointermove',{pointerId:2,isPrimary:false,clientX:250})
  assert.equal(s.orbit.current.zoom,1.5);assert.equal(s.orbit.current.x,0);assert.equal(s.orbit.current.y,0)
  s.emit('pointerup',{pointerId:2,isPrimary:false,clientX:250});s.emit('pointermove',{clientX:101})
  assert.equal(s.orbit.current.x,0,'the remaining finger does not jump into a drag')
  s.emit('pointerup',{clientX:101});assert.equal(s.emit('click').defaultPrevented,true)
  assert.equal(s.capture.size,0);s.cleanup()
})
test('drag directions stay natural and cancelled gestures cannot leave capture behind',()=>{
  const s=setup();s.emit('pointerdown');s.emit('pointermove',{clientX:120,clientY:120})
  assert.ok(s.orbit.current.x<0);assert.ok(s.orbit.current.y>0)
  s.emit('pointercancel');assert.equal(s.capture.size,0);assert.equal(s.root.dataset.dragging,undefined)
  const before={...s.orbit.current};s.emit('pointermove',{clientX:300});assert.deepEqual(s.orbit.current,before)
  s.cleanup()
})
test('reader scrolling, browser shortcuts and text inputs retain their own behavior',()=>{
  const s=setup();s.root.closest=selector=>selector.includes('data-object-surface')?{}:null
  assert.equal(s.emit('wheel',{deltaY:100}).defaultPrevented,false);assert.equal(s.orbit.current.zoom,1)
  assert.equal(s.emit('keydown',{key:'+',ctrlKey:true}).defaultPrevented,false)
  const inputEvent=new Event('keydown',{cancelable:true}); Object.assign(inputEvent,{key:'+'}); Object.defineProperty(inputEvent,'target',{value:{closest:()=>({}),isContentEditable:false}}); s.scope.dispatchEvent(inputEvent); assert.equal(inputEvent.defaultPrevented,false)
  s.cleanup()
})
test('keyboard zoom and reset work, and cleanup disables all gesture listeners',()=>{
  const s=setup();s.emit('keydown',{key:'+'});assert.ok(s.orbit.current.zoom>1)
  s.emit('pointerdown');s.emit('pointermove',{clientX:130,clientY:140});s.emit('pointerup')
  s.emit('keydown',{key:'0'});assert.deepEqual(s.orbit.current,{x:0,y:0,zoom:1})
  s.cleanup();s.emit('wheel',{deltaY:-100});s.emit('keydown',{key:'+'});assert.equal(s.orbit.current.zoom,1)
})
