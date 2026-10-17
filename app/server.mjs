import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join,dirname} from 'node:path';
import {randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
import {ChatGPTConnection,budgetReason} from './auth.mjs';
import {localRequest,validateScene} from './public/core.js';
import {createScene,aiAllowed} from './ai.mjs';
import {resolveReasoning} from './public/ai-settings.js';
const root=dirname(fileURLToPath(import.meta.url)),port=Number(process.env.BOOGIE_PORT||8788),origin=`http://127.0.0.1:${port}`;
const hostKey=randomBytes(24).toString('hex'),guestKey=randomBytes(24).toString('hex');
const auth=new ChatGPTConnection(join(root,'.local'),origin);await auth.init();
const config={cooldown:2,paused:false,delay:0,failure:false,creditUseBlocked:false,aiEnabled:false,model:'',reasoning:'auto',aiBlocked:''};let last=0,busy=false;const recentRequests=[];
const aiReady=()=>aiAllowed(config,auth);
const stopAI=()=>{config.aiEnabled=false;config.creditUseBlocked=false;config.model='';config.reasoning='auto';config.aiBlocked='';};
const files={'/':'index.html','/host':'host.html','/style.css':'style.css','/app.js':'app.js','/host.js':'host.js','/core.js':'core.js','/fortnite.js':'fortnite.js','/audio.js':'audio.js','/render.js':'render.js','/elastic.js':'elastic.js','/bursts.js':'bursts.js','/cameos.js':'cameos.js','/backgrounds.js':'backgrounds.js','/lights.js':'lights.js','/ai-settings.js':'ai-settings.js'};
for(const name of ['beat-clock.js','beat-capture.js','beat-worker.js','beat-engine.js','beat-features.js','beat-particles.js','beat-activity.js','cabaret.js','party-guests.js','background-dancers.js'])files['/'+name]=name;
for(const name of ['ort.wasm.min.mjs','ort-wasm-simd-threaded.mjs','ort-wasm-simd-threaded.wasm','LICENSE','ThirdPartyNotices.txt','provenance.json'])files['/vendor/ort/'+name]='vendor/ort/'+name;
for(const name of ['beatnet-1.onnx','beatnet-2.onnx','beatnet-3.onnx','filterbank.f32','window.f64','manifest.json','LICENSE.txt'])files['/vendor/beatnet/'+name]='vendor/beatnet/'+name;
const json=(r,data,status=200)=>{r.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});r.end(JSON.stringify(data));};
async function body(req){let b='';for await(const chunk of req){b+=chunk;if(Buffer.byteLength(b)>40000)throw Error('Request too large');}return JSON.parse(b);}
const server=http.createServer(async(req,res)=>{try{
  if(req.headers.host!==`127.0.0.1:${port}`){res.writeHead(403);res.end('Use the local 127.0.0.1 address.');return;}
  const u=new URL(req.url,origin),path=u.pathname;
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Permissions-Policy','microphone=(self), camera=()');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  if(path==='/auth/callback'&&req.method==='GET'){try{await auth.callback(u);res.writeHead(200,{'Content-Type':'text/html'});res.end('<h1>Dr. Boner is connected</h1><p>Return to the host panel to discover models and enable included-plan AI.</p>');}catch(e){auth.message=e.message;res.writeHead(400,{'Content-Type':'text/plain'});res.end('Sign-in could not complete. Return to the host panel; local party mode still works.');}return;}
  if(path==='/api/bootstrap'&&req.method==='GET')return json(res,{key:guestKey,cooldown:config.cooldown,paused:config.paused,automaticAI:aiReady(),aiBlocked:config.aiBlocked,aiSignature:config.model+':'+config.reasoning});
  if(path.startsWith('/api/')){
    if(req.method!=='POST'||req.headers.origin!==origin) return json(res,{error:'Local requests only'},403);
    const host=path.startsWith('/api/host/');if(req.headers['x-boogie-key']!==(host?hostKey:guestKey))return json(res,{error:'Open the host link from the launcher console.'},403);
    const data=await body(req);
    if(path==='/api/request'){
      if(config.paused)return json(res,{error:'The host paused requests. Keep enjoying the show.'},409);
      if(typeof data.prompt!=='string'||data.prompt.length>500)return json(res,{error:'Keep requests under 500 characters.'},400);
      const current=validateScene(data.scene);if(busy)return json(res,{error:'One costume change at a time!'},409);
      if(Date.now()-last<config.cooldown*1000)return json(res,{error:'Give these bones a moment. Try again shortly.'},429);
      const useAI=aiReady(),model=config.model,reasoning=useAI?resolveReasoning(auth.models.find(m=>m.slug===model),config.reasoning):'default';last=Date.now();busy=true;const start=performance.now();let outcome='failed';const controller=new AbortController();const closed=()=>{if(!res.writableEnded)controller.abort();};res.on('close',closed);
      try{if(config.delay)await new Promise(r=>setTimeout(r,config.delay));if(config.failure)throw Error('Host test: creation unavailable. The current scene is safe.');
        const result=useAI?{scene:await createScene(auth,model,current,data.prompt,{signal:controller.signal,reasoning}),recognized:true}:localRequest(current,data.prompt);
        outcome='completed';return json(res,{...result,source:useAI?'chatgpt':'local',latency:Math.round(performance.now()-start)});
      }catch(e){if(useAI&&(['subscription_sharing_usage_limit_exceeded','subscription_sharing_usage_unavailable','subscription_sharing_user_not_eligible'].includes(e.code)||e.status===401||e.status===403||e.status===429)){config.aiBlocked=e.message;config.aiEnabled=false;}throw e;
      }finally{if(useAI){recentRequests.unshift({at:Date.now(),model,reasoning,seconds:Math.round((performance.now()-start)/100)/10,status:controller.signal.aborted?'cancelled':outcome});recentRequests.splice(12);}res.off('close',closed);busy=false;}
    }
    if(path==='/api/ai')return json(res,{error:budgetReason,automaticAI:false},403);
    if(path==='/api/host/state')return json(res,{...auth.state(),automaticAI:aiReady(),config,recentRequests});
    if(path==='/api/host/config'){
      if(Number.isFinite(data.cooldown))config.cooldown=Math.max(0,Math.min(60,data.cooldown));if(typeof data.paused==='boolean')config.paused=data.paused;
      if(Number.isFinite(data.delay))config.delay=Math.max(0,Math.min(30000,data.delay));if(typeof data.failure==='boolean')config.failure=data.failure;return json(res,config);
    }
    if(path==='/api/host/ai-settings'){
      if(typeof data.model!=='string'||!auth.models.some(m=>m.slug===data.model))throw Error('Discover models and choose an available model first.');
      const reasoning=resolveReasoning(auth.models.find(m=>m.slug===data.model),data.reasoning);
      config.model=data.model;config.reasoning=reasoning;return json(res,{automaticAI:aiReady(),config});
    }
    if(path==='/api/host/ai'){
      if(data.enabled===false){config.aiEnabled=false;config.creditUseBlocked=false;return json(res,{automaticAI:false});}
      if(data.creditUseBlocked!==true)throw Error('Keep “Allow other apps to use credits after reaching your usage limit” OFF in ChatGPT Settings → Usage.');
      if(typeof data.model!=='string'||!auth.models.some(m=>m.slug===data.model))throw Error('Discover models and choose an available model first.');
      const reasoning=resolveReasoning(auth.models.find(m=>m.slug===data.model),data.reasoning);
      await auth.token();config.creditUseBlocked=true;config.model=data.model;config.reasoning=reasoning;config.aiBlocked='';config.aiEnabled=true;return json(res,{automaticAI:aiReady()});
    }
    if(path==='/api/host/signin'){stopAI();return json(res,{url:await auth.start(!!data.newAccount)});}
    if(path==='/api/host/models')return json(res,{models:await auth.listModels()});
    if(path==='/api/host/select'){stopAI();await auth.select(data.id);return json(res,auth.state());}
    if(path==='/api/host/logout'){stopAI();await auth.logout();return json(res,auth.state());}
    return json(res,{error:'Unknown action'},404);
  }
  if(req.method!=='GET'||!files[path]){res.writeHead(404);res.end('Not found');return;}
  const name=files[path];res.writeHead(200,{'Content-Type':(/\.m?js$/.test(name))?'text/javascript':name.endsWith('.wasm')?'application/wasm':/\.(onnx|f32|f64)$/.test(name)?'application/octet-stream':name.endsWith('.json')?'application/json':name.endsWith('.css')?'text/css':/\.html$/.test(name)?'text/html':'text/plain','Cache-Control':'no-store'});res.end(await readFile(join(root,'public',name)));
}catch(e){if(!res.destroyed)json(res,{error:e.message||'The request failed. The stage is still dancing.',code:e.code||''},e.status||400);}});
server.listen(port,'127.0.0.1',()=>{console.log(`\nDr. Boner: ${origin}\nHost controls (keep private): ${origin}/host#${hostKey}\nAI starts OFF. Sign in and enable included-plan AI in the host panel. Keep ChatGPT credit use OFF. No API keys or paid fallback.\nKeep this window open. Press Ctrl+C to stop.\n`);
  if(process.argv.includes('--open'))spawn('powershell.exe',['-NoProfile','-NonInteractive','-Command',`Start-Process '${origin}'; Start-Process '${origin}/host#${hostKey}'`],{windowsHide:true,stdio:'ignore'});
});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`Dr. Boner is already running. Open ${origin} or close the old server.`:e.message);process.exitCode=1;});
