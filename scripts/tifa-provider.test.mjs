import test from 'node:test'
import assert from 'node:assert/strict'
import {requestTifaProvider,DEFAULT_MODEL,DEFAULT_FALLBACK_MODEL} from '../server/tifaProvider.mjs'
const env={GROQ_API_KEY:'test-only'}
const schema={type:'object',additionalProperties:false,properties:{reply:{type:'string'}},required:['reply']}
const valid=()=>Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({reply:'A supported reply.'})}}]})
const bad=(status,code='unknown',retry)=>Response.json({error:{code,message:'private upstream diagnostics'}},{status,headers:retry?{'Retry-After':retry}:{}})
const run=(fetcher,extra={})=>requestTifaProvider({env,system:'Server-owned facts.',messages:[{role:'user',content:'A project question.'}],schema,parse:value=>value?.reply?value:null,fetcher,...extra})

test('a successful main model needs one request and retains strict JSON output',async()=>{
  let calls=0
  const result=await run(async(url,options)=>{
    calls++;const body=JSON.parse(options.body)
    assert.equal(body.model,DEFAULT_MODEL);assert.equal(body.response_format.json_schema.strict,true)
    assert.equal(body.messages[0].content,'Server-owned facts.');return valid()
  })
  assert.equal(calls,1);assert.equal(result.model,DEFAULT_MODEL);assert.equal(result.result.reply,'A supported reply.')
})
test('model failures, overload, rate limits and unreadable replies get one compatible alternate',async()=>{
  for (const first of [()=>bad(404,'model_not_found'),()=>bad(503),()=>bad(429,'rate_limit_exceeded','12'),()=>bad(400,'json_validate_failed'),()=>bad(400,'invalid_request_error'),()=>Response.json({choices:[]}),()=>Response.json({choices:[{finish_reason:'length',message:{content:'{"reply":"incomplete"}'}}]}),()=>{throw new TypeError('Network failure')}]) {
    const requests=[]
    const result=await run(async(url,options)=>{requests.push(JSON.parse(options.body));return requests.length===1?first():valid()})
    assert.deepEqual(requests.map(body=>body.model),[DEFAULT_MODEL,DEFAULT_FALLBACK_MODEL])
    assert.deepEqual(requests[0].messages,requests[1].messages)
    assert.deepEqual(requests[0].response_format,requests[1].response_format)
    assert.equal(result.model,DEFAULT_FALLBACK_MODEL)
  }
})
test('credentials and explicit account-wide quota errors do not retry another model',async()=>{
  for(const [status,code] of [[401,'invalid_api_key'],[403,'access_denied'],[429,'insufficient_quota'],[400,'billing_hard_limit_reached']]) {
    let calls=0;const result=await run(async()=>{calls++;return bad(status,code)})
    assert.equal(calls,1);assert.equal(result.result,undefined)
    assert.doesNotMatch(JSON.stringify(result),/test-only|private upstream/)
  }
})
test('both models failing remains bounded and preserves the longest retry interval',async()=>{
  let calls=0
  const result=await run(async()=>bad(429,'rate_limit_exceeded',String(++calls===1?12:40)))
  assert.equal(calls,2);assert.deepEqual(result,{error:'rate_limited',status:429,retryAfter:40})
  calls=0
  const duplicate=await run(async()=>{calls++;return bad(503)},{env:{...env,GROQ_FALLBACK_MODEL:DEFAULT_MODEL}})
  assert.equal(calls,1);assert.equal(duplicate.error,'provider_unavailable')
})
test('a timed-out primary can recover through the alternate within the shared deadline',async()=>{
  let calls=0;const start=Date.now()
  const result=await run(async(url,options)=>{
    if(++calls>1)return valid()
    return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}))
  },{attemptTimeoutMs:20,totalTimeoutMs:100})
  assert.equal(calls,2);assert.equal(result.model,DEFAULT_FALLBACK_MODEL);assert.ok(Date.now()-start<150)
})
test('cancelling the visitor request aborts the main attempt without starting a fallback',async()=>{
  const controller=new AbortController();let calls=0
  const result=await run(async(url,options)=>{
    calls++;return new Promise((resolve,reject)=>{options.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});controller.abort()})
  },{signal:controller.signal})
  assert.equal(calls,1);assert.equal(result.result,undefined)
})
