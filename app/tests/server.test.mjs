import test from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {defaultScene} from '../public/core.js';
test('local server enforces host access, input validation, cooldown, overlap, failure and budget guard',async()=>{
  const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,BOOGIE_PORT:'8792'},stdio:['ignore','pipe','pipe']});let output='';let key;
  try{await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server startup timed out')),10000);child.stdout.on('data',b=>{output+=b.toString();const match=output.match(/\/host#([a-f0-9]{48})/);if(match){key=match[1];clearTimeout(timer);resolve();}});child.on('error',reject);child.on('exit',code=>{if(code)reject(Error('server exited'));});});
    const origin='http://127.0.0.1:8792',boot=await (await fetch(origin+'/api/bootstrap')).json();
    const elasticModule=await fetch(origin+'/elastic.js');assert.equal(elasticModule.status,200);assert.match(await elasticModule.text(),/class ElasticMotion/);
    const post=(path,data={},host=false,credential=host?key:boot.key)=>fetch(origin+'/api/'+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-Boogie-Key':credential},body:JSON.stringify(data)});
    const backgrounds=await fetch(origin+'/backgrounds.js');assert.equal(backgrounds.status,200);assert.match(await backgrounds.text(),/export class BackgroundCameos/);
    const cameos=await fetch(origin+'/cameos.js');assert.equal(cameos.status,200);assert.match(await cameos.text(),/export class DanceCameos/);
    const bursts=await fetch(origin+'/bursts.js');assert.equal(bursts.status,200);assert.match(await bursts.text(),/export class ElasticBurst/);
    const lights=await fetch(origin+'/lights.js');assert.equal(lights.status,200);assert.match(await lights.text(),/export function drawPartyLights/);
    const fortnite=await fetch(origin+'/fortnite.js');assert.equal(fortnite.status,200);assert.match(await fortnite.text(),/export function fortnitePose/);
    for(const path of ['beat-worker.js','beat-capture.js','beat-clock.js','beat-engine.js','beat-features.js','beat-particles.js','beat-activity.js','cabaret.js','party-guests.js','background-dancers.js']){
      const response=await fetch(origin+'/'+path);assert.equal(response.status,200,path);assert.equal(response.headers.get('content-type'),'text/javascript');
    }
    const model=await fetch(origin+'/vendor/beatnet/beatnet-1.onnx');assert.equal(model.status,200);assert.equal(model.headers.get('content-type'),'application/octet-stream');assert.equal((await model.arrayBuffer()).byteLength,1614115);
    const wasm=await fetch(origin+'/vendor/ort/ort-wasm-simd-threaded.wasm');assert.equal(wasm.status,200);assert.equal(wasm.headers.get('content-type'),'application/wasm');
    assert.match(wasm.headers.get('content-security-policy'),/wasm-unsafe-eval/);assert.ok(!wasm.headers.get('content-security-policy').includes("'unsafe-eval'"));
    assert.equal((await fetch(origin+'/.local/credentials.dpapi')).status,404);assert.equal((await fetch(origin+'/auth.mjs')).status,404);
    assert.equal((await post('host/state',{},true,'wrong')).status,403);
    const noOrigin=await fetch(origin+'/api/host/state',{method:'POST',headers:{'X-Boogie-Key':key},body:'{}'});assert.equal(noOrigin.status,403);
    const initial=await (await post('host/state',{},true)).json();assert.equal(initial.automaticAI,false);assert.equal(initial.config.reasoning,'auto');assert.deepEqual(initial.recentRequests,[]);
    assert.equal((await post('host/ai-settings',{model:'invented',reasoning:'high'},true)).status,400);
    assert.equal((await post('host/ai-settings',{model:'invented',reasoning:'high'},true,'wrong')).status,403);
    assert.equal((await post('host/ai',{enabled:true,creditUseBlocked:false,model:'invented'},true)).status,400);
    assert.equal((await post('host/ai',{enabled:true,creditUseBlocked:true,model:'invented'},true)).status,400);
    assert.equal((await (await post('host/state',{},true)).json()).automaticAI,false);
    const ai=await post('ai',{prompt:'hello'});assert.equal(ai.status,403);assert.match((await ai.json()).error,/included/);
    const bad=await post('request',{prompt:'hello',scene:{...defaultScene(),script:'bad'}});assert.equal(bad.status,400);
    const before=performance.now();const good=await (await post('request',{prompt:'witch moonwalk',scene:defaultScene()})).json();assert.equal(good.scene.hat,'witch');assert.equal(good.scene.dance,'moonwalk');console.log('Local round-trip latency:',Math.round(performance.now()-before),'ms');
    assert.equal((await post('request',{prompt:'cowboy',scene:defaultScene()})).status,429);
    await post('host/config',{cooldown:0,delay:250},true);
    const slow=post('request',{prompt:'robot',scene:defaultScene()});await new Promise(r=>setTimeout(r,60));assert.equal((await post('request',{prompt:'salsa',scene:defaultScene()})).status,409);assert.equal((await slow).status,200);
    await post('host/config',{delay:0,failure:true},true);assert.equal((await post('request',{prompt:'witch',scene:defaultScene()})).status,400);
    await post('host/config',{failure:false,paused:true},true);assert.equal((await post('request',{prompt:'witch',scene:defaultScene()})).status,409);
    await post('host/config',{paused:false},true);assert.equal((await post('request',{prompt:'salsa',scene:defaultScene()})).status,200);
    const dance=await post('request',{prompt:'Keep the witch hat and do Orange Justice',scene:{...defaultScene(),hat:'witch',theme:'underwater'}});
    const result=await dance.json();assert.equal(result.scene.dance,'orangejustice');assert.equal(result.scene.hat,'witch');assert.equal(result.scene.theme,'underwater');
  }finally{child.kill();}
});
