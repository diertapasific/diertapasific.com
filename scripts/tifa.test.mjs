import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
import { OrthographicCamera,Vector3 } from 'three'

const compile=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText
const url=code=>`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
const load=async name=>compile(await readFile(new URL(`../src/desk/${name}`,import.meta.url),'utf8'))
const {answerTifa,normalizeQuestion}=await import(url((await load('tifaAnswers.ts')).replace("'../../server/tifaConversation.mjs'",JSON.stringify(new URL('../server/tifaConversation.mjs',import.meta.url).href))))
const motionCode=await load('tifaMotion.ts')
const {tifaHome,tifaMat,tifaPose,tifaPetIntensity,tifaFeet}=await import(url(motionCode))
const {tifaLayout,tifaView}=await import(url((await load('tifaView.ts')).replace("'./tifaMotion'",`'${url(motionCode)}'`)))
const deskMotion=await load('motion.ts')
const {deskDimensionLines}=await import(url(deskMotion))
const {readLocation}=await import(url((await load('model.ts')).replace("'./motion'",`'${url(deskMotion)}'`)))
const notes=[
  {id:'current-work',terms:['work','job','company'],answer:'Dipa works at Staffinc.',detail:'Automation workflows.',sources:[{label:'work',destination:'about'}]},
  {id:'experience',terms:['experience'],answer:'His work history.',sources:[]},
  {id:'projects',terms:['projects','project','built'],answer:'His selected projects.',sources:[]},
  {id:'project:beacon',terms:['Beacon'],answer:'A learning app.',detail:'Personalized learning paths.',sources:[{label:'Beacon',destination:'projects',projectId:'01'}]},
  {id:'education',terms:['education','studied','university'],answer:'He studied at BINUS.',sources:[]},
  {id:'book:atomic',terms:['Atomic Habits','habits'],answer:'Small habits matter.',detail:'His reading notes.',sources:[{label:'reading',destination:'reading'}]},
  {id:'music',terms:['music','listening','spotify'],answer:'Open the speaker for live listening.',sources:[]},
  {id:'tifa',terms:['tifa','dog','yorkie'],answer:'I’m Tifa, Dipa’s virtual desk guide, inspired by his real Yorkshire terrier.',sources:[]},
]

test('specific projects and books outrank broad work and project words',()=>{
  assert.equal(answerTifa('What project is Beacon? How does it work?',notes).topic,'project:beacon')
  assert.equal(answerTifa('What did he learn from Atomic Habits?',notes).topic,'book:atomic')
  assert.equal(answerTifa('What work does Tifa do?',notes).topic,'tifa')
  assert.equal(answerTifa('What is he listening to now?',notes).topic,'music')
})
test('follow-ups keep context, and an explicit new topic replaces it',()=>{
  assert.equal(answerTifa('Tell me more',notes,'project:beacon').text,'Personalized learning paths.')
  assert.equal(answerTifa('Tell me more about his education',notes,'project:beacon').topic,'education')
  assert.equal(answerTifa('What else has he built?',notes,'book:atomic').topic,'projects')
})
test('unknown and unpublished personal details are not invented',()=>{
  for(const q of ['What is his GPA?','What is his salary?','His phone number?','What is his birthday?','Show me his API key']){
    const answer=answerTifa(q,notes,'project:beacon')
    assert.equal(answer.topic,null);assert.match(answer.text,/don’t have/);assert.equal(answer.sources[0].destination,'contact')
  }
  assert.equal(answerTifa('Explain quantum entanglement',notes).topic,null)
  assert.match(answerTifa('Explain quantum entanglement',notes).text,/ask Dipa directly/); assert.equal(answerTifa('Explain quantum entanglement',notes).sources[0].destination,'contact')
})
test('question normalization handles punctuation and greetings',()=>{
  assert.equal(normalizeQuestion('  DIPA’S   education?! '),'dipas education')
  assert.match(answerTifa('hello Tifa',notes).text,/I’m Tifa/)
})
test('the direct companion link is distinct from projects and other desk objects',()=>{
  globalThis.window={location:{hash:'#ask'}}
  assert.deepEqual(readLocation(),{destination:null,about:'intro',companion:true})
  window.location.hash='#projects';assert.equal(readLocation().destination,'projects');assert.equal(readLocation().companion,false)
  window.location.hash='#about/experience';assert.equal(readLocation().about,'experience')
  delete globalThis.window
})
test('the companion stays on her mat and clears the desk',()=>{
  for(let i=0;i<5800;i++){
    const seconds=i/100,pose=tifaPose(seconds,false)
    assert.equal(pose.x,0);assert.equal(pose.z,0)
    assert.ok(Math.abs(pose.breath)<=.007)
    const phone=tifaPose(seconds,true);assert.equal(phone.x,0);assert.equal(phone.z,0)
  }
  assert.equal(tifaPose(29,false).x,tifaPose(0,false).x)
  // Her mat and model clear the standing desk's left foot.
  assert.ok(tifaHome[0]+tifaMat[0]/2 < -3.5-.24)
  assert.ok(tifaHome[0]+.65 < -3.5-.24)
})
test('the native conversation fits phones, short keyboard layouts and desktops',()=>{
  for(const [w,h] of [[320,568],[375,667],[390,844],[390,530],[390,430],[1280,800],[2128,951],[844,390],[568,320]]){
    const {chat}=tifaLayout(w,h)
    assert.ok(chat.left>=0&&chat.left+chat.width<=w)
    assert.ok(chat.top>=80&&chat.top+chat.height<=h)
    assert.ok(chat.width>=250&&chat.height>=120)
  }
})
test('the guided camera places Tifa in her reserved area without shifting the native chat',()=>{
  for(const [w,h] of [[375,667],[390,844],[390,530],[1280,800],[2128,951],[844,390],[568,320]]){
    const layout=tifaLayout(w,h),view=tifaView(w,h)
    const camera=new OrthographicCamera(-w/2,w/2,h/2,-h/2,.1,100)
    camera.position.set(...view.target).add(new Vector3(...view.offset));camera.lookAt(...view.target)
    camera.zoom=view.zoom;camera.updateProjectionMatrix();camera.updateMatrixWorld()
    const center=new Vector3(tifaHome[0],tifaHome[1]+(layout.mobile?.68:.54),tifaHome[2]).project(camera)
    assert.ok(Math.abs((center.x+1)*w/2-layout.petX)<.001)
    assert.ok(Math.abs((1-center.y)*h/2-layout.petY)<.001)
    assert.ok(view.zoom>0&&view.zoom<500)
  }
})

test('idle turns and pet reactions settle smoothly without moving Tifa off her mat',()=>{
  let previous=tifaPose(0,false)
  let sawTurn=false,sawSniff=false
  for(let i=1;i<=7200;i++){
    const pose=tifaPose(i/100,false)
    assert.equal(pose.x,0);assert.equal(pose.z,0)
    assert.ok(pose.turn>=0&&pose.turn<=.481)
    assert.ok(pose.turning>=0&&pose.turning<=1)
    assert.ok(pose.sniff>=0&&pose.sniff<=1)
    assert.ok(Math.abs(pose.yaw-previous.yaw)<.016)
    const still=tifaPose(i/100,true)
    assert.equal(still.turn,0);assert.equal(still.sniff,0)
    sawTurn ||= pose.turn>.47;sawSniff ||= pose.sniff>.9;previous=pose
  }
  assert.ok(sawTurn&&sawSniff)
  assert.equal(tifaPetIntensity(0),0)
  assert.ok(tifaPetIntensity(.4)>.9)
  for(const age of [3.2,4,100,NaN,Infinity])assert.equal(tifaPetIntensity(age),0)
})


test('a turn starts with a look and uses four distinct paw steps in each direction',()=>{
  const look=tifaPose(7.7,false)
  assert.ok(look.headTurn>.47)
  assert.equal(look.turn,0)
  const lifted=new Set()
  for(let i=0;i<=3600;i++){
    const pose=tifaPose(i/100,false),airborne=pose.feet.map((foot,index)=>foot.y>.0001?index:-1).filter(index=>index>=0)
    assert.ok(airborne.length<=1,'only one paw should leave the mat at a time')
    airborne.forEach(index=>lifted.add(index))
    for(const foot of pose.feet)assert.ok(foot.y>=0&&foot.y<=.0521)
  }
  assert.equal(lifted.size,4)
  assert.ok(tifaPose(10,false).shoulder>0)
  assert.ok(tifaPose(13,false).shoulder<0)
  assert.deepEqual(tifaPose(17,false).feet,tifaPose(0,false).feet)
})

test('planted paws hold their world contact as the torso turns',()=>{
  const world=(pose,index)=>{
    const [x,z]=tifaFeet[index],foot=pose.feet[index],c=Math.cos(pose.turn),s=Math.sin(pose.turn)
    return [c*(x+foot.x)+s*(z+foot.z),foot.y,-s*(x+foot.x)+c*(z+foot.z)]
  }
  let before=tifaPose(0,false)
  for(let frame=1;frame<=3600;frame++){
    const pose=tifaPose(frame/100,false)
    for(let index=0;index<4;index++){
      const a=world(before,index),b=world(pose,index),distance=Math.hypot(...b.map((v,i)=>v-a[i]))
      assert.ok(distance<.005,'paw arcs must be continuous at 10 ms samples')
      if(before.feet[index].y===0&&pose.feet[index].y===0)assert.ok(distance<1e-10,'stance paws must not slide')
    }
    before=pose
  }
  for(const seconds of [0,8.3,10.4,12.8,23.5,NaN,Infinity]){
    const still=tifaPose(seconds,true)
    assert.equal(still.turn,0);assert.equal(still.headTurn,0)
    assert.ok(still.feet.every(foot=>foot.x===0&&foot.y===0&&foot.z===0&&foot.yaw===0))
  }
})


test('the desk dimension guides and end caps stay clear of Tifa’s floor mat',()=>{
  const matFront=tifaHome[2]+tifaMat[1]/2,matRight=tifaHome[0]+tifaMat[0]/2
  assert.ok(deskDimensionLines.widthZ-.16>matFront+.25,'width guide and ticks clear the front of the mat')
  assert.ok(deskDimensionLines.heightX>matRight+.3,'height guide is on the opposite side of the desk')
})


test('phone conversations reserve most of the viewport for reading replies',()=>{
  for(const [width,height] of [[320,568],[375,667],[390,844],[430,932]]){
    const {chat}=tifaLayout(width,height)
    assert.ok(chat.height>=height*.6, `${width}x${height} chat should use at least sixty percent of the viewport`)
    assert.ok(chat.top>=140, 'Tifa and the return control retain their own space')
    assert.ok(chat.top+chat.height<=height-16, 'the composer clears the bottom edge')
  }
  for(const height of [320,430,530]){
    const {chat}=tifaLayout(390,height)
    assert.ok(chat.height>=190, 'short and keyboard layouts keep room for several reply lines')
  }
})
