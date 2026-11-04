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
const reset = async () => { await load(); await ev(`()=>{localStorage.clear()}`); logs = []; await load(); };
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
await test('The game loads with no errors or warnings', async () => {
  const ready = await ev(`()=>!!window.__veyl&&!document.querySelector('#title').hidden`);
  return [...logs, ...(ready ? [] : ['the game did not reach the title screen'])];
});

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
await test('A hero survives saving, reloading and an old-version save', () => ev(`()=>{const V=window.__veyl,K='veylmoor-hero-0',bad=[];V.startNew('lumen','Saver');V.gainXP(500);dispatchEvent(new Event('pagehide'));
  const s=JSON.parse(localStorage.getItem(K)),a=JSON.stringify([V.P.lvl,V.P.xp,V.P.gold,V.P.bag.length]);V.loadSave(JSON.parse(JSON.stringify(s)));if(a!==JSON.stringify([V.P.lvl,V.P.xp,V.P.gold,V.P.bag.length]))bad.push('save and reload changed the hero');
  const old={...s,v:3,lvl:20,xp:100};localStorage.setItem(K,JSON.stringify(old));const m=V.readSave();if(!m||m.v!==4||m.lvl!==39)bad.push('version 3 save upgraded to '+JSON.stringify(m&&[m.v,m.lvl]));
  localStorage.setItem(K,JSON.stringify(s));return bad}`));

await reset();
await test('A failed save warns the player', () => ev(`async()=>{const V=window.__veyl,bad=[];V.startNew('bulwark','Tester');const o=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('full','QuotaExceededError')};
  dispatchEvent(new Event('pagehide'));Storage.prototype.setItem=o;if(!/couldn.t be saved/.test(document.getElementById('toasts').innerText))bad.push('no warning shown');return bad}`));

await reset();
await test('An unreadable save is kept, and a new hero does not erase it', async () => {
  await ev(`()=>{localStorage.setItem('veylmoor-hero-0','{broken')}`); await load();
  const bad = await ev(`()=>{const V=window.__veyl,bad=[];const n=document.querySelector('.sysnote');if(!n)bad.push('no notice on the title screen');else if(!n.innerText.includes('wardensofveylmoor@gmail.com'))bad.push('the notice does not say where to send the save');V.startNew('bulwark','New');dispatchEvent(new Event('pagehide'));if(localStorage.getItem('veylmoor-save-unreadable')!=='{broken')bad.push('copy of the unreadable save was lost');if(localStorage.getItem('veylmoor-hero-0')!=='{broken')bad.push('the unreadable save was overwritten');if(!localStorage.getItem('veylmoor-hero-1'))bad.push('the new hero did not take the next slot');return bad}`);
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

await reset();
await test('An old single save moves to slot 1, stays as a backup, and a delete sticks', async () => {
  const raw = await ev(`()=>{window.__veyl.startNew('reaver','Oldtimer');dispatchEvent(new Event('pagehide'));window.__veyl.toTitle();return localStorage.getItem('veylmoor-hero-0')}`);
  await ev(`(raw)=>{localStorage.clear();localStorage.setItem('veylmoor-save-v1',raw)}`, raw); await load();
  const bad = [];
  const a = await ev(`()=>{const h=window.__veyl.heroes();return{first:h[0].d&&h[0].d.name,count:h.filter(x=>x.raw).length,legacy:!!localStorage.getItem('veylmoor-save-v1'),shown:[...document.querySelectorAll('#title .tt-pn')].some(e=>e.textContent==='Oldtimer')}}`);
  if (a.first !== 'Oldtimer' || a.count !== 1) bad.push('the old hero did not arrive in slot 1 alone');
  if (!a.legacy) bad.push('the old save was not kept as a backup');
  if (!a.shown) bad.push('the title screen does not show the old hero');
  const b = await ev(`async()=>{const cl=t=>document.querySelector('#title [data-t="'+t+'"]').click();cl('del');const warned=/Press Delete again/.test(document.querySelector('#title').innerText);const still=!!localStorage.getItem('veylmoor-hero-0');cl('del');return{warned,still,gone:!localStorage.getItem('veylmoor-hero-0')}}`);
  if (!b.warned || !b.still) bad.push('delete did not ask for confirmation first');
  if (!b.gone) bad.push('delete did not remove the hero');
  await load();
  const c = await ev(`()=>window.__veyl.heroes().filter(x=>x.raw).length`);
  if (c !== 0) bad.push('a deleted hero came back after a reload');
  return bad;
});

await reset();
await test('Five heroes stay separate on the title screen, and a sixth is refused', async () => {
  const bad = [];
  const cls = ['bulwark', 'reaver', 'ashcaller', 'thornstalker', 'lumen'];
  for (const c of cls) {
    const r = await ev(`async(c)=>{const V=window.__veyl;document.querySelector('#title [data-t="sel"][data-c="'+c+'"]').click();const n=document.getElementById('nameIn');n.value='H'+c;n.dispatchEvent(new Event('input'));document.querySelector('#title [data-t="play"]').click();V.P.gold=c.length*7;dispatchEvent(new Event('pagehide'));V.toTitle();return true}`, c);
    if (r !== true) bad.push('could not create ' + c);
  }
  const s = await ev(`()=>{const V=window.__veyl,h=V.heroes();return{names:h.map(x=>x.d&&x.d.name),gold:h.map(x=>x.d&&x.d.gold),classesHidden:!document.querySelector('#title [data-t="sel"][data-c="bulwark"]'),refused:V.startNew('lumen','Sixth')===false,free:V.freeSlot()}}`);
  if (s.names.join() !== cls.map(c => 'H' + c).join()) bad.push('slots hold: ' + s.names.join());
  if (s.gold.join() !== cls.map(c => c.length * 7).join()) bad.push('heroes share progress: ' + s.gold.join());
  if (!s.classesHidden) bad.push('new hero buttons still show with every slot full');
  if (!s.refused || s.free !== -1) bad.push('a sixth hero was not refused');
  const p = await ev(`()=>{const V=window.__veyl;document.querySelector('#title [data-t="sel"][data-c="slot:2"]').click();document.querySelector('#title [data-t="play"]').click();const a=[V.P.name,V.P.cls];V.P.gold=999;dispatchEvent(new Event('pagehide'));const h=V.heroes();return{a,g2:h[2].d.gold,g1:h[1].d.gold}}`);
  if (p.a[0] !== 'Hashcaller' || p.a[1] !== 'ashcaller') bad.push('Play opened the wrong hero: ' + p.a.join());
  if (p.g2 !== 999 || p.g1 !== 42) bad.push('saving wrote to the wrong slot');
  await load();
  const after = await ev(`()=>{const b=document.querySelector('#title .tt-card h1');return b&&b.textContent}`);
  if (after !== 'Hashcaller') bad.push('the last played hero was not selected after a reload: ' + after);
  return bad;
});

await reset();
await test('Export and import return the same hero, gear and talents', () => ev(`()=>{const V=window.__veyl,bad=[];V.startNew('thornstalker','Traveller');const P=V.P;P.lvl=30;P.gold=1234;V.recalc();const g=V.webGraph('thornstalker');for(let i=0;i<6;i++)for(const id in g.nodes)while(V.webCan(id)&&V.webLearn(id));
  for(const s of ['weapon','helm','chest','boots','cloak','charm'])P.eq[s]=V.rollItem(30,0,s,4);for(let i=0;i<6;i++)P.bag.push(V.rollItem(30,0,null,i%5));dispatchEvent(new Event('pagehide'));
  const d=V.readSlot(0),t=V.heroFileText(d),r=V.importHeroText(t);if(r.err){bad.push('import refused a real hero: '+r.err);return bad}if(r.slot!==1)bad.push('import went to slot '+r.slot);
  const e=V.readSlot(r.slot);for(const k of ['name','cls','lvl','xp','gold','bag','eq','tal','q','bosses'])if(JSON.stringify(d[k])!==JSON.stringify(e[k]))bad.push('field changed: '+k);
  if(JSON.stringify(V.readSlot(0))!==JSON.stringify(d))bad.push('the original hero changed');return bad}`));

await reset();
await test('Bad hero files are refused and leave existing heroes alone', () => ev(`()=>{const V=window.__veyl,bad=[];V.startNew('lumen','Keeper');dispatchEvent(new Event('pagehide'));const before=localStorage.getItem('veylmoor-hero-0'),d=V.readSlot(0),good=JSON.parse(V.heroFileText(d));
  const signed=h=>JSON.stringify({game:'wardens-of-veylmoor',format:1,check:V.heroCheck(JSON.stringify(h)),hero:h});
  const cases={'not JSON':'hello','some other JSON':'{"a":1}','another game':JSON.stringify({...good,game:'other'}),'newer file format':JSON.stringify({...good,format:2}),
   'edited gold':JSON.stringify({...good,hero:{...good.hero,gold:999999}}),'bad checksum':JSON.stringify({...good,check:'0'}),
   'script in the name':signed({...good.hero,name:'<img src=x onerror=alert(1)>'}),'script in an item':signed({...good.hero,bag:[{name:'<b>x</b>'}]}),
   'unknown class':signed({...good.hero,cls:'wizard'}),'level too high':signed({...good.hero,lvl:999}),'negative gold':signed({...good.hero,gold:-5}),'newer hero':signed({...good.hero,v:99}),
   'bag not a list':signed({...good.hero,bag:{}}),'missing position':(()=>{const h={...good.hero};delete h.x;return signed(h)})(),
   'prototype key':JSON.stringify({game:'wardens-of-veylmoor',format:1,check:V.heroCheck('{"__proto__":{"x":1},"cls":"lumen"}'),hero:JSON.parse('{"__proto__":{"x":1},"cls":"lumen"}')})};
  for(const n in cases){const r=V.importHeroText(cases[n]);if(!r.err)bad.push('accepted: '+n)}
  if(localStorage.getItem('veylmoor-hero-0')!==before)bad.push('the existing hero changed');if(V.heroes().filter(x=>x.raw).length!==1)bad.push('a bad file created a hero');
  for(let i=1;i<5;i++)if(V.importHeroText(JSON.stringify(good)).err)bad.push('good file refused');const full=V.importHeroText(JSON.stringify(good));if(!/full/.test(full.err||''))bad.push('a full roster did not refuse the import');return bad}`));

const failed = results.filter(r => r.problems.length).length;
console.log(`\n${results.length - failed} of ${results.length} tests passed.`);
ws.close(); browser.kill(); server.close();
setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} process.exit(failed ? 1 : 0); }, 500);
