// Browser tests for Wardens of Veylmoor. No packages needed: Node drives headless Chrome or Edge.
// Run with tools/run_tests.ps1. Set VEYL_ROOT to test a different copy of the game.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(process.env.VEYL_ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const BROWSER = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(p => fs.existsSync(p));
if (!BROWSER) { console.error('Chrome or Edge is needed to run the tests.'); process.exit(2); }

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.webmanifest': 'application/json' };
const server = http.createServer((q, r) => {
  const p = decodeURIComponent(new URL(q.url, 'http://x').pathname);
  const f = path.join(ROOT, p === '/' ? 'index.html' : p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(r);
});
await new Promise(ok => server.listen(0, '127.0.0.1', ok));
const url = `http://127.0.0.1:${server.address().port}/`;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'veyl-test-'));
const browser = spawn(BROWSER, ['--headless=new', `--user-data-dir=${profile}`, '--remote-debugging-port=0', '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader', '--window-size=1280,720', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const portFile = path.join(profile, 'DevToolsActivePort');
for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await new Promise(r => setTimeout(r, 200));
const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
const target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(ok => ws.addEventListener('open', ok));

let id = 0; const pending = new Map(); let logs = [];
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === 'Runtime.exceptionThrown') logs.push((m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 300));
  if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) logs.push(m.params.args.map(a => a.description || a.value).join(' ').slice(0, 300));
});
const send = (method, params = {}) => new Promise(ok => { const i = ++id; pending.set(i, ok); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (fn, arg) => {
  const expr = `(async()=>{const a=${JSON.stringify(arg ?? null)};return JSON.stringify(await (${fn})(a))})()`;
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, timeout: 120000 });
  if (r.result?.exceptionDetails) throw new Error((r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text).slice(0, 400));
  return JSON.parse(r.result.result.value ?? 'null');
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const load = async () => { await send('Page.navigate', { url }); await sleep(3000); };
const reset = async () => { await load(); await ev(`()=>{localStorage.clear()}`); await load(); logs = []; };
await send('Runtime.enable'); await send('Page.enable');

const results = [];
const test = async (name, fn) => {
  try { const problems = (await fn()) || []; results.push({ name, problems }); }
  catch (e) { results.push({ name, problems: ['Test crashed: ' + e.message] }); }
  const r = results[results.length - 1];
  console.log(`${r.problems.length ? 'FAIL' : 'pass'}  ${name}`);
  for (const p of r.problems) console.log(`      ${p}`);
};

await reset();
await test('The game loads with no errors or warnings', async () => [...logs]);

await test('Quest data is sound', () => ev(`()=>{const V=window.__veyl,{QUESTS:Q,AREAS:A,EN}=V,ids=new Set(Q.map(q=>q.id)),bad=[];
  if(Q.length!==ids.size)bad.push('duplicate quest ids');
  for(const q of Q){if(!(q.map in A)&&q.map!=='abbey')bad.push(q.id+': unknown map '+q.map);
   for(const r of q.req||[])if(!ids.has(r))bad.push(q.id+': missing prerequisite '+r);
   if(['kill','collect','boss'].includes(q.kind)&&!EN[q.target])bad.push(q.id+': unknown monster '+q.target);
   if(q.kind==='hunt'&&!EN[q.elite&&q.elite.type])bad.push(q.id+': unknown hunt target');
   if(q.kind==='defend')for(const w of q.waves||[])if(!EN[w])bad.push(q.id+': unknown wave '+w);
   if(!(q.xp>0))bad.push(q.id+': no XP');
   const a=A[q.map==='abbey'?'vale':q.map];if(a){const m=a.lv.match(/(\\d+).(\\d+)/);if(q.lv<+m[1]||q.lv>+m[2])bad.push(q.id+': level '+q.lv+' is outside '+a.lv)}}
  const seen=new Set();let more=true;while(more){more=false;for(const q of Q)if(!seen.has(q.id)&&(q.req||[]).every(r=>seen.has(r))){seen.add(q.id);more=true}}
  for(const q of Q)if(!seen.has(q.id))bad.push(q.id+': can never be reached');
  for(const a of Object.values(A))if(!EN[a.boss])bad.push('unknown area boss '+a.boss);
  return bad}`));

await test('Reward text names every rarity correctly', () => ev(`()=>{const V=window.__veyl,bad=[],want={1:'an Uncommon',2:'a Rare',3:'an Epic',4:'a Legendary'};
  for(const q of V.QUESTS){if(!q.item)continue;const t=V.rewards(q);if(!t.includes(want[q.item.rar]))bad.push(q.id+' rarity '+q.item.rar+' reads: '+t.replace(/<[^>]+>/g,'').slice(0,80))}return bad}`));

await test('Boss area labels match the boss level and the level cap', () => ev(`()=>{const V=window.__veyl,bad=[];
  for(const id of ['dunes','frost','gloam','ember']){V.startNew('bulwark','Tester');V.enterMap(id);const m=V.G.map,z=(m.zones||[]).find(z=>/Area boss/.test(z.s||'')),f=(m.fixed||[])[0];
   if(!z||!f){bad.push(id+': no boss area');continue}const n=+z.s.match(/Level (\\d+)/)[1];if(n!==f[1])bad.push(id+': label '+n+' but boss level '+f[1]);if(n>50)bad.push(id+': boss level '+n+' is above the cap')}return bad}`));

for (const cls of ['bulwark', 'reaver', 'ashcaller', 'thornstalker', 'lumen']) {
  await reset();
  await test(`${cls}: every talent, zone and skill runs`, async () => {
    const bad = await ev(`async(cls)=>{const V=window.__veyl,bad=[],T=(n,f)=>{try{f()}catch(x){bad.push(n+': '+x.message)}};
     T('start',()=>V.startNew(cls,'Tester'));const P=V.P;T('level',()=>{P.lvl=92;V.recalc()});
     const g=V.webGraph(cls),ns=Object.values(g.nodes),total=ns.reduce((s,n)=>s+(n.max||1),0);if(ns.length!==43||total!==91)bad.push('web has '+ns.length+' nodes and '+total+' ranks');
     let learned=0;for(let i=0;i<12;i++)for(const id in g.nodes)T('talent '+id,()=>{while(V.webCan(id)&&V.webLearn(id))learned++});if(learned!==91)bad.push('learned '+learned+' of 91 ranks');
     for(const z of ['vale','dunes','frost','gloam','ember','abbey']){T('enter '+z,()=>{V.enterMap(z);if(V.G.map.id!==z)bad.push('did not reach '+z)});T('play '+z,()=>{for(let i=0;i<30;i++)V.update(1/30)});await new Promise(r=>setTimeout(r,100))}
     T('back',()=>V.enterMap('vale'));
     for(let i=0;i<6;i++)T('skill '+i,()=>{const e=V.mkEnemy('wolf',50,V.P.x+60,V.P.y);e.hp=e.max=1e6;V.G.enemies.push(e);V.G.tgt=e;V.P.mp=1e4;V.P.cds[i]=0;if(V.execAbility(i,e)===false)bad.push('skill '+i+' refused');for(let k=0;k<60;k++)V.update(1/30);V.G.enemies=[]});
     return bad}`, cls);
    return [...bad, ...logs];
  });
}

await reset();
await test('A hero survives saving, reloading and an old-version save', () => ev(`()=>{const V=window.__veyl,K='veylmoor-save-v1',bad=[];V.startNew('lumen','Saver');V.gainXP(500);dispatchEvent(new Event('pagehide'));
  const s=JSON.parse(localStorage.getItem(K)),a=JSON.stringify([V.P.lvl,V.P.xp,V.P.gold,V.P.bag.length]);V.loadSave(JSON.parse(JSON.stringify(s)));if(a!==JSON.stringify([V.P.lvl,V.P.xp,V.P.gold,V.P.bag.length]))bad.push('save and reload changed the hero');
  const old={...s,v:3,lvl:20,xp:100};localStorage.setItem(K,JSON.stringify(old));const m=V.readSave();if(!m||m.v!==4||m.lvl!==39)bad.push('version 3 save upgraded to '+JSON.stringify(m&&[m.v,m.lvl]));
  localStorage.setItem(K,JSON.stringify(s));return bad}`));

await reset();
await test('A failed save warns the player', () => ev(`async()=>{const V=window.__veyl,bad=[];V.startNew('bulwark','Tester');const o=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('full','QuotaExceededError')};
  dispatchEvent(new Event('pagehide'));Storage.prototype.setItem=o;if(!/couldn.t be saved/.test(document.getElementById('toasts').innerText))bad.push('no warning shown');return bad}`));

await reset();
await test('An unreadable save is kept, and a new hero does not erase it', async () => {
  await ev(`()=>{localStorage.setItem('veylmoor-save-v1','{broken')}`); await load();
  const bad = await ev(`()=>{const V=window.__veyl,bad=[];const n=document.querySelector('.sysnote');if(!n)bad.push('no notice on the title screen');else if(!n.innerText.includes('wardensofveylmoor@gmail.com'))bad.push('the notice does not say where to send the save');V.startNew('bulwark','New');dispatchEvent(new Event('pagehide'));if(localStorage.getItem('veylmoor-save-unreadable')!=='{broken')bad.push('copy of the unreadable save was lost');return bad}`);
  return bad;
});

await reset();
await test('A forced error is logged and shows a message; rejected promises are logged quietly', async () => {
  const quiet = await ev(`async()=>{Promise.reject(new Error('forced-rejection'));await new Promise(r=>setTimeout(r,300));return{note:!!document.querySelector('.sysnote'),logged:window.__veyl.readErrors().some(e=>e.m==='forced-rejection')}}`);
  const loud = await ev(`async()=>{setTimeout(()=>{throw new Error('forced-error')});await new Promise(r=>setTimeout(r,300));return{note:!!document.querySelector('.sysnote'),text:(document.querySelector('.sysnote')||{}).innerText||'',buttons:[...document.querySelectorAll('.sysnote button')].map(b=>b.textContent),logged:window.__veyl.readErrors().some(e=>e.m==='forced-error')}}`);
  const bad = [];
  if (quiet.note) bad.push('a rejected promise showed a message');
  if (!quiet.logged) bad.push('a rejected promise was not logged');
  if (!loud.logged) bad.push('a forced error was not logged');
  if (!loud.note || !loud.buttons.includes('Reload')) bad.push('a forced error did not show a message with Reload');
  if (!loud.text.includes('wardensofveylmoor@gmail.com')) bad.push('the error message does not say where to send the report');
  return bad;
});

await reset();
await test('Lost graphics pause the game, keep the hero and reload', async () => {
  const lost = await ev(`async()=>{const V=window.__veyl;V.startNew('reaver','Keeper');V.gainXP(50);window.__mark=1;const c=[...document.querySelectorAll('canvas')].find(c=>{try{return c.getContext('webgl')}catch(_){return false}}),x=c.getContext('webgl').getExtension('WEBGL_lose_context');window.__lc=x;x.loseContext();await new Promise(r=>setTimeout(r,700));return{paused:V.glLost,note:!!document.querySelector('.sysnote')}}`);
  const bad = [];
  if (!lost.paused) bad.push('the game did not pause');
  if (!lost.note) bad.push('no message was shown');
  await send('Runtime.evaluate', { expression: 'window.__lc.restoreContext()' });
  await sleep(3500);
  const after = await ev(`()=>{const s=window.__veyl.readSave();return{reloaded:window.__mark===undefined,name:s&&s.name}}`);
  if (!after.reloaded) bad.push('the game did not reload when graphics returned');
  if (after.name !== 'Keeper') bad.push('the hero was not kept');
  return bad;
});

await reset();
await test('The frame rate display is off by default and readable when turned on', async () => {
  const bad = [];
  await sleep(1500);
  const off = await ev(`()=>{const b=document.querySelector('.fpsbox');return !!b&&!b.hidden}`);
  if (off) bad.push('the display shows before it is turned on');
  await ev(`()=>{localStorage.setItem('veylmoor-opts',JSON.stringify({fps:true}))}`); await load(); await sleep(2000);
  const on = await ev(`()=>{const b=document.querySelector('.fpsbox'),p=window.__veyl.perf();return{text:b&&!b.hidden?b.textContent:'',fps:p.fps,worst:p.worst}}`);
  if (!/^\d+ fps · slowest \d+ ms · \d+% detail$/.test(on.text)) bad.push('unexpected display text: ' + on.text);
  if (!(on.fps > 0)) bad.push('no frame rate measured');
  return bad;
});

const failed = results.filter(r => r.problems.length).length;
console.log(`\n${results.length - failed} of ${results.length} tests passed.`);
ws.close(); browser.kill(); server.close();
setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} process.exit(failed ? 1 : 0); }, 500);
