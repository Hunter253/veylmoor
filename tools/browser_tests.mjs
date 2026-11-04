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
  const old={...s,v:3,lvl:20,xp:100};localStorage.setItem(K,JSON.stringify(old));const m=V.readSave();if(!m||m.v!==5||m.lvl!==39||!m.gems)bad.push('version 3 save upgraded to '+JSON.stringify(m&&[m.v,m.lvl]));
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

await reset();
await test('Sockets follow the rules by rarity and slot', () => ev(`()=>{const V=window.__veyl,bad=[];V.startNew('reaver','Tester');const lim={0:[0,0],1:[0,0],2:[0,1],3:[1,2],4:[1,3]};
  for(const s of ['weapon','charm','cloak'])for(const r in lim){const seen=new Set();for(let i=0;i<150;i++){const n=(V.rollItem(30,0,s,+r).soc||[]).length;seen.add(n);if(n<lim[r][0]||n>lim[r][1])bad.push(s+' rarity '+r+' rolled '+n+' sockets')}if(seen.size!==lim[r][1]-lim[r][0]+1)bad.push(s+' rarity '+r+' only rolled '+[...seen])}
  for(const s of ['helm','chest','boots'])for(let i=0;i<40;i++)if(V.rollItem(30,0,s,4).soc)bad.push(s+' rolled sockets');return [...new Set(bad)].slice(0,6)}`));

await reset();
await test('Only bosses and elites drop gems, with rarity set by zone', () => ev(`()=>{const V=window.__veyl,bad=[];V.startNew('lumen','Tester');const P=V.P,count=()=>Object.values(P.gems).reduce((a,b)=>a+b,0),kill=(t,l)=>{const e=V.mkEnemy(t,l,P.x+400,P.y);V.G.enemies.push(e);return e};
  const a=kill('wolf',5);V.killEnemy(a);if(count()!==0)bad.push('a normal monster dropped a gem');
  V.enterMap('dunes');for(let i=0;i<6;i++){const before=count();V.killEnemy(kill('qassar',27));const n=count()-before;if(n<1||n>2)bad.push('boss gave '+n+' gems')}
  for(const k in P.gems)if(V.gemParse(k).r!==1||V.gemParse(k).l!==1)bad.push('dunes boss gave '+k);
  V.enterMap('vale');P.gems={};const el=kill('wolf',9);el.elite='v3';V.killEnemy(el);if(count()!==1)bad.push('an elite gave '+count());for(const k in P.gems)if(V.gemParse(k).r!==0)bad.push('Veylmoor elite gave '+k);return bad}`));

await reset();
await test('Fusing needs five matching gems and stops at level 5', () => ev(`()=>{const V=window.__veyl,bad=[];V.startNew('bulwark','Tester');const P=V.P,k=V.gemKey('red',2,1),n=V.gemKey('red',2,2);P.gems={[k]:4};
  if(V.gemFuse(k)||P.gems[k]!==4)bad.push('four gems fused');P.gems[k]=7;if(!V.gemFuse(k)||P.gems[k]!==2||P.gems[n]!==1)bad.push('five did not become one: '+JSON.stringify(P.gems));
  const top=V.gemKey('red',2,5);P.gems={[top]:9};if(V.gemFuse(top)||P.gems[top]!==9)bad.push('a level 5 gem fused');
  P.eq.weapon=V.rollItem(30,0,'weapon',4);P.eq.weapon.soc=[null];const s=V.gemKey('blue',0,1);P.gems={[s]:5};V.gemSocket(s,'weapon');if(V.gemFuse(s)||P.gems[s]!==4)bad.push('a socketed gem counted towards fusing');return bad}`));

await reset();
await test('Socketed gems change stats, come back when removed, and survive selling', () => ev(`()=>{const V=window.__veyl,bad=[];V.startNew('bulwark','Tester');const P=V.P;P.lvl=30;P.eq.weapon=V.rollItem(30,0,'weapon',4);P.eq.weapon.soc=[null,null];P.eq.helm=V.rollItem(30,0,'helm',4);V.recalc();
  const red=V.gemKey('red',4,5),pur=V.gemKey('purple',4,5),a0=V.S.a.str,c0=V.S.crit;P.gems={[red]:1,[pur]:1};
  if(V.gemSocket(red,'helm'))bad.push('a helm took a gem');if(V.gemSocket(V.gemKey('red',0,1),'weapon'))bad.push('a gem you do not own was set');
  if(!V.gemSocket(red,'weapon')||!V.gemSocket(pur,'weapon'))bad.push('gem did not socket');V.recalc();if(V.S.a.str-a0!==V.gemBonus(red).v)bad.push('Strength rose by '+(V.S.a.str-a0));if(!(V.S.crit>c0))bad.push('Critical Chance did not rise');
  if(Object.keys(P.gems).length)bad.push('socketed gems stayed in the tab');if(V.gemSocket(red,'weapon'))bad.push('a full item took another gem');
  if(!V.gemRemove(P.eq.weapon,0)||P.gems[red]!==1||P.eq.weapon.soc[0]!==null)bad.push('removing did not return the gem');V.recalc();if(V.S.a.str!==a0)bad.push('Strength did not fall after removal');
  const n=V.returnGems(P.eq.weapon);if(n!==1||P.gems[pur]!==1)bad.push('selling did not return the gem');return bad}`));

await reset();
await test('The Gem tab works by clicking', () => ev(`async()=>{const V=window.__veyl,bad=[];V.startNew('thornstalker','Tester');const P=V.P;P.eq.cloak=V.rollItem(30,0,'cloak',4);P.eq.cloak.soc=[null];const k=V.gemKey('green',1,1);P.gems={[k]:6};V.openPanel('bag');const q=s=>document.querySelector('#book '+s),cl=s=>{const e=q(s);if(!e){bad.push('missing '+s);return false}e.click();return true};
  if(!cl('[data-act="btab"][data-t="gem"]'))return bad;if(!cl('[data-act="selgem"]'))return bad;if(!cl('[data-act="gemfuse"]'))return bad;if(P.gems[k]!==1||P.gems[V.gemKey('green',1,2)]!==1)bad.push('fuse click: '+JSON.stringify(P.gems));
  if(!q('[data-act="gemsock"]'))bad.push('no socket button');else cl('[data-act="gemsock"]');if(P.eq.cloak.soc[0]!==k)bad.push('socket click failed');
  cl('[data-act="btab"][data-t="item"]');V.closePanel();return bad}`));

await reset();
await test('Gems and sockets survive saves, old saves and hero files', async () => {
  const bad = await ev(`()=>{const V=window.__veyl,bad=[],K='veylmoor-hero-0';V.startNew('bulwark','Saver');const P=V.P,k=V.gemKey('yellow',3,2);P.gems={[k]:3};P.eq.charm=V.rollItem(30,0,'charm',4);P.eq.charm.soc=[k,null];dispatchEvent(new Event('pagehide'));
   const d=V.readSlot(0);if(d.v!==5||d.gems[k]!==3||d.eq.charm.soc[0]!==k)bad.push('save lost gems');
   const f=V.heroFileText(d),r=V.importHeroText(f);if(r.err)bad.push('import refused: '+r.err);else{const e=V.readSlot(r.slot);if(e.gems[k]!==3||e.eq.charm.soc[0]!==k)bad.push('hero file lost gems')}
   const old={...d,v:4};delete old.gems;localStorage.setItem(K,JSON.stringify(old));const m=V.readSlot(0);if(m.v!==5||JSON.stringify(m.gems)!=='{}')bad.push('version 4 save did not upgrade');
   const g=JSON.parse(f).hero,signed=h=>JSON.stringify({game:'wardens-of-veylmoor',format:1,check:V.heroCheck(JSON.stringify(h)),hero:h});
   const oldFile=V.importHeroText(signed(old));if(oldFile.err)bad.push('a version 4 hero file was refused');
   for(const [n,h] of Object.entries({'unknown gem':{...g,gems:{'pink.0.1':1}},'gem level 9':{...g,gems:{'red.0.9':1}},'negative gems':{...g,gems:{[k]:-1}},'bad socket':{...g,eq:{...g.eq,charm:{...g.eq.charm,soc:['pink.0.1']}}},'too many sockets':{...g,eq:{...g.eq,charm:{...g.eq.charm,soc:[null,null,null,null]}}}}))if(!V.parseHeroFile(signed(h)).err)bad.push('accepted: '+n);
   return bad}`);
  return bad;
});

await reset();
await test('Gear wears in fights and on death, but not at rest', () => ev(`()=>{const V=window.__veyl,bad=[];V.startNew('reaver','Tester');const P=V.P,G=V.G;G.enemies=[];P.eq.helm=V.rollItem(10,0,'helm',2);
  if(V.itemDur(P.eq.helm)!==100)bad.push('new gear is not at full durability');P.lastHurt=-1e6;for(let i=0;i<60;i++)V.wearTick(1);if(V.itemDur(P.eq.helm)!==100)bad.push('gear wore out at rest');
  for(let i=0;i<60;i++){P.lastHurt=G.time;V.wearTick(1)}const a=100-V.itemDur(P.eq.helm),want=60*V.DUR.fightPerSec;if(Math.abs(a-want)>.01)bad.push('a minute of fighting cost '+a);
  const b=V.itemDur(P.eq.helm);P.lastHurt=-1e6;P.hp=1;V.die();if(Math.abs(b-V.itemDur(P.eq.helm)-V.DUR.deathLoss)>.01)bad.push('death cost '+(b-V.itemDur(P.eq.helm)));P.dead=false;
  const inBag=V.rollItem(10,0,'boots',2);P.bag.push(inBag);V.wearAll(5);if(V.itemDur(inBag)!==100)bad.push('gear in the bag wore out');
  P.eq.helm.dur=.001;V.wearAll(5);if(V.itemDur(P.eq.helm)!==0)bad.push('durability went below zero');if(!P.eq.helm)bad.push('broken gear was destroyed');return bad}`));

await reset();
await test('Broken gear gives nothing until it is repaired, and repairs cost fairly', () => ev(`()=>{const V=window.__veyl,bad=[];V.startNew('bulwark','Tester');const P=V.P;P.lvl=30;P.eq.weapon=V.rollItem(30,0,'weapon',4);P.eq.weapon.soc=['red.4.5'];P.gold=0;V.recalc();
  const on={atk:V.S.atk,str:V.S.a.str,uq:!!V.S.uq[P.eq.weapon.uq]};P.eq.weapon.dur=0;V.recalc();if(!(V.S.atk<on.atk))bad.push('a broken weapon still gives damage');if(!(V.S.a.str<on.str))bad.push('a broken weapon still gives its gem');if(V.S.uq[P.eq.weapon.uq])bad.push('a broken weapon still gives its effect');
  const cost=V.repairCost(P.eq.weapon);if(!(cost>0))bad.push('a broken item has no repair cost');if(V.repairItem(P.eq.weapon)||!V.itemBroken(P.eq.weapon))bad.push('repaired without gold');
  P.gold=cost;if(!V.repairItem(P.eq.weapon))bad.push('could not repair with exactly enough gold');if(P.gold!==0||V.itemBroken(P.eq.weapon))bad.push('repair did not work');if(Math.abs(V.S.atk-on.atk)>1e-9||V.S.a.str!==on.str)bad.push('stats did not come back');
  P.eq.weapon.dur=50;const half=V.repairCost(P.eq.weapon);if(!(half<=Math.ceil(cost/2)+1&&half>=Math.floor(cost/2)-1))bad.push('half wear cost '+half+' against '+cost);
  P.eq.weapon.dur=100;if(V.repairCost(P.eq.weapon)!==0)bad.push('a full item has a repair cost');
  P.eq.weapon.dur=10;P.eq.helm=V.rollItem(30,0,'helm',2);P.eq.helm.dur=0;const bag=V.rollItem(30,0,'boots',1);bag.dur=40;P.bag.push(bag);const tot=V.repairables().reduce((a,x)=>a+V.repairCost(x.it),0);if(V.repairables().length!==3)bad.push('expected 3 items to repair');
  P.gold=tot-1;if(V.repairAll())bad.push('Repair All worked without enough gold');if(V.itemDur(P.eq.helm)!==0)bad.push('a refused Repair All changed an item');P.gold=tot;if(!V.repairAll())bad.push('Repair All failed');if(P.gold!==0||V.repairables().length)bad.push('Repair All left work or gold');return bad}`));

await reset();
await test('The player is told about worn gear, and the shop repairs it by clicking', () => ev(`async()=>{const V=window.__veyl,bad=[];V.startNew('lumen','Tester');const P=V.P;P.eq.helm=V.rollItem(10,0,'helm',2);P.gold=100000;const wait=ms=>new Promise(r=>setTimeout(r,ms)),note=()=>{const e=document.getElementById('durNote');return e&&!e.hidden?e.textContent:''};
  await wait(1500);if(note())bad.push('notice shown with healthy gear');P.eq.helm.dur=26;const r=V.wearAll(2);if(!r.worn.length)bad.push('crossing 25% was not reported');await wait(1500);if(!/wearing out/.test(note()))bad.push('no worn notice: '+note());
  P.eq.helm.dur=0;await wait(1500);if(!/broken/i.test(note()))bad.push('no broken notice: '+note());
  V.openPanel('char');const s=document.querySelector('#book [data-act="seleq"][data-slot="helm"]');if(!s)bad.push('no helm button');else{s.click();if(!/Broken/.test(document.querySelector('#book').innerText))bad.push('item card does not say Broken')}V.closePanel();
  V.openPanel('shop','pell');const q=x=>document.querySelector('#book '+x);q('[data-act="shtab"][data-t="repair"]').click();if(!q('[data-act="repair"][data-k="helm"]'))bad.push('no repair button for the helm');else q('[data-act="repair"][data-k="helm"]').click();if(V.itemDur(P.eq.helm)!==100)bad.push('clicking Repair failed');if(q('[data-act="repairall"]'))q('[data-act="repairall"]').click();if(!/good condition/.test(q('.gemnote')?q('.gemnote').textContent:''))bad.push('no all-clear message');V.closePanel();await wait(1500);if(note())bad.push('notice stayed after repair');return bad}`));

await reset();
await test('Durability survives saves and hero files, and old gear counts as full', () => ev(`()=>{const V=window.__veyl,bad=[];V.startNew('thornstalker','Saver');const P=V.P;P.eq.boots=V.rollItem(10,0,'boots',2);P.eq.boots.dur=33.5;const old=V.rollItem(10,0,'helm',2);delete old.dur;P.eq.helm=old;dispatchEvent(new Event('pagehide'));
  const d=V.readSlot(0);if(d.eq.boots.dur!==33.5)bad.push('save lost durability');if(V.itemDur(d.eq.helm)!==100)bad.push('old gear did not count as full');V.loadSave(JSON.parse(JSON.stringify(d)));if(V.itemDur(V.P.eq.boots)!==33.5)bad.push('load lost durability');
  dispatchEvent(new Event('pagehide'));const f=V.heroFileText(V.readSlot(0)),r=V.importHeroText(f);if(r.err)bad.push('import refused: '+r.err);else if(V.readSlot(r.slot).eq.boots.dur!==33.5)bad.push('hero file lost durability');
  const g=JSON.parse(f).hero,signed=h=>JSON.stringify({game:'wardens-of-veylmoor',format:1,check:V.heroCheck(JSON.stringify(h)),hero:h});for(const v of [-1,101,'full'])if(!V.parseHeroFile(signed({...g,eq:{...g.eq,boots:{...g.eq.boots,dur:v}}})).err)bad.push('accepted durability '+v);return bad}`));

await reset();
await test('A profession is needed to forge, and decides the armor family only', () => ev(`()=>{const V=window.__veyl,bad=[];V.startNew('bulwark','Tester');const P=V.P,stock=()=>{V.addMat('ore',1,6);V.addMat('herb',1,3)};P.gold=100000;stock();
  if(V.canForge(1))bad.push('forged with no profession');const n0=P.bag.length;V.forge(1,'helm');if(P.bag.length!==n0)bad.push('forge ran with no profession');if(V.profChoose('wizard')||P.prof)bad.push('accepted a made-up profession');if(V.profBest()!=='metal')bad.push('wrong best profession for Bulwark');
  V.addMat('herb',1,3);const tonics=P.bag.filter(x=>x.kind==='tonic').reduce((a,x)=>a+x.qty,0);V.brew();if(P.bag.filter(x=>x.kind==='tonic').reduce((a,x)=>a+x.qty,0)!==tonics+2)bad.push('brewing needs a profession');
  for(const [pr,at] of [['metal','plate'],['leather','leather'],['cloth','cloth']]){P.prof=null;if(!V.profChoose(pr))bad.push('could not choose '+pr);for(const s of ['helm','chest','boots']){stock();P.bag=P.bag.filter(x=>x.slot==='mat'||x.slot==='use');V.forge(1,s);const it=P.bag.find(x=>x.slot===s);if(!it)bad.push(pr+' made no '+s);else if(it.at!==at)bad.push(pr+' made '+it.at+' '+s)}}
  P.prof='cloth';for(const s of ['weapon','charm','cloak']){stock();P.bag=P.bag.filter(x=>x.slot==='mat'||x.slot==='use');V.forge(1,s);const it=P.bag.find(x=>x.slot===s);if(!it)bad.push('cloth could not make '+s);else if(s==='weapon'&&!['sword1','mace1','axe1'].includes(it.base))bad.push('weapon does not suit the class: '+it.base)}
  if(V.profChoose('metal'))bad.push('chose a second profession for free');return bad}`));

await reset();
await test('Forging costs gold and materials, and refunds when the bag is full', () => ev(`()=>{const V=window.__veyl,bad=[];V.startNew('lumen','Tester');const P=V.P;P.prof='cloth';V.addMat('ore',1,6);V.addMat('herb',1,3);const fee=V.FORGEGOLD[1];P.gold=fee-1;if(V.canForge(1))bad.push('forged without enough gold');P.gold=fee;if(!V.canForge(1))bad.push('could not forge with exactly enough gold');
  V.forge(1,'boots');if(P.gold!==0)bad.push('gold left: '+P.gold);if(V.haveMat('ore',1)!==0||V.haveMat('herb',1)!==0)bad.push('materials not spent');
  V.addMat('ore',1,7);V.addMat('herb',1,4);P.gold=fee;const cap=P.bagMax||18;while(P.bag.length<cap)P.bag.push(V.rollItem(1,0,'charm',0));const n=P.bag.length;V.forge(1,'boots');if(P.gold!==fee)bad.push('a full bag still took gold');if(V.haveMat('ore',1)!==7||V.haveMat('herb',1)!==4)bad.push('a full bag lost materials');if(P.bag.length!==n)bad.push('a full bag gained an item');return bad}`));

await reset();
await test('Switching profession costs a fee, and the Craft tab works by clicking', () => ev(`()=>{const V=window.__veyl,bad=[];V.startNew('ashcaller','Tester');const P=V.P;P.lvl=10;P.gold=0;V.openPanel('shop','pell');const q=x=>document.querySelector('#book '+x);q('[data-act="shtab"][data-t="craft"]').click();
  if(!q('[data-act="profpick"][data-k="cloth"]'))return ['no profession choice shown'];if(!q('.ccard.best [data-k="cloth"]'))bad.push('best profession not marked');q('[data-act="profpick"][data-k="cloth"]').click();if(P.prof!=='cloth')bad.push('click did not choose');
  const fee=V.profFee();if(V.profSwitch('metal')||P.prof!=='cloth')bad.push('switched without gold');if(V.profSwitch('cloth'))bad.push('switched to the same profession');P.gold=fee;V.closePanel();V.openPanel('shop','pell');const sw=()=>q('[data-act="profswitch"][data-k="metal"]');sw().click();if(P.prof!=='cloth'||P.gold!==fee)bad.push('one press switched');sw().click();if(P.prof!=='metal'||P.gold!==0)bad.push('two presses did not switch: '+P.prof+' '+P.gold);V.closePanel();return bad}`));

await reset();
await test('Professions survive saves and hero files, and old heroes can still choose', () => ev(`()=>{const V=window.__veyl,bad=[];V.startNew('reaver','Saver');const P=V.P;P.prof='leather';dispatchEvent(new Event('pagehide'));const d=V.readSlot(0);if(d.prof!=='leather')bad.push('save lost the profession');const f=V.heroFileText(d),r=V.importHeroText(f);if(r.err)bad.push('import refused: '+r.err);else if(V.readSlot(r.slot).prof!=='leather')bad.push('hero file lost the profession');
  const g=JSON.parse(f).hero,signed=h=>JSON.stringify({game:'wardens-of-veylmoor',format:1,check:V.heroCheck(JSON.stringify(h)),hero:h});if(!V.parseHeroFile(signed({...g,prof:'wizard'})).err)bad.push('accepted a made-up profession');if(!V.parseHeroFile(signed({...g,prof:'constructor'})).err)bad.push('accepted constructor as a profession');
  const old={...d};delete old.prof;V.loadSave(old);if(V.P.prof!==null)bad.push('an old hero arrived with '+V.P.prof);if(!V.profChoose('metal'))bad.push('an old hero could not choose');return bad}`));

const failed = results.filter(r => r.problems.length).length;
console.log(`\n${results.length - failed} of ${results.length} tests passed.`);
ws.close(); browser.kill(); server.close();
setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} process.exit(failed ? 1 : 0); }, 500);
