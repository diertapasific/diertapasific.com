import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
const source=await readFile(new URL('../src/desk/deskClick.ts',import.meta.url),'utf8')
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText
const {createDeskClick}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
test('click feedback stays brief and quiet, reuses its buffer and disconnects finished nodes',()=>{
  let buffers=0,disconnected=0;const voices=[],envelope=[]
  const node=()=>({connect(){},disconnect(){disconnected++}})
  const context={sampleRate:48000,currentTime:2,destination:{},createBuffer(channels,frames){buffers++;assert.equal(channels,1);return {getChannelData:()=>new Float32Array(frames)}} ,createBufferSource(){const voice={...node(),start:at=>voice.started=at,stop:at=>voice.stopped=at};voices.push(voice);return voice},createBiquadFilter:()=>({...node(),frequency:{value:0}}),createGain:()=>({...node(),gain:{setValueAtTime:(value)=>envelope.push(value),exponentialRampToValueAtTime:(value)=>envelope.push(value)}})}
  const click=createDeskClick(context);click();click()
  assert.equal(voices.length,1,'a rapid duplicate click cannot stack its sound')
  assert.ok(voices[0].stopped-voices[0].started<.05);assert.ok(envelope[0]<=.02)
  voices[0].onended();assert.equal(disconnected,3)
  context.currentTime=3;click();assert.equal(voices.length,2);assert.equal(buffers,1)
})
