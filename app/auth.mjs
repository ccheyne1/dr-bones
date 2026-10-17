// Official public-client OAuth only. No credentials are borrowed from Codex or browsers.
import {randomBytes,randomUUID,createHash,createPublicKey,verify} from 'node:crypto';
import {readFile,writeFile,mkdir,rename,unlink} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {join} from 'node:path';
import {modelChoice} from './public/ai-settings.js';
const issuer='https://auth.openai.com',resource='https://api.openai.com/v1';
export const budgetReason='AI needs official sign-in, an available model, and confirmation that credit use after included usage limits is OFF in ChatGPT Settings. Local controls work.';
// Account credit blocking is enforced by ChatGPT; host confirmation is session-only.

const random=()=>randomBytes(32).toString('base64url');
async function jsonFetch(url,options={}){const r=await fetch(url,{...options,signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error(`OpenAI connection returned ${r.status}. Sign in again or use local mode.`);return r.json();}
function protect(value,decode=false){if(process.platform!=='win32')throw Error('Protected sign-in storage requires Windows. Local mode still works.');return new Promise((resolve,reject)=>{
  const script=`Add-Type -AssemblyName System.Security; $b=[Convert]::FromBase64String([Console]::In.ReadToEnd()); $r=[System.Security.Cryptography.ProtectedData]::${decode?'Unprotect':'Protect'}($b,$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Convert]::ToBase64String($r))`;
  const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,stdio:['pipe','pipe','pipe']});let out='';let failed=false;child.stdout.on('data',x=>out+=x);child.stderr.on('data',()=>{failed=true;});child.on('error',reject);child.on('close',code=>code||failed?reject(Error('Windows credential protection failed')):resolve(Buffer.from(out,'base64')));child.stdin.end(Buffer.from(value).toString('base64'));setTimeout(()=>child.kill(),15000).unref();
});}
export async function verifyIdentity(token,client,nonce,discovery,fetchKeys=()=>jsonFetch(discovery.jwks_uri)){
  if(typeof token!=='string'||token.length>16000)throw Error('Missing identity token');const parts=token.split('.');if(parts.length!==3)throw Error('Invalid identity token');
  const head=JSON.parse(Buffer.from(parts[0],'base64url')),p=JSON.parse(Buffer.from(parts[1],'base64url'));const algorithms={RS256:'RSA-SHA256',ES256:'sha256'};
  if(!algorithms[head.alg]||typeof head.kid!=='string')throw Error('Unsupported identity signature');
  const {keys}=await fetchKeys();const jwk=keys.find(k=>k.kid===head.kid&&(!k.alg||k.alg===head.alg)&&(!k.use||k.use==='sig'));
  if(!jwk)throw Error('Unknown identity signing key');const key=createPublicKey({key:jwk,format:'jwk'});
  if(!verify(algorithms[head.alg],Buffer.from(parts[0]+'.'+parts[1]),head.alg==='ES256'?{key,dsaEncoding:'ieee-p1363'}:key,Buffer.from(parts[2],'base64url')))throw Error('Invalid identity signature');
  const now=Date.now()/1000;
  if(p.iss!==issuer||p.iss!==discovery.issuer||!(Array.isArray(p.aud)?p.aud.includes(client):p.aud===client)||p.nonce!==nonce||typeof p.exp!=='number'||p.exp<=now||p.iat>now+60||p.nbf>now+60||typeof p.sub!=='string'||!p.sub)throw Error('Identity claims did not validate');return p;
}
export class ChatGPTConnection {
  constructor(dir,origin){this.dir=dir;this.origin=origin;this.profiles=[];this.active=null;this.pending=null;this.message='Not signed in';this.models=[];this.discovery=null;}
  async init(){await mkdir(this.dir,{recursive:true});try{this.host=JSON.parse(await readFile(join(this.dir,'host.json'),'utf8')).host;}catch{this.host='urn:uuid:'+randomUUID();await writeFile(join(this.dir,'host.json'),JSON.stringify({host:this.host}));}
    try{const d=JSON.parse((await protect(await readFile(join(this.dir,'credentials.dpapi')),true)).toString());this.profiles=d.profiles;this.active=d.active;this.message=this.profile?'Saved connection · not yet checked':'Not signed in';}catch{this.profiles=[];this.active=null;}
  }
  get profile(){return this.profiles.find(p=>p.client_id===this.active);}
  async save(){const encrypted=await protect(JSON.stringify({profiles:this.profiles,active:this.active}));const file=join(this.dir,'credentials.dpapi');await writeFile(file+'.tmp',encrypted);await rename(file+'.tmp',file);}
  async discover(){this.discovery=await jsonFetch(issuer+'/.well-known/openid-configuration');for(const k of ['authorization_endpoint','token_endpoint','jwks_uri'])if(new URL(this.discovery[k]).origin!==issuer)throw Error('Unexpected authorization endpoint');if(this.discovery.issuer!==issuer)throw Error('Unexpected issuer');return this.discovery;}
  async start(newAccount=false){if(this.pending&&Date.now()<this.pending.until)throw Error('Sign-in is already in progress');const d=await this.discover(),p=newAccount?null:this.profile;
    const state=random(),nonce=random(),verifier=random(),redirect=this.origin+'/auth/callback',client=p?.client_id||'dynamic_agent_client';
    this.pending={state,nonce,verifier,redirect,client,subject:p?.subject,until:Date.now()+5*60000};
    const u=new URL(d.authorization_endpoint);const params={client_id:client,ext_agent_host_id:this.host,response_type:'code',redirect_uri:redirect,scope:'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct',resource,state,nonce,code_challenge_method:'S256',code_challenge:createHash('sha256').update(verifier).digest('base64url')};
    if(!p)params.agent_name_hint='Dr. Boner Elastic';else if(p.id_token)params.id_token_hint=p.id_token;
    for(const [k,v]of Object.entries(params))u.searchParams.set(k,v);this.message='Finish sign-in in your browser';return u.toString();
  }
  async callback(u){const a=this.pending;if(!a||Date.now()>a.until||u.searchParams.get('state')!==a.state)throw Error('Expired or invalid sign-in state');this.pending=null;
    if(u.searchParams.get('error'))throw Error('ChatGPT authorization was declined');const returned=u.searchParams.get('client_id');
    const client=a.client==='dynamic_agent_client'?returned:a.client;if(!client||client==='dynamic_agent_client'||(a.client!=='dynamic_agent_client'&&returned&&returned!==a.client))throw Error('Client registration did not validate');
    // Persist issued registration even if the code expires. It is not a credential.
    let p=this.profiles.find(x=>x.client_id===client);if(!p){p={client_id:client};this.profiles.push(p);await this.save();}
    const code=u.searchParams.get('code');if(!code||code.length>8192)throw Error('Missing authorization code');
    const data=await jsonFetch(this.discovery.token_endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:client,code,code_verifier:a.verifier,redirect_uri:a.redirect,resource})});
    const identity=await verifyIdentity(data.id_token,client,a.nonce,this.discovery);if(a.subject&&a.subject!==identity.sub)throw Error('Returning account identity changed');
    if(data.token_type?.toLowerCase()!=='bearer'||!data.access_token||!Number.isFinite(data.expires_in)||data.expires_in<=0||typeof data.scope!=='string')throw Error('Invalid token response');
    Object.assign(p,data,{subject:identity.sub,email:identity.email||'ChatGPT account',expires_at:Date.now()+Number(data.expires_in)*1000,scopes:(data.scope||'').split(' ')});this.active=client;await this.save();this.message='Authorized · discover models, then enable AI in the host panel';this.models=[];
  }
  async token(){const p=this.profile;if(!p?.access_token||!p.scopes?.includes('chatgpt.tokens.use.direct'))throw Error('ChatGPT plan usage permission is missing');
    if(p.expires_at<Date.now()+60000){const d=this.discovery||await this.discover();if(!p.refresh_token)throw Error('Please sign in again');const x=await jsonFetch(d.token_endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',client_id:p.client_id,refresh_token:p.refresh_token,resource})});if(!x.access_token||!x.refresh_token||!Number.isFinite(x.expires_in))throw Error('Invalid refresh response');Object.assign(p,x,{expires_at:Date.now()+x.expires_in*1000,scopes:(x.scope||p.scope||'').split(' ')});await this.save();}
    if(!p.scopes.includes('chatgpt.tokens.use.direct'))throw Error('ChatGPT plan usage permission is no longer granted');return p.access_token;
  }
  async listModels(){const token=await this.token();const x=await jsonFetch(resource+'/models',{headers:{Authorization:'Bearer '+token}});if(!Array.isArray(x.models))throw Error('Unexpected model catalog');this.models=x.models.filter(m=>m.visibility==='list'&&typeof m.slug==='string').map(modelChoice);this.message='Plan permission checked · choose a model in the host panel';return this.models;}
  async select(client){if(!this.profiles.some(p=>p.client_id===client))throw Error('Unknown profile');this.active=client;this.models=[];await this.save();}
  async logout(){const p=this.profile;try{const d=this.discovery||await this.discover();if(d.revocation_endpoint&&new URL(d.revocation_endpoint).origin===issuer&&p?.refresh_token){const r=await fetch(d.revocation_endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token:p.refresh_token,token_type_hint:'refresh_token',client_id:p.client_id}),signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('revoke');}}catch{this.message='Locally signed out. Also disconnect Dr. Boner in ChatGPT Settings to revoke access.';}
    if(p){const client=p.client_id,subject=p.subject,email=p.email;Object.keys(p).forEach(k=>delete p[k]);Object.assign(p,{client_id:client,subject,email});}await this.save();this.models=[];if(!this.message.startsWith('Locally'))this.message='Signed out';
  }
  state(){return {message:this.message,active:this.active,profiles:this.profiles.map(p=>({id:p.client_id,label:p.email||'Incomplete registration',authorized:!!p.access_token&&p.scopes?.includes('chatgpt.tokens.use.direct')})),models:this.models,automaticAI:false,budgetReason};}
}
