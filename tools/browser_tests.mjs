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

await reset();
await test('Forging earns rank, better forges earn more, and nothing is locked', () => ev(`()=>{const V=window.__veyl,bad=[];V.startNew('bulwark','Tester');const P=V.P,R=V.PROFRANK;P.prof='metal';P.gold=1e7;const give=g=>{V.addMat('ore',g,20);V.addMat('herb',g,12);V.addMat('gem',g,6)};
  if(V.profRank(0)!==0||V.profRank(R.xp[1]-1)!==0||V.profRank(R.xp[1])!==1||V.profRank(R.xp[4])!==4||V.profRank(1e9)!==4)bad.push('rank thresholds are wrong');
  give(5);if(!V.canForge(5))bad.push('a Novice was locked out of the Legendary forge');V.forge(5,'helm');if(P.profXp!==R.gradeXp[5])bad.push('Legendary forge gave '+P.profXp+' XP');P.profXp=0;give(1);V.forge(1,'helm');if(P.profXp!==R.gradeXp[1])bad.push('Common forge gave '+P.profXp+' XP');
  for(let g=2;g<=5;g++)if(!(R.gradeXp[g]>R.gradeXp[g-1]))bad.push('grade '+g+' does not earn more');
  const before=P.profXp;P.gold=0;give(1);V.forge(1,'helm');if(P.profXp!==before)bad.push('a refused forge gave XP');P.gold=1e7;V.addMat('herb',1,3);V.brew();if(P.profXp!==before)bad.push('brewing gave forge XP');
  P.profXp=R.xp[3];P.lvl=10;const fee=V.profFee();P.gold=fee;if(!V.profSwitch('cloth')||P.profXp!==0||V.profRank()!==0)bad.push('switching did not reset rank');return bad}`));

await reset();
await test('Rank bonuses stay within the rules', () => ev(`()=>{const V=window.__veyl,bad=[];V.startNew('reaver','Tester');const R=V.PROFRANK,F=V.forgeRar;
  for(let g=1;g<=5;g++){const base=[0,1,2,2,3,3][g];if(F(g,0,g===5?V.FORGELEG:0)!==base)bad.push('a Novice got a bonus at forge '+g)}
  if(F(1,4,R.rarity[4]-.001)!==2||F(1,4,R.rarity[4])!==1)bad.push('Master bonus chance is wrong at forge 1');if(F(2,4,0)!==3||F(3,4,0)!==3)bad.push('Rare forges should reach Epic with the bonus');if(F(4,4,0)!==3)bad.push('the Epic forge made Legendary');
  if(F(5,0,V.FORGELEG-.001)!==4)bad.push('Legendary forge lost its base chance');if(F(5,4,V.FORGELEG+R.rarity[4]-.001)!==4||F(5,4,V.FORGELEG+R.rarity[4])!==3)bad.push('Master bonus chance is wrong at the Legendary forge');
  const mk=(rar,s,n)=>{const i={slot:s,rar};if(n!=null)i.soc=Array(n).fill(null);return i},S=V.forgeSocket;
  if(S(mk(2,'weapon'),0,0))bad.push('a Novice got an extra socket');let a=mk(2,'weapon');if(!S(a,4,0)||a.soc.length!==1)bad.push('Master got no socket on Rare');a=mk(2,'weapon',1);if(S(a,4,0)||a.soc.length!==1)bad.push('Rare went past 1 socket');a=mk(3,'charm',2);if(S(a,4,0))bad.push('Epic went past 2 sockets');a=mk(4,'cloak',3);if(S(a,4,0))bad.push('Legendary went past 3 sockets');a=mk(4,'cloak',2);if(!S(a,4,0)||a.soc.length!==3)bad.push('Legendary could not reach 3 sockets');
  if(S(mk(4,'helm'),4,0))bad.push('a helm got a socket');if(S(mk(1,'weapon'),4,0))bad.push('Uncommon gear got a socket');if(S(mk(2,'weapon'),4,R.socket[4]))bad.push('socket chance boundary is wrong');
  const P=V.P;P.prof='metal';P.gold=1e7;P.profXp=R.xp[4];const seen={};for(let i=0;i<400;i++){V.addMat('ore',1,6);V.addMat('herb',1,3);P.bag=P.bag.filter(x=>x.slot==='mat');V.forge(1,'weapon');const it=P.bag.find(x=>x.slot==='weapon');if(it){seen[it.rar]=(seen[it.rar]||0)+1;if(it.rar===2&&(it.soc||[]).length>1)bad.push('forged a Rare with too many sockets');if(it.rar===1&&it.soc)bad.push('forged an Uncommon with a socket')}}if(!seen[1]||!seen[2])bad.push('a Master never saw the bonus: '+JSON.stringify(seen));return [...new Set(bad)]}`));

await reset();
await test('Rank shows on the Craft tab and survives saves and hero files', () => ev(`()=>{const V=window.__veyl,bad=[];V.startNew('lumen','Saver');const P=V.P,R=V.PROFRANK;P.prof='cloth';P.profXp=R.xp[2];V.openPanel('shop','pell');const q=x=>document.querySelector('#book '+x);q('[data-act="shtab"][data-t="craft"]').click();const tx=q('.profhead').innerText;if(!/Journeyman/.test(tx))bad.push('rank not shown: '+tx);P.gold=1e5;V.closePanel();V.openPanel('shop','pell');const sw=q('[data-act="profswitch"][data-k="metal"]');sw.click();if(!/rank resets/.test(q('[data-act="profswitch"][data-k="metal"]').innerText))bad.push('no warning before rank resets');V.closePanel();
  dispatchEvent(new Event('pagehide'));const d=V.readSlot(0);if(d.profXp!==R.xp[2])bad.push('save lost rank');const f=V.heroFileText(d),r=V.importHeroText(f);if(r.err)bad.push('import refused: '+r.err);else if(V.readSlot(r.slot).profXp!==R.xp[2])bad.push('hero file lost rank');
  const g=JSON.parse(f).hero,signed=h=>JSON.stringify({game:'wardens-of-veylmoor',format:1,check:V.heroCheck(JSON.stringify(h)),hero:h});if(!V.parseHeroFile(signed({...g,profXp:-1})).err||!V.parseHeroFile(signed({...g,profXp:'lots'})).err)bad.push('accepted bad rank XP');const old={...d};delete old.profXp;V.loadSave(old);if(V.P.profXp!==0||V.profRank()!==0)bad.push('an older hero did not start at Novice');return bad}`));

await reset();
await test('A tap dodges, a hold blocks, and other classes dodge at once', () => ev(`()=>{const V=window.__veyl,bad=[];V.startNew('bulwark','Tester');const P=V.P,G=V.G;G.enemies=[];const step=n=>{for(let i=0;i<n;i++)V.update(1/30)};P.st=100;
  V.dodgeDown();if(P.dash)bad.push('Bulwark dodged on press');step(2);V.dodgeUp();if(!P.dash)bad.push('a tap did not dodge');if(P.blocking)bad.push('a tap started a block');step(20);
  P.st=100;V.dodgeDown();step(9);if(!P.blocking)bad.push('a hold did not block');const s0=P.st;V.dodgeUp();if(P.blocking)bad.push('release did not end the block');if(P.dash)bad.push('ending a block rolled');if(P.st!==s0)bad.push('ending a block cost stamina');
  V.startNew('reaver','Other');V.G.enemies=[];V.P.st=100;V.dodgeDown();if(!V.P.dash)bad.push('another class lost its instant dodge');V.dodgeUp();for(let i=0;i<20;i++)V.update(1/30);V.P.st=100;V.dodgeDown();for(let i=0;i<9;i++)V.update(1/30);if(V.P.blocking)bad.push('another class could block');V.dodgeUp();return bad}`));

await reset();
await test('Blocking stops most damage from the front only', () => ev(`()=>{const V=window.__veyl,bad=[];V.startNew('bulwark','Tester');const P=V.P,G=V.G;G.enemies=[];P.fx=0;P.fy=1;const front={x:P.x,y:P.y+50,weakT:0},back={x:P.x,y:P.y-50,weakT:0},side={x:P.x+50,y:P.y,weakT:0},hit=(src,on)=>{let sum=0;for(let i=0;i<60;i++){P.blocking=on;P.fx=0;P.fy=1;P.st=100;P.iframes=0;P.shield=0;P.hp=1e7;V.hurtPlayer(1000,src);sum+=1e7-P.hp}P.blocking=false;return sum/60};
  const open=hit(front,false),f=hit(front,true),b=hit(back,true),sd=hit(side,true);if(!(f/open>.22&&f/open<.38))bad.push('front block let through '+(f/open).toFixed(2));if(!(b/open>.85))bad.push('a hit from behind was blocked: '+(b/open).toFixed(2));if(!(sd/open>.85))bad.push('a side hit was blocked: '+(sd/open).toFixed(2));
  if(V.blockFacing(null))bad.push('a hit with no source counted as blocked');P.blocking=true;P.st=100;P.iframes=0;P.hp=1e7;V.hurtPlayer(1000,front);if(P.st!==100-V.BLOCK.stPerHit)bad.push('a blocked hit cost '+(100-P.st)+' stamina');P.blocking=false;return bad}`));

await reset();
await test('Blocking drains stamina, slows you, stops attacks, and ends when it should', () => ev(`()=>{const V=window.__veyl,bad=[];V.startNew('bulwark','Tester');const P=V.P,G=V.G,step=n=>{for(let i=0;i<n;i++)V.update(1/30)};G.enemies=[];P.st=100;V.dodgeDown();step(8);if(!P.blocking){bad.push('no block');return bad}const a=P.st;step(30);const lost=a-P.st;if(lost<V.BLOCK.stPerSec*.8||lost>V.BLOCK.stPerSec*1.2)bad.push('a second of blocking cost '+lost);
  if(V.useAbility(0)!==false)bad.push('attacked while blocking');P.st=0;step(2);if(P.blocking)bad.push('block lasted with no stamina');V.dodgeUp();
  const walk=(on)=>{P.st=100;if(on){V.dodgeDown();step(8)}const x=P.x,y=P.y;V.input.right=1;for(let i=0;i<10;i++){V.update(1/30);P.st=100}V.input.right=0;const d=Math.hypot(P.x-x,P.y-y);if(on)V.dodgeUp();step(1);return d};const w0=walk(false),w1=walk(true);if(!(w1/w0>.4&&w1/w0<.6))bad.push('blocking speed ratio '+(w1/w0).toFixed(2));
  P.st=100;V.dodgeDown();step(8);P.hp=1;V.die();if(P.blocking||P.blkDown!=null)bad.push('death left the block on');P.dead=false;P.hp=100;P.st=2;V.dodgeDown();step(8);if(P.blocking)bad.push('blocked with almost no stamina');V.dodgeUp();return bad}`));

await reset();
await test('The dodge key and the phone button both tap and hold', () => ev(`()=>{const V=window.__veyl,bad=[];V.startNew('bulwark','Tester');const P=V.P,G=V.G,step=n=>{for(let i=0;i<n;i++)V.update(1/30)};G.enemies=[];const key=(t)=>dispatchEvent(new KeyboardEvent(t,{code:'KeyV',bubbles:true}));P.st=100;key('keydown');step(8);if(!P.blocking)bad.push('holding V did not block');key('keyup');if(P.blocking)bad.push('releasing V did not end it');P.st=100;key('keydown');step(1);key('keyup');if(!P.dash)bad.push('tapping V did not dodge');step(20);
  const b=document.getElementById('rollBtn'),pt=(el,t)=>el.dispatchEvent(new PointerEvent(t,{pointerId:7,bubbles:true,cancelable:true}));P.st=100;pt(b,'pointerdown');step(8);if(!P.blocking)bad.push('holding the phone button did not block');dispatchEvent(new PointerEvent('pointerup',{pointerId:99}));if(!P.blocking)bad.push('another finger ended the block');dispatchEvent(new PointerEvent('pointerup',{pointerId:7}));if(P.blocking)bad.push('lifting the finger did not end it');P.st=100;pt(b,'pointerdown');step(1);dispatchEvent(new PointerEvent('pointerup',{pointerId:7}));if(!P.dash)bad.push('tapping the phone button did not dodge');step(20);
  P.st=100;key('keydown');step(8);dispatchEvent(new Event('blur'));if(P.blocking||P.blkDown!=null)bad.push('losing window focus left the block on');key('keyup');return bad}`));

await reset();
await test('Fury builds from Hew and from being hit, and fades after a fight', () => ev(`()=>{const V=window.__veyl,bad=[];V.startNew('reaver','Tester');const P=V.P,G=V.G;G.enemies=[];const R=V.RES.reaver,N=V.RESN,step=n=>{for(let i=0;i<n;i++)V.update(1/30)};
  if(P.res!==0)bad.push('a new hero started with Fury');P.cds[0]=0;V.execAbility(0,null);if(P.res!==0)bad.push('a swing at nothing built Fury');
  const e=V.mkEnemy('wolf',1,P.x,P.y-20);e.hp=e.max=1e7;G.enemies=[e];P.fx=0;P.fy=-1;P.cds[0]=0;V.execAbility(0,e);if(P.res!==R.hit)bad.push('Hew built '+P.res);
  G.enemies=[];const r0=P.res;V.S.dodge=0;P.iframes=0;P.hp=1e7;V.hurtPlayer(10,null);if(P.res!==r0+R.hurt)bad.push('a hit built '+(P.res-r0));V.hurtPlayer(10,null,{dot:'burn'});if(P.res!==r0+R.hurt)bad.push('damage over time built Fury');
  V.resGain(500);if(P.res!==N.max)bad.push('Fury went over the cap: '+P.res);step(Math.floor(N.fadeAfter*30)-15);if(P.res!==N.max)bad.push('Fury faded too soon: '+P.res);step(45);if(!(P.res<N.max))bad.push('Fury did not start fading');step(30*8);if(P.res!==0)bad.push('Fury did not fade away: '+P.res);return bad}`));

await reset();
await test('Spending Fury boosts damage by how full the bar is', () => ev(`()=>{const V=window.__veyl,bad=[];V.startNew('reaver','Tester');const P=V.P,G=V.G;G.enemies=[];P.lvl=20;V.recalc(false);V.S.maxMp=1e6;V.S.crit=0;
  const e=V.mkEnemy('wolf',1,P.x,P.y-30);G.enemies=[e];const hit=(res)=>{e.hp=e.max=1e8;e.dots=[];e.vulnT=0;P.cds[1]=0;P.mp=1e6;P.res=res;const b=e.hp;V.execAbility(1,e);return b-e.hp};
  const med=(res)=>{const a=[];for(let i=0;i<41;i++)a.push(hit(res));a.sort((x,y)=>x-y);return a[20]},none=med(0),half=med(50),full=med(100);
  if(!(full/none>1.38&&full/none<1.62))bad.push('a full bar gave '+(full/none).toFixed(2));if(!(half/none>1.14&&half/none<1.36))bad.push('half a bar gave '+(half/none).toFixed(2));if(P.res!==0)bad.push('the bar was not emptied');
  P.cds[2]=0;P.mp=1e6;P.res=60;V.execAbility(2,null);if(P.res!==60)bad.push('Battle Roar spent Fury');
  P.res=60;P.cds[1]=0;P.mp=1e6;const bb=P.resB[1];e.x=P.x+5000;if(V.execAbility(1,e)!==false)bad.push('a skill out of reach went through');if(P.res!==60)bad.push('a failed skill spent Fury');if(P.resB[1]!==bb)bad.push('a failed skill changed the bonus');return bad}`));

await reset();
await test('A long skill keeps the bonus it started with', () => ev(`()=>{const V=window.__veyl,bad=[];V.startNew('reaver','Tester');const P=V.P,G=V.G;G.enemies=[];P.lvl=20;V.recalc(false);P.mp=1e6;V.S.maxMp=1e6;P.res=100;P.cds[5]=0;V.execAbility(5,null);if(P.res!==0)bad.push('Bladestorm did not spend Fury');if(Math.abs(V.resDmg(5)-1.5)>.001)bad.push('bonus at the start was '+V.resDmg(5));
  P.res=100;for(let i=0;i<30;i++)V.update(1/30);if(Math.abs(V.resDmg(5)-1.5)>.001)bad.push('building Fury changed the bonus mid-spin');P.cds[5]=0;P.res=0;P.mp=1e6;V.execAbility(5,null);if(V.resDmg(5)!==1)bad.push('an empty bar kept the old bonus');if(V.resDmg(0)!==1||V.resDmg(2)!==1)bad.push('Hew or Battle Roar got a bonus');return bad}`));

await reset();
await test('Light builds from Light Mote and boosts healing and Judgement', () => ev(`()=>{const V=window.__veyl,bad=[];V.startNew('lumen','Tester');const P=V.P,G=V.G;G.enemies=[];P.lvl=20;V.recalc(false);V.S.maxMp=1e6;V.S.crit=0;
  const mend=(res)=>{P.buffs=[];P.res=res;P.cds[1]=0;P.mp=1e6;P.hp=1;V.execAbility(1,null);const b=P.buffs.find(x=>x.id==='mend');return{got:P.hp-1,hot:b&&b.hot}};const m0=mend(0),m1=mend(100);if(!(Math.abs(m1.got/m0.got-1.5)<.02))bad.push('Mend healed '+(m1.got/m0.got).toFixed(2));if(!(Math.abs(m1.hot/m0.hot-1.5)<.001))bad.push('Mend over time was '+(m1.hot/m0.hot).toFixed(2));if(P.res!==0)bad.push('Mend did not spend Light');
  const sanct=(res)=>{G.areas=[];P.res=res;P.cds[4]=0;P.mp=1e6;V.execAbility(4,null);return G.areas[G.areas.length-1].hot};const s0=sanct(0),s1=sanct(100);G.areas=[];P.buffs=[];if(!(Math.abs(s1/s0-1.5)<.001))bad.push('Sanctuary healed '+(s1/s0).toFixed(2));
  P.res=100;P.cds[2]=0;P.mp=1e6;V.execAbility(2,null);if(P.res!==0)bad.push('Halo did not spend Light');if(V.resDmg(2)!==1)bad.push('Halo damage was boosted');if(Math.abs(V.resHeal(2)-1.5)>.001)bad.push('Halo healing was not boosted');
  const e=V.mkEnemy('wolf',1,P.x,P.y-30);G.enemies=[e];const judge=(res)=>{const a=[];for(let i=0;i<41;i++){e.hp=e.max=1e8;e.weakT=0;e.vulnT=0;P.cds[3]=0;P.mp=1e6;P.res=res;const b=e.hp;V.execAbility(3,e);a.push(b-e.hp)}a.sort((x,y)=>x-y);return a[20]};const j0=judge(0),j1=judge(100);if(!(j1/j0>1.38&&j1/j0<1.62))bad.push('Judgement hit '+(j1/j0).toFixed(2));if(V.resHeal(3)!==1)bad.push('Judgement counted as healing');
  const dawn=(res)=>{e.hp=e.max=1e8;e.stun=9;P.iframes=9;V.S.hpReg=0;P.buffs=[];P.res=res;P.cds[5]=0;P.mp=1e6;P.hp=1;V.execAbility(5,e);for(let i=0;i<24;i++)V.update(1/30);return P.hp-1};const d0=dawn(0),d1=dawn(100);if(!(d0>0&&Math.abs(d1/d0-1.5)<.12))bad.push('Dawnbreak healed '+(d1/d0).toFixed(2));
  e.hp=e.max=1e8;V.S.dodge=0;P.res=0;P.iframes=0;P.hp=1e6;V.hurtPlayer(10,null);if(P.res!==0)bad.push('being hit built Light');
  e.x=P.x;e.y=P.y-40;e.stun=9;P.cds[0]=0;P.res=0;V.execAbility(0,e);for(let i=0;i<20&&P.res===0;i++)V.update(1/30);if(P.res!==V.RES.lumen.hit)bad.push('a Light Mote hit built '+P.res);return bad}`));

await reset();
await test('Only the Reaver and Lumen have a bar, and it is not saved', () => ev(`()=>{const V=window.__veyl,bad=[];const w=document.getElementById('pfResW');
  for(const c of['bulwark','ashcaller','thornstalker']){V.startNew(c,'Tester');V.hud();if(!w.hidden)bad.push(c+' shows a bar');V.P.iframes=0;V.P.hp=1e6;V.hurtPlayer(10,null);V.resGain(50);if(V.P.res!==0)bad.push(c+' built a resource');for(let i=1;i<6;i++)if(V.resDmg(i)!==1||V.resHeal(i)!==1)bad.push(c+' got a bonus');if(V.resNote(1)!=='')bad.push(c+' has resource text');localStorage.clear()}
  for(const [c,cl] of [['reaver','fury'],['lumen','light']]){V.startNew(c,'Tester');V.P.res=100;V.hud();if(w.hidden||!w.classList.contains(cl)||!w.classList.contains('full'))bad.push(c+' bar looks wrong: '+w.className);if(parseFloat(document.getElementById('pfRes').style.width)!==100)bad.push(c+' bar width '+document.getElementById('pfRes').style.width);const d=V.serialize();if('res' in d||'resB' in d)bad.push(c+' bar went into the save');V.loadSave(JSON.parse(JSON.stringify(d)));if(V.P.res!==0)bad.push(c+' reloaded with a full bar');if(!V.P.resB||V.P.resB.length!==6)bad.push(c+' reloaded with no bonus list');if(!/Spends all your/.test(V.resNote(1)))bad.push(c+' has no skill text');V.P.res=80;V.P.hp=1;V.die();if(V.P.res!==0)bad.push(c+' kept the bar through death');V.P.dead=false;V.closePanel(true);localStorage.clear()}return bad}`));

await reset();
await test('You can walk from the start to everyone and everything in Hollowmere', () => ev(`()=>{const V=window.__veyl,bad=[];V.startNew('reaver','Tester');const m=V.G.maps.vale,TS=m.start.x/14.5,sx=Math.floor(m.start.x/TS),sy=Math.floor(m.start.y/TS),seen=new Set([sx+','+sy]),q=[[sx,sy]],open=(x,y)=>{const v=m.get(x,y);return v>=0&&!V.SOLID[v]};
  if(!open(sx,sy))bad.push('the start is blocked');while(q.length){const[x,y]=q.pop();for(const[a,b]of[[1,0],[-1,0],[0,1],[0,-1]]){const k=(x+a)+','+(y+b);if(!seen.has(k)&&open(x+a,y+b)){seen.add(k);q.push([x+a,y+b])}}}
  const near=(x,y,r=1)=>{for(let b=-r;b<=r;b++)for(let a=-r;a<=r;a++)if(seen.has((Math.floor(x)+a)+','+(Math.floor(y)+b)))return true;return false};
  for(const k of m.npcs){const n=V.NPCS[k];if(!open(Math.floor(n.x),Math.floor(n.y)))bad.push(k+' stands in something solid');if(!near(n.x,n.y))bad.push(k+' cannot be reached')}
  for(const[name,x,y]of[['north road',14,10],['east road',36,25],['south road',16,40],['Waystone',m.way[0],m.way[1]],['Abbey gate',58,6],['Southfield',8,38]])if(!near(x,y,2))bad.push(name+' cannot be reached');
  for(const b of V.HOLLOWMERE.buildings){const[x0,y0,x1,y1]=b.r,door=x0+1.5,fy=b.face==='n'?y0-1:y1+1;if(!near(door,fy,0))bad.push('the door at '+x0+','+y0+' cannot be reached')}
  for(const Q of V.QUESTS.filter(q=>q.map==='vale'))for(const p of[...(Q.spots||[]),...(Q.nodes||[])])if(!near(p[0],p[1],3))bad.push(Q.id+' spot '+p[0]+','+p[1]+' cannot be reached');
  const h=m.houses.map(r=>r.slice(0,4));h.forEach((a,i)=>h.forEach((b,j)=>{if(i<j&&a[0]<=b[2]&&b[0]<=a[2]&&a[1]<=b[3]&&b[1]<=a[3])bad.push('buildings overlap at '+a[0]+','+a[1])}));return bad}`));

await reset();
await test('Bram opens on the Craft tab, Pell on Buy, and buildings have names', () => ev(`async()=>{const V=window.__veyl,bad=[];V.startNew('reaver','Tester');const m=V.G.map,P=V.P;if(!m.npcs.includes('bram'))bad.push('Bram is missing');const before=V.readErrors().length;const TS=m.start.x/14.5;
  const talk=k=>{const n=V.NPCS[k];P.x=n.x*TS;P.y=(n.y+.6)*TS;V.G.near={kind:'npc',id:k};V.interact();const t=document.querySelector('#book .tab.on'),title=(document.getElementById('book').textContent||'');const r={tab:t&&t.dataset.t,panel:V.G.panel,text:title};V.closePanel(true);return r};
  const b=talk('bram');if(b.tab!=='craft')bad.push('Bram opened on '+b.tab);if(!/Bram's Forge/.test(b.text))bad.push('no Forge title');const p=talk('pell');if(p.tab!=='buy')bad.push('Pell opened on '+p.tab);if(!/Pell's Store/.test(p.text))bad.push('no Store title');
  for(const s of['Village Hall','Forge','The Inn','General Store','Herb Hut','Stable'])if(!m.signs.some(x=>x[2]===s))bad.push('no sign for '+s);
  const res=V.G.res||[];const z=m.zones.find(z=>z.n==='Hollowmere');for(const r of res){const x=r.x/TS,y=r.y/TS;if(x>=z.x0&&x<=z.x1&&y>=z.y0&&y<=z.y1)bad.push('a resource grew in the village at '+x.toFixed(0)+','+y.toFixed(0))}await new Promise(r=>setTimeout(r,600));if(V.readErrors().length>before)bad.push('drawing the village caused an error: '+V.readErrors().slice(-1)[0].m);return bad}`));

await reset();
await test('A hero saved where a building now stands loads safely, and other towns keep their houses', () => ev(`()=>{const V=window.__veyl,bad=[];V.startNew('lumen','Tester');const m=V.G.maps.vale,TS=m.start.x/14.5,d=V.serialize();d.map='vale';d.x=9.5*TS;d.y=20.5*TS;V.loadSave(JSON.parse(JSON.stringify(d)));if(V.G.map.solidAt(V.P.x,V.P.y))bad.push('the hero loaded inside a building');if(V.P.x!==V.G.map.start.x||V.P.y!==V.G.map.start.y)bad.push('the hero was not moved to the start');
  for(const id of['dunes','frost','gloam','ember']){if(!V.G.maps[id])V.G.maps[id]=V.BUILD[id]();const t=V.G.maps[id];if(!t.houses||!t.houses.length)bad.push(id+' lost its houses');if(t.signs)bad.push(id+' gained signs')}
  V.enterMap('vale',V.G.maps.vale.start);V.update(1/30);return bad}`));

// Enemy tactics (7.b). Most of these use open ground, so walls can't hide what the rule does.
const TAC_SETUP = `const V=window.__veyl,bad=[];V.startNew('reaver','Tester');const P=V.P,G=V.G,TS=32;V.enterMap('dunes');G.enemies=[];P.x=40*TS;P.y=10*TS;P.hp=1e7;P.iframes=1e9;P.fx=0;P.fy=1;P.faceLock=1e9;const m=G.map,solid=m.solidAt,get=m.get;m.solidAt=()=>false;m.get=()=>0;const done=()=>{m.solidAt=solid;m.get=get;G.enemies=[];return bad},step=(n,f)=>{for(let i=0;i<n;i++){V.update(1/30);P.iframes=1e9;P.faceLock=1e9;if(f)f(i)}},add=(t,dx,dy,o)=>{const e=V.mkEnemy(t,20,P.x+dx,P.y+dy);e.hp=e.max=1e6;e.spT=1e9;e.state='chase';if(o)Object.assign(e,o);G.enemies.push(e);return e},pd=e=>Math.hypot(e.x-P.x,e.y-P.y);`;

await reset();
await test('Every regular monster has an archetype, and bosses have none', () => ev(`()=>{const V=window.__veyl,bad=[];for(const t in V.EN){const b=V.EN[t].boss;if(b&&V.TACBY[t])bad.push(t+' is a boss with an archetype');if(!b&&!V.TACBY[t])bad.push(t+' has no archetype')}for(const t in V.TACTICS.patrolShare)if(!V.EN[t])bad.push('patrol lists unknown '+t);for(const k of ['stalker','sentinel','ravager','arcanist'])if(!V.TACTICS.arch[k])bad.push('missing '+k);for(const t of V.TACTICS.arch.arcanist.types)if(!V.EN[t].ranged)bad.push(t+' is an arcanist but not ranged');return bad}`));

await reset();
await test('Noticing you brings the nearby pack, not the zone or a boss', () => ev(`()=>{${TAC_SETUP}
  const idle={state:'idle'},look=(e)=>{const r=Math.atan2(P.x-e.x,P.y-e.y);e.rot=r;e.trot=r;e.wander=1e9;return e},until=(e)=>{for(let i=0;i<60&&e.state!=='chase';i++)step(1)};
  const a=look(add('wisp',185,0,idle)),near=add('wisp',260,40,idle),far=add('wisp',500,0,idle),boss=add('prior',260,0,idle);until(a);
  if(a.state!=='chase')bad.push('the first one did not notice');if(near.state!=='chase')bad.push('its neighbour did not join');if(far.state!=='idle')bad.push('a distant one joined');if(boss.state!=='idle')bad.push('a boss was pulled');
  G.enemies=[];const s=look(add('acolyte',160,0,idle)),n2=add('wraith',300,0,idle),n3=add('wraith',160,300,idle);until(s);if(s.state!=='chase')bad.push('a Sentinel did not notice');if(n2.state!=='chase')bad.push('a Sentinel should call from further away');if(n3.state!=='idle')bad.push('a Sentinel reached too far');return done()}`));

await reset();
await test('Melee monsters spread out and only three strike at once', () => ev(`()=>{${TAC_SETUP}
  const run=k=>{G.enemies=[];V.TACTICS.space.speed=k;const L=[];for(let i=0;i<6;i++)L.push(add('ghoul',100+i*4,(i-2.5)*10));let most=0;const bit=new Set();step(240,()=>{most=Math.max(most,L.filter(e=>e.wind>0).length);for(const e of L)if(e.wind>0)bit.add(e.id)});const A=L.map(e=>Math.atan2(e.y-P.y,e.x-P.x)).sort((a,b)=>a-b);let hole=A[0]+Math.PI*2-A[5];for(let i=1;i<6;i++)hole=Math.max(hole,A[i]-A[i-1]);return{span:Math.PI*2-hole,most,bit:bit.size,far:Math.max(...L.map(pd))}};
  const off=run(0),on=run(.7);if(on.span<off.span+.7)bad.push('spread '+on.span.toFixed(2)+' against '+off.span.toFixed(2)+' without the rule');if(on.most>V.TACTICS.attackers)bad.push(on.most+' struck at once');if(on.bit<5)bad.push('only '+on.bit+' of 6 got a turn');if(on.far>V.TACTICS.space.hold+45)bad.push('one hung back at '+on.far.toFixed(0));
  G.enemies=[];const ring=[];for(let i=0;i<6;i++){const a=i*Math.PI/3;ring.push(add('ghoul',30*Math.cos(a),30*Math.sin(a),{state:'chase',cd:0}))}let top=0;step(30,()=>{top=Math.max(top,ring.filter(e=>e.wind>0).length)});if(top!==V.TACTICS.attackers)bad.push(top+' of 6 struck together when all were ready');return done()}`));

await reset();
await test('Wolves circle to your back in a pack, pause, and never more than two at once', () => ev(`()=>{${TAC_SETUP}
  const L=[add('wolf',0,120),add('wolf',-30,120),add('wolf',30,120),add('wolf',60,120)];let most=0,behind=0,ended=0,shortPause=0;const was=new Map();
  step(150,()=>{most=Math.max(most,L.filter(e=>e.flankT>0).length);for(const e of L){if(was.get(e)&&!(e.flankT>0)){ended++;if(e.cd<V.TACTICS.flank.pause-.04)shortPause++;if(!V.blockFacing(e))behind++}was.set(e,e.flankT>0)}});
  if(most<1)bad.push('no wolf flanked');if(most>V.TACTICS.flank.max)bad.push(most+' flanked at once');if(!ended)bad.push('no flank finished');if(!behind)bad.push('no wolf got outside the block');if(shortPause)bad.push(shortPause+' bit with no pause');
  G.enemies=[];const lone=add('wolf',0,120);let f=0;step(60,()=>{if(lone.flankT>0)f++});if(f)bad.push('a lone wolf circled');
  G.enemies=[];const a=add('wolf',0,120),b=add('wolf',30,120);a.taunt=60;b.taunt=60;let t=0;step(45,()=>{if(a.flankT>0||b.flankT>0)t++});if(t)bad.push('a taunted wolf circled');return done()}`));

await reset();
await test('Ranged monsters back away, sidestep, and stop before their chase limit', () => ev(`()=>{${TAC_SETUP}
  const R=V.EN.wraith.range,keep=R*V.TACTICS.ranged.keep;const a=add('wraith',40,0);step(90);if(pd(a)<keep-12)bad.push('stayed at '+pd(a).toFixed(0));
  G.enemies=[];G.projs=[];const b=add('wraith',R*.75,0,{cd:0,state:'chase'});step(2);if(!G.projs.length)bad.push('did not shoot');if(!(b.strafeT>0))bad.push('did not start a sidestep');const y0=b.y,d0=pd(b);step(12);if(Math.abs(b.y-y0)<8)bad.push('sidestep moved only '+Math.abs(b.y-y0).toFixed(1));if(Math.abs(pd(b)-d0)>8)bad.push('sidestep changed range by '+Math.abs(pd(b)-d0).toFixed(1));
  G.enemies=[];const c=add('wraith',40,0,{hx:P.x+40+V.TACTICS.homeMax+5,hy:P.y,state:'chase'});const c0=pd(c);step(20);if(pd(c)>c0+3)bad.push('backed away past its limit');if(c.state!=='chase')bad.push('gave up the chase');return done()}`));

await reset();
await test('Skirmishers flee once and return; others stand or rage', () => ev(`()=>{${TAC_SETUP}
  const a=add('nomad',30,0,{state:'chase'});a.hp=a.max*.2;const hp0=a.hp;let wind=0;step(2);if(!(a.fleeT>0))bad.push('did not flee');const d0=pd(a);step(30,()=>{if(a.wind>0)wind++});if(pd(a)<d0+40)bad.push('fled only '+(pd(a)-d0).toFixed(0));if(wind)bad.push('attacked while fleeing');step(240);if(a.fleeT>0)bad.push('never stopped fleeing');const back=pd(a);if(back>V.EN.nomad.range+V.EN.nomad.r+12)bad.push('did not come back, at '+back.toFixed(0));let again=0;step(45,()=>{if(a.fleeT>0)again++});if(again)bad.push('fled twice');if(a.hp!==hp0)bad.push('healed while fleeing');if(a.state!=='chase')bad.push('left the fight');
  G.enemies=[];const g=add('ghoul',30,0,{state:'chase'});g.hp=g.max*.2;step(5);if(g.fleeT>0)bad.push('a Ravager fled');if(!g.enr)bad.push('a Ravager did not rage');
  G.enemies=[];const g2=add('ghoul',30,0,{state:'chase'});step(5);if(g2.enr)bad.push('a healthy Ravager raged');
  G.enemies=[];const el=add('nomad',30,0,{state:'chase'});el.d={...el.d,elite:true};el.hp=el.max*.2;step(3);if(el.fleeT>0)bad.push('a hunted elite fled');
  G.enemies=[];const lim=add('nomad',30,0,{state:'chase',hx:P.x-V.TACTICS.homeMax+60,hy:P.y});lim.hp=lim.max*.2;const h=lim.hp;let top=0;step(90,()=>{top=Math.max(top,Math.hypot(lim.x-lim.hx,lim.y-lim.hy))});if(top>V.TACTICS.homeMax+6)bad.push('fled to '+top.toFixed(0)+' from home');if(lim.state!=='chase')bad.push('fleeing ended the chase');if(lim.hp!==h)bad.push('fleeing healed it');
  G.enemies=[];const st=add('nomad',20,0,{state:'chase',cd:0});st.hp=st.max*.2;m.solidAt=()=>true;let hits=0;step(40,()=>{if(st.wind>0)hits++});if(st.fleeT>0)bad.push('stayed frozen against a wall');if(!hits)bad.push('never fought again after being cornered');m.solidAt=()=>false;
  G.enemies=[];const r=add('rat',60,0,{state:'return'});r.hp=r.max*.2;r.fled=true;r.fleeT=2;r.enr=1;r.x=r.hx;r.y=r.hy;step(2);if(r.state!=='idle'&&pd(r)>300)bad.push('did not settle');if(r.fled&&r.state==='idle')bad.push('going home did not reset it');return done()}`));

await reset();
await test('Patrols walk a route near home and carry on when blocked', () => ev(`()=>{${TAC_SETUP}
  const FAR=600,idle={state:'idle'};const a=add('nomad',FAR,0,idle);step(1);if(!a.route)bad.push('a raider has no route');else{const seen=new Set(),r0=a.routeI;let top=0;for(let i=0;i<900;i++){V.update(1/15);P.iframes=1e9;seen.add(a.routeI%a.route.length);top=Math.max(top,Math.hypot(a.x-a.hx,a.y-a.hy))}if(seen.size<a.route.length)bad.push('visited '+seen.size+' of '+a.route.length+' points');if(top>V.TACTICS.patrol.r[1]+12)bad.push('strayed '+top.toFixed(0)+' from home');if(top<V.TACTICS.patrol.r[0]-12)bad.push('barely moved');if(a.state!=='idle')bad.push('left its patrol');
   const i0=a.routeI,p0=a.route[i0%a.route.length];a.x=p0[0]+40;a.y=p0[1];a.restT=0;m.solidAt=()=>true;step(3);if(a.routeI===i0)bad.push('froze when blocked');m.solidAt=()=>false}
  const rat=add('rat',FAR,200,idle);step(1);if(rat.route)bad.push('a rat got a route');const boss=add('qassar',FAR,-400,idle);step(1);if(boss.route)bad.push('a boss got a route');
  let w=0,n=0;for(let i=0;i<60;i++){const e=V.mkEnemy('wolf',20,P.x+FAR,P.y);n++;if(V.tacRoute(e))w++}if(w<15||w>45)bad.push(w+' of '+n+' wolves had routes');
  m.solidAt=solid;m.get=get;const towns=[];let total=0;for(const id of['vale','dunes','frost','gloam','ember','abbey']){V.enterMap(id);const M=G.map,town=M.zones.find(z=>z.s==='Town'||z.s==='Village'),g=V.TACTICS.patrol.townGap;let got=0;for(const e of G.enemies)for(let k=0;k<6;k++){const r=V.tacRoute(e);if(!r)continue;got++;for(const[x,y]of r.slice(1)){if(M.solidAt(x,y))bad.push(id+' route point in a wall');const tx=x/TS,ty=y/TS;if(town&&tx>=town.x0-g&&tx<=town.x1+g&&ty>=town.y0-g&&ty<=town.y1+g)bad.push(id+' route point in town')}}towns.push(id+':'+got);total+=got}if(!total)bad.push('no routes on any map');for(const id of['vale','dunes'])if(towns.includes(id+':0'))bad.push(id+' has no patrols');G.enemies=[];return bad.slice(0,8)}`));

await reset();
await test('Bosses, defend waves and the chase limit behave as before', () => ev(`()=>{${TAC_SETUP}
  const pack=[add('wolf',0,100,{state:'chase'}),add('wolf',20,100,{state:'chase'})];for(const e of pack){e.ev=true;e.taunt=99}const boss=add('qassar',-60,90,{state:'chase'});boss.hp=boss.max*.2;boss.spT=0;const spawned=[];let tac=0,moved=0;const x0=boss.x;
  step(60,()=>{for(const e of[...pack,boss]){if(e.flankT>0||e.fleeT>0||e.strafeT>0)tac++;if(e.side&&Math.abs(e.side)>.001&&e!==boss&&false)tac++}if(boss.route)tac++});if(tac)bad.push('tactics touched a boss or wave '+tac+' times');if(V.tacFree(boss)||V.tacFree(pack[0]))bad.push('boss or wave counted as free');if(V.tacFree({d:{},ev:true,taunt:0}))bad.push('a wave with no taunt left counted as free');if(pack.some(e=>pd(e)>V.EN.wolf.range+V.EN.wolf.r+6))bad.push('a wave wolf held back');G.boss=null;
  G.enemies=[];let n=0;const many=[];for(let i=0;i<5;i++){const e=add('ghoul',30*Math.cos(i),30*Math.sin(i),{state:'chase',cd:0,ev:true,taunt:99});many.push(e)}step(3,()=>{n=Math.max(n,many.filter(e=>e.wind>0).length)});if(n<4)bad.push('the attack limit held back defend waves: '+n);
  G.enemies=[];const r=add('rat',0,30,{state:'chase',hx:P.x+900,hy:P.y});step(2);if(r.state!=='return')bad.push('the chase limit no longer works, state '+r.state);return done()}`));

await reset();
await test('Fights run without errors in every zone', () => ev(`async()=>{const V=window.__veyl,bad=[];V.startNew('bulwark','Tester');const P=V.P,G=V.G,before=V.readErrors().length;for(const id of['vale','dunes','frost','gloam','ember','abbey']){V.enterMap(id);const L=G.enemies.filter(e=>!e.d.boss);if(!L.length){bad.push(id+' has no monsters');continue}P.x=L[0].x+40;P.y=L[0].y;for(let i=0;i<240;i++){P.hp=1e7;P.dead=false;V.update(1/30);if(i===120)for(const e of G.enemies)if(!e.d.boss&&e.state==='chase')e.hp=e.max*.2}}V.enterMap('vale',G.maps.vale.start);V.update(1/30);await new Promise(r=>setTimeout(r,300));if(V.readErrors().length>before)bad.push('errors: '+V.readErrors().slice(before).join(' | ').slice(0,300));return bad}`));

// Enemy senses (7.b.2). wallAt puts one column of a chosen tile between the hero and anything east of them.
const SENSE_SETUP = TAC_SETUP + `const wallAt=(dx,tile)=>{const c=Math.floor((P.x+dx)/TS);m.get=(x,y)=>x===c?tile:0},noWall=()=>{m.get=()=>0},face=(e,away)=>{const r=Math.atan2(P.x-e.x,P.y-e.y)+(away?Math.PI:0);e.rot=r;e.trot=r;e.wander=1e9;return e},idle={state:'idle'},noted=s=>G.texts.some(t=>t.s===s);`;

await reset();
await test('Monsters notice what is in front of them, and only trees, rocks and walls hide you', () => ev(`()=>{${SENSE_SETUP}
  const behind=face(add('ghoul',100,0,idle),true);step(45);if(behind.state!=='idle'||behind.aware)bad.push('noticed a quiet hero behind it');
  G.enemies=[];const front=face(add('ghoul',100,0,idle));G.texts.length=0;step(2);if(!front.aware)bad.push('did not grow suspicious');if(!noted('?'))bad.push('no ? shown');step(30);if(front.state!=='chase')bad.push('never spotted a hero in front of it, state '+front.state);if(!noted('!'))bad.push('no ! shown');
  G.enemies=[];const near=face(add('ghoul',50,0,idle),true);step(2);if(near.state!=='chase')bad.push('did not notice a hero right beside it');
  for(const[name,tile,hides]of[['a wall',V.T.WALL,true],['a tree',V.T.TREE,true],['a rock',V.T.ROCK,true],['a pillar',V.T.PILLAR,true],['water',V.T.WATER,false],['the path',V.T.PATH,false]]){G.enemies=[];wallAt(50,tile);const e=face(add('ghoul',100,0,idle));step(30);const saw=e.state==='chase';if(hides&&saw)bad.push(name+' did not hide the hero');if(!hides&&!saw)bad.push(name+' hid the hero')}noWall();return done()}`));

await reset();
await test('Sound makes monsters curious but never sure, and they forget', () => ev(`()=>{${SENSE_SETUP}
  const n=V.TACTICS.senses.noise;P.mv=0;P.sprint=false;P.mounted=false;G.noiseT=-99;P.lastHurt=-99;if(V.tacNoise()!==0)bad.push('standing still made noise');P.mv=1;const w=V.tacNoise();P.sprint=true;const s=V.tacNoise();P.sprint=false;P.mounted=true;const r=V.tacNoise();P.mounted=false;P.mv=0;if(!(w>0&&s>w&&r>s))bad.push('noise walk '+w+' sprint '+s+' ride '+r);
  const e=face(add('wolf',270,0,idle),true),d0=pd(e);let top=0,sure=false;step(15);if(e.aware)bad.push('heard a silent hero');G.time=G.time;step(60,()=>{G.noiseT=G.time;top=Math.max(top,e.sus);if(e.state!=='idle')sure=true});if(!e.aware)bad.push('did not hear a fight');if(top>V.TACTICS.senses.hearCap+.001)bad.push('hearing reached '+top.toFixed(2));if(sure)bad.push('hearing alone started a fight');if(pd(e)>=d0-5)bad.push('did not come to look');
  G.noiseT=-99;P.x-=2000;step(330);if(e.aware)bad.push('never forgot');if(e.state!=='idle')bad.push('did not settle, state '+e.state);if(e.lx!=null)bad.push('kept a stale last position');return done()}`));

await reset();
await test('Monsters hunt where they last saw you, then give up', () => ev(`()=>{${SENSE_SETUP}
  const a=add('wolf',120,0,{root:2});step(3);const lx=a.lx;if(lx!==P.x)bad.push('did not record the hero');wallAt(50,V.T.WALL);G.texts.length=0;step(25);if(a.state!=='hunt')bad.push('did not start hunting, state '+a.state);if(!noted('?'))bad.push('no ? when hunting');a.root=0;
  P.x-=600;const before=pd(a);step(20);if(a.lx!==lx)bad.push('tracked a silent hero through a wall');if(pd(a)>=before)bad.push('did not walk to the last known spot');P.x+=600;
  noWall();step(8);if(a.state!=='chase')bad.push('did not spot the hero again, state '+a.state);if(!noted('!'))bad.push('no ! on spotting again');
  G.enemies=[];const f=add('rat',120,0,{root:2}),w=add('wolf',120,200,{root:2});m.get=()=>V.T.WALL;const o=[f,w];const left={};step(25);if(f.state!=='hunt'||w.state!=='hunt')bad.push('the pair did not start hunting');P.x-=2000;let t=0;for(let i=0;i<300;i++){V.update(1/30);P.iframes=1e9;P.faceLock=1e9;t++;for(const e of o)if(e.state!=='hunt'&&left[e.type]==null)left[e.type]=t}P.x+=2000;if(left.rat==null||left.wolf==null)bad.push('did not give up: '+JSON.stringify(left));else if(left.rat>=left.wolf)bad.push('a Skirmisher outlasted a Stalker: '+JSON.stringify(left));
  noWall();G.enemies=[];const h=add('ghoul',120,0,{state:'hunt',huntT:5,hsx:0,hsy:0,lx:P.x,ly:P.y});m.get=()=>V.T.WALL;V.hitEnemy(h,{a:1,crit:false});if(h.state!=='chase')bad.push('a hit did not alert a hunter');if(h.lx!==P.x)bad.push('a hit did not reveal the hero');
  G.enemies=[];const lim=add('wolf',120,0,{state:'hunt',huntT:60,hsx:0,hsy:0,lx:P.x,ly:P.y,hx:P.x+900,hy:P.y});step(2);if(lim.state!=='return')bad.push('hunted too far from home');
  G.enemies=[];const st=add('wolf',200,0,{state:'hunt',huntT:1,hsx:0,hsy:0,lx:P.x-400,ly:P.y});m.solidAt=()=>true;const x0=st.x;step(45);if(st.state==='hunt')bad.push('froze against a wall');m.solidAt=()=>false;noWall();return done()}`));

await reset();
await test('Packs hunt in different spots and one sighting rallies them', () => ev(`()=>{${SENSE_SETUP}
  m.get=()=>V.T.WALL;const o={state:'hunt',huntT:30,lx:P.x+200,ly:P.y};const a=add('ghoul',260,0,{...o,hsx:50,hsy:0}),b=add('ghoul',260,40,{...o,hsx:-50,hsy:0});step(90);if(Math.hypot(a.x-b.x,a.y-b.y)<40)bad.push('both searched the same spot');
  noWall();a.x=P.x+80;a.y=P.y;a.hx=a.x;a.hy=a.y;b.x=P.x+150;b.y=P.y;b.hx=b.x;b.hy=b.y;const c=add('ghoul',600,0,{...o});step(2);if(a.state!=='chase')bad.push('did not spot the hero');if(b.state!=='chase')bad.push('a packmate was not rallied');if(c.state==='chase')bad.push('a far hunter was rallied');return done()}`));

await reset();
await test('Ranged monsters hold fire without a clear view and search from a distance', () => ev(`()=>{${SENSE_SETUP}
  const R=V.EN.wraith.range;wallAt(50,V.T.WALL);G.projs=[];const a=add('wraith',R*.7,0,{cd:0,spT:0});step(10);if(G.projs.length)bad.push('shot through a wall');noWall();step(12);if(!G.projs.length)bad.push('did not shoot once it could see');
  m.get=()=>V.T.WALL;G.enemies=[];const h=add('wraith',300,0,{state:'hunt',huntT:30,hsx:0,hsy:0,lx:P.x,ly:P.y});step(150);const keep=R*V.TACTICS.ranged.keep;if(pd(h)<keep-8)bad.push('came in to '+pd(h).toFixed(0)+', keeping '+keep.toFixed(0));if(pd(h)>keep+12)bad.push('stopped at '+pd(h).toFixed(0));noWall();return done()}`));

await reset();
await test('Bosses, defend waves and taunted monsters always know where you are', () => ev(`()=>{${SENSE_SETUP}
  const b=face(add('qassar',150,0,idle),true);step(2);if(b.state!=='chase')bad.push('a boss behind you did not notice at once');
  G.boss=null;G.enemies=[];m.get=()=>V.T.WALL;const c=add('qassar',150,0);c.mvT=1e9;step(45);if(c.state!=='chase')bad.push('a boss lost sight, state '+c.state);G.boss=null;
  G.enemies=[];const w=add('wolf',150,0,{ev:true,taunt:99});step(45);if(w.state!=='chase')bad.push('a defend wave lost sight, state '+w.state);
  G.enemies=[];const t=add('wolf',150,0,{taunt:99});step(45);if(t.state!=='chase')bad.push('a taunted monster lost sight, state '+t.state);
  G.enemies=[];const s=add('wolf',150,0,{summoned:true});step(45);if(s.state!=='chase')bad.push('a summoned monster lost sight, state '+s.state);noWall();return done()}`));

await reset();
await test('Curious monsters stay out of town and off a dead hero', () => ev(`()=>{${SENSE_SETUP}
  const z=m.zones.find(q=>q.s==='Town');P.x=(z.x1-1)*TS;P.y=((z.y0+z.y1)/2)*TS;const e=face(add('wolf',(1+3)*TS+80,0,idle),true),hx=e.hx;step(150,()=>{G.noiseT=G.time});if(!e.aware)bad.push('did not hear the hero');if(e.x<(z.x1)*TS)bad.push('walked into town');
  G.enemies=[];const d=face(add('ghoul',100,0,idle));step(2);if(!d.aware)bad.push('did not grow suspicious');P.dead=true;step(3);if(d.aware)bad.push('stayed suspicious of a dead hero');P.dead=false;
  G.enemies=[];const h=add('wolf',120,0,{state:'hunt',huntT:30,hsx:0,hsy:0,lx:P.x,ly:P.y});P.dead=true;step(2);if(h.state==='hunt')bad.push('hunted a dead hero');P.dead=false;return done()}`));

// Day and night (25.b).
const ZONES = `['vale','dunes','frost','gloam','ember']`;
const BRIGHT = `(e)=>{const k=[.2126,.7152,.0722];let v=0;for(let i=0;i<3;i++)v+=k[i]*(e.sky[i]+e.sun[i]*.667)*e.exp;return v}`;

await reset();
await test('A day is an hour: 45 minutes of daylight, 15 of night, with no sudden changes', () => ev(`()=>{const V=window.__veyl,bad=[],T=V.WORLDTIME,c=V.worldClock;let night=0,clear=0,jump=0,last=null;const seen={};for(let s=0;s<T.cycle;s++){const x=c(s*1000);seen[x.phase]=(seen[x.phase]||0)+1;if(x.night===1)night++;if(x.night===0)clear++;if(last!=null&&Math.abs(x.night-last)>.02)jump++;last=x.night}
  if(T.cycle!==3600||T.night!==900)bad.push('the spec is one hour with 15 minutes of night');if(night<899||night>902)bad.push(night+' seconds of full night');if(clear<2700-2*T.fade-2||clear>2700-2*T.fade+2)bad.push(clear+' seconds of full day');if(jump)bad.push(jump+' sudden changes');for(const p of['day','dawn','dusk','night'])if(!seen[p])bad.push('no '+p);if(c(7200000+5000).t!==5)bad.push('the clock did not wrap');if(c(-1000).t!==3599)bad.push('a clock set before 1970 broke it');
  for(const p of['day','dawn','dusk','night']){const x=c(T.presets[p]*1000);if(x.phase!==p)bad.push('the '+p+' preset gave '+x.phase)}return bad}`));

await reset();
await test('Daytime is unchanged, night is darker in every zone, and the Abbey never changes', () => ev(`()=>{const V=window.__veyl,bad=[],G=V.G,T=V.TIMEO,B=${BRIGHT};V.startNew('reaver','Tester');T.weather='clear';const same=(a,b,keys)=>keys.every(k=>JSON.stringify(a[k])===JSON.stringify(b[k])),keys=['sun','sky','gnd','fog','top','hor','sunC','mtn','rimC','fogN','fogF','fogMax','exp'];
  for(const id of ${ZONES}){V.enterMap(id);T.time='day';const d=V.sceneEnv();if(!same(d,V.baseEnv(),keys))bad.push(id+' changed by day');T.time='night';const n=V.sceneEnv();if(n.night!==1)bad.push(id+' night is '+n.night);const bd=B(d),bn=B(n);if(bn>=bd)bad.push(id+' is no darker at night');if(bn<.25)bad.push(id+' night is too dark to read: '+bn.toFixed(2));if(bn>.85)bad.push(id+' night is too bright: '+bn.toFixed(2));T.time='dusk';const u=V.sceneEnv();if(!(u.night>0&&u.night<1))bad.push(id+' has no dusk');if(JSON.stringify(u.hor)===JSON.stringify(mix(d.hor,n.hor,u.night)))bad.push(id+' dusk has no warm glow');if(n.fogF<40)bad.push(id+' night fog closes in at '+n.fogF)}
  function mix(a,b,f){return a.map((v,i)=>v+(b[i]-v)*f)}
  V.enterMap('abbey');const a0=(T.time='day',V.sceneEnv());T.time='night';const a1=V.sceneEnv();if(!same(a0,a1,keys))bad.push('the Abbey changed at night');if(a1.night!==0)bad.push('the Abbey has a night value');T.time=null;T.weather=null;V.enterMap('vale',G.maps.vale.start);return bad}`));

await reset();
await test('Saves are unchanged, and nothing about the time is stored', () => ev(`()=>{const V=window.__veyl,bad=[];V.startNew('reaver','Tester');V.TIMEO.time='night';const d=V.serialize(),t=JSON.stringify(d);if(d.v!==5)bad.push('save version became '+d.v);if(/night|weather|clock|worldTime/i.test(Object.keys(d).join(',')))bad.push('time got saved');V.loadSave(JSON.parse(t));V.update(1/30);V.TIMEO.time=null;return bad}`));

await reset();
await test('The sun or moon by the compass follows the time, and hides in the Abbey', () => ev(`()=>{const V=window.__veyl,bad=[],T=V.TIMEO;V.startNew('reaver','Tester');const el=document.getElementById('dayIcon');if(!el){bad.push('no icon');return bad}for(const[p,name]of[['day','Day'],['dawn','Dawn'],['dusk','Dusk'],['night','']]){T.time=p;V.dayIcon();const want=name||V.moonNow().name;if(!el.title.startsWith(want+'.'))bad.push(p+' showed '+el.title);if(!el.textContent)bad.push(p+' has no icon');if(el.hidden)bad.push(p+' hid the icon')}T.time='day';V.dayIcon();const d=el.textContent;T.time='night';V.dayIcon();if(el.textContent===d)bad.push('day and night share an icon');V.enterMap('abbey');V.dayIcon();if(!el.hidden)bad.push('showed in the Abbey');V.enterMap('vale',V.G.maps.vale.start);V.dayIcon();if(el.hidden)bad.push('stayed hidden');T.time=null;return bad}`));

await reset();
await test('Every zone draws without errors at every time of day', async () => {
  const problems = await ev(`async()=>{const V=window.__veyl,bad=[],G=V.G,T=V.TIMEO;V.startNew('reaver','Tester');const before=V.readErrors().length;const wait=()=>new Promise(r=>setTimeout(r,260));for(const id of[...${ZONES},'abbey']){V.enterMap(id);for(const t of['day','dawn','dusk','night']){T.time=t;await wait()}}T.time=null;V.enterMap('vale',G.maps.vale.start);await wait();if(V.readErrors().length>before)bad.push(V.readErrors().slice(before).join(' | ').slice(0,300));return bad}`);
  return [...problems, ...logs.filter(l => !/GPU stall|GroupMarker|swiftshader/i.test(l)).slice(0, 3)];
});

await test('A ?time= link holds the time, and a bad one is ignored', async () => {
  const bad = [];
  await send('Page.navigate', { url: url + '?time=night' }); await sleep(3000);
  if ((await ev(`()=>window.__veyl.worldNow().phase`)) !== 'night') bad.push('?time=night did not hold night');
  await send('Page.navigate', { url: url + '?time=banana' }); await sleep(3000);
  if ((await ev(`()=>window.__veyl.TIMEO.time`)) !== null) bad.push('a bad value was accepted');
  await send('Page.navigate', { url }); await sleep(3000);
  if ((await ev(`()=>window.__veyl.TIMEO.time`)) !== null) bad.push('a plain link held a time');
  return bad;
});

// Weather (25.b).
await reset();
await test('Weather comes about a third of the time, fades in and out, and is the same for everyone', () => ev(`()=>{const V=window.__veyl,bad=[],X=V.WX,base=1793000000000;for(const id of ${ZONES}){const w0=V.weatherAt(id,base);let on=0,big=0,last=w0?w0.s:0,total=0,rise=null,fastest=1e9;const kinds=new Set();for(let s=0;s<86400*3;s+=5){const w=V.weatherAt(id,base+s*1000),v=w?w.s:0;total++;if(w){on++;kinds.add(w.k);if(v<0||v>1)bad.push(id+' strength '+v)}if(Math.abs(v-last)>5/X.fade+.001)big++;if(last===0&&v>0)rise=s;if(rise!=null&&v>=1){fastest=Math.min(fastest,s-rise);rise=null}last=v}
   const sh=on/total;if(sh<.3||sh>.37)bad.push(id+' has weather '+(sh*100).toFixed(0)+'% of the time');if(big)bad.push(id+' weather jumped '+big+' times');if(fastest<X.fade-10)bad.push(id+' faded in in '+fastest+' seconds');for(const k of X.zones[id])if(!kinds.has(k))bad.push(id+' never gets '+k);for(const k of kinds)if(!X.zones[id].includes(k))bad.push(id+' got '+k);const a=JSON.stringify(V.weatherAt(id,base+777000));if(a!==JSON.stringify(V.weatherAt(id,base+777000)))bad.push(id+' weather is not the same each time')}
  if(V.weatherAt('abbey',base)!==null)bad.push('it rains in the Abbey');let differ=0;for(let s=0;s<86400;s+=300){const a=V.weatherAt('vale',base+s*1000),b=V.weatherAt('dunes',base+s*1000);if(!!a!==!!b)differ++}if(!differ)bad.push('every zone has the same weather at once');return bad}`));

await reset();
await test('Bad weather never hides the world, by day or night, and stays out of the Abbey', () => ev(`()=>{const V=window.__veyl,bad=[],G=V.G,T=V.TIMEO,X=V.WX,B=${BRIGHT};V.startNew('reaver','Tester');for(const id of ${ZONES}){V.enterMap(id);for(const k of X.zones[id])for(const t of['day','night']){T.time=t;T.weather='clear';const clear=V.sceneEnv();T.weather=k;const e=V.sceneEnv();if(e.fogF<X.minFogF&&clear.fogF>=X.minFogF)bad.push(id+' '+k+' '+t+' sees only '+e.fogF.toFixed(0));if(e.fogF>clear.fogF)bad.push(id+' '+k+' '+t+' sees further than clear weather');if(!(e.fogN<e.fogF))bad.push(id+' '+k+' '+t+' fog near '+e.fogN+' far '+e.fogF);if(t==='night'&&B(e)<.22)bad.push(id+' '+k+' at night is too dark: '+B(e).toFixed(2));if(B(e)>B(clear))bad.push(id+' '+k+' '+t+' is brighter than clear');for(const c of['fog','top','hor','sun'])if(e[c].some(v=>!isFinite(v)||v<0))bad.push(id+' '+k+' bad '+c)}}
  V.enterMap('abbey');T.weather='rain';T.time='day';const a=JSON.stringify(V.sceneEnv().fog),b=JSON.stringify(V.baseEnv().fog);if(a!==b)bad.push('weather reached the Abbey');if(V.weatherNow()!==null)bad.push('the Abbey has weather');T.time=null;T.weather=null;V.enterMap('vale',G.maps.vale.start);return bad}`));

await reset();
await test('Weather specks appear when they should, and every zone draws without errors', async () => {
  const problems = await ev(`async()=>{const V=window.__veyl,bad=[],G=V.G,T=V.TIMEO,X=V.WX;V.startNew('reaver','Tester');const before=V.readErrors().length,wait=(n=350)=>new Promise(r=>setTimeout(r,n));for(const id of ${ZONES}){V.enterMap(id);for(const k of X.zones[id])for(const t of['day','night']){T.time=t;T.weather=k;await wait();const K=X.kinds[k];if(K.parts){for(let i=0;i<25&&!V.WXP.length;i++)await wait(200);const c=V.WXP.length;if(c<1)bad.push(id+' '+k+' has no specks');if(c>K.parts.n)bad.push(id+' '+k+' has '+c+' specks')}else{await wait(600);if(V.WXP.length)bad.push(id+' '+k+' should have no specks')}}}T.weather=null;T.time='day';V.enterMap('abbey');await wait(1500);if(V.WXP.length)bad.push('specks in the Abbey');T.time=null;V.enterMap('vale',G.maps.vale.start);await wait();const e=V.readErrors();if(e.length>before)bad.push(e.slice(before).join(' | ').slice(0,300));return bad}`);
  await send('Page.navigate', { url: url + '?weather=rain&time=night' }); await sleep(3000);
  const held = await ev(`()=>[window.__veyl.TIMEO.weather,window.__veyl.TIMEO.time]`);
  if (held[0] !== 'rain' || held[1] !== 'night') problems.push('the ?weather= link gave ' + held);
  await send('Page.navigate', { url: url + '?weather=clear' }); await sleep(3000);
  if ((await ev(`()=>window.__veyl.TIMEO.weather`)) !== 'clear') problems.push('?weather=clear did not hold');
  await send('Page.navigate', { url: url + '?weather=frogs' }); await sleep(3000);
  if ((await ev(`()=>window.__veyl.TIMEO.weather`)) !== null) problems.push('?weather=frogs was accepted');
  return problems;
});

// The moon (44.a).
await reset();
await test('The moon follows the clock: 28 in-game days, eight phases, four moon nights', () => ev(`()=>{const V=window.__veyl,M=V.MOON,bad=[],H=3600000,base=1793000000000-1793000000000%(28*H);
  const names=new Set(),evs={};for(let d=0;d<28;d++){const c=V.moonAt(base+(d+.9)*H);if(c.day!==d)bad.push('day '+d+' read as '+c.day);names.add(c.name);if(c.ev)(evs[c.ev]=evs[c.ev]||[]).push(d);if(!(c.p>=0&&c.p<1))bad.push('day '+d+' phase '+c.p)}
  if(names.size!==8)bad.push(names.size+' phase names');for(const k in M.events){const want=[-1,0,1].map(o=>(M.events[k].day+o+28)%28).sort((a,b)=>a-b),got=(evs[k]||[]).sort((a,b)=>a-b);if(JSON.stringify(want)!==JSON.stringify(got))bad.push(k+' moon nights fall on days '+got)}
  for(const k in M.events){const c=V.moonAt(base+(M.events[k].day+.9)*H);if(!c.name.toLowerCase().startsWith(k==='first'?'first':k==='last'?'last':k))bad.push(k+' night is named '+c.name)}
  if(V.moonAt(base).cycle+1!==V.moonAt(base+28*H).cycle)bad.push('a cycle is not 28 hours');if(JSON.stringify(V.moonAt(base+5e6))!==JSON.stringify(V.moonAt(base+5e6)))bad.push('the moon is not the same for everyone');return bad}`));

await test('Moon spots are reachable, out of towns and boss arenas, and every zone has its shadow creatures', () => ev(`()=>{const V=window.__veyl,M=V.MOON,bad=[];V.startNew('reaver','Tester');
  for(const id of ['vale','dunes','frost','gloam','ember']){V.enterMap(id);const m=V.G.map,town=m.zones.find(z=>z.s==='Town'||z.s==='Village');
   for(const what of ['mark','cache']){const s=M.spots[id]&&M.spots[id][what];if(!s){bad.push(id+' has no '+what);continue}const[x,y]=V.walkSpot(m,s[0]+.5,s[1]+.5),v=m.get(Math.floor(x),Math.floor(y));
    if(v<0||V.SOLID[v])bad.push(id+' '+what+' is not on open ground');if(Math.hypot(x-s[0]-.5,y-s[1]-.5)>3)bad.push(id+' '+what+' moved '+Math.hypot(x-s[0],y-s[1]).toFixed(1)+' tiles to find ground');
    if(m.arena&&Math.hypot(x-m.arena.x,y-m.arena.y)<m.arena.r+2)bad.push(id+' '+what+' is in the boss arena');if(town&&x>=town.x0&&x<=town.x1&&y>=town.y0&&y<=town.y1)bad.push(id+' '+what+' is in town')}
   const types=new Set((m.spawns||[]).map(s=>s.type));for(const t of M.shadow[id]||[])if(!types.has(t))bad.push(id+': '+t+' never spawns there');if(!(M.shadow[id]||[]).length)bad.push(id+' has no shadow creatures')}
  V.enterMap('vale',V.G.maps.vale.start);return bad}`));

await test('Moon nights: more shadows, moonlit elites, a Warden marking and a relic cache, once per cycle', () => ev(`()=>{const V=window.__veyl,M=V.MOON,O=V.MOONO,T=V.TIMEO,G=V.G,bad=[],tick=()=>{G.moonT=0;V.moonTick(1)};V.startNew('reaver','Tester');T.time='night';
  O.moon='new';V.enterMap('vale',G.maps.vale.start);const n0=G.enemies.length;tick();const want=G.map.spawns.filter(s=>M.shadow.vale.includes(s.type)).reduce((a,s)=>a+Math.round(s.n*M.extra),0),extra=G.enemies.filter(e=>e.moonX).length;
  if(extra!==want)bad.push('new moon added '+extra+' shadows, not '+want);if(G.enemies.some(e=>e.moonX&&!M.shadow.vale.includes(e.type)))bad.push('a non-shadow creature was added');if(G.enemies.length!==n0+want)bad.push('monster count '+G.enemies.length);
  tick();if(G.enemies.filter(e=>e.moonX).length!==want)bad.push('shadows were added twice');
  const ch=M.eliteChance;M.eliteChance=1;O.moon='full';tick();if(G.enemies.some(e=>e.moonX))bad.push('new moon shadows stayed after it ended');const el=G.enemies.filter(e=>e.moonElite);M.eliteChance=ch;
  const can=G.enemies.filter(e=>!e.dead&&!e.d.boss&&!e.elite&&!e.summoned&&!e.ev);if(el.length!==can.length)bad.push(el.length+' of '+can.length+' became elites');const e=el[0];
  if(e){if(!/^Moonlit /.test(e.d.name))bad.push('elite is named '+e.d.name);if(!(e.max>e.mBase.max*2))bad.push('elite health '+e.max);if(V.EN[e.type].name.startsWith('Moonlit'))bad.push('the monster table changed');
   const g=V.P.gems?JSON.stringify(V.P.gems):'';e.hp=1;V.hitEnemy(e,{a:99999},{quiet:true});if(!e.dead)bad.push('elite did not die');if((V.P.gems?JSON.stringify(V.P.gems):'')===g)bad.push('elite gave no gem');
   e.respawn=.01;V.P.x=e.hx+5000;V.P.y=e.hy;V.update(1/30);V.update(1/30);if(e.moonElite&&G.moonK!=='full')bad.push('elite respawned as elite');V.P.x=G.map.start.x;V.P.y=G.map.start.y}
  O.moon='first';tick();if(G.enemies.some(e=>e.moonElite&&!e.dead&&e.state!=='chase'))bad.push('elites stayed after the full moon');const mk=(G.moonO||[]).find(o=>o.what==='mark');if(!mk)bad.push('no Warden marking on the first-quarter night');
  if(mk){const g0=V.P.gold,x0=V.P.xp+V.P.lvl*1e9;V.useMoon(mk);if(!(V.P.gold>g0))bad.push('the marking gave no gold');if(!(V.P.xp+V.P.lvl*1e9>x0))bad.push('the marking gave no XP');if(G.moonO.length)bad.push('the marking stayed after use');
   V.enterMap('vale',G.maps.vale.start);tick();if(G.moonO.length)bad.push('the marking came back in the same cycle');if((V.P.moon.mark||{}).vale!==mk.cycle)bad.push('the marking was not remembered')}
  O.moon='last';tick();const ca=(G.moonO||[]).find(o=>o.what==='cache');if(!ca)bad.push('no relic cache on the last-quarter night');
  if(ca){const b0=V.P.bag.length,q0=V.P.bag.filter(i=>i.slot==='mat').reduce((a,i)=>a+i.qty,0),g0=V.P.gold;V.useMoon(ca);const q1=V.P.bag.filter(i=>i.slot==='mat').reduce((a,i)=>a+i.qty,0);if(!(q1>q0))bad.push('the cache gave no materials');if(!(V.P.gold>g0))bad.push('the cache gave no gold')}
  O.moon='last';V.enterMap('dunes');tick();if(!(G.moonO||[]).some(o=>o.what==='cache'))bad.push('the dunes cache is missing after taking the Veylmoor one');
  T.time='day';tick();if(G.moonO.length)bad.push('moon objects stayed by day');if(V.moonEvent()!==null)bad.push('a moon night by day');V.enterMap('abbey');T.time='night';if(V.moonEvent()!==null)bad.push('a moon night in the Abbey');
  const d=V.serialize();V.loadSave(JSON.parse(JSON.stringify(d)));if(!V.P.moon||(V.P.moon.mark||{}).vale!==0)bad.push('moon rewards were not saved');const old=JSON.parse(JSON.stringify(d));delete old.moon;V.loadSave(old);if(!V.P.moon||typeof V.P.moon!=='object')bad.push('an old save has no moon record');
  O.moon=null;T.time=null;V.enterMap('vale',G.maps.vale.start);return bad}`));

await test('The compass moon shows the phase at night and tapping it tells you about the moon', () => ev(`()=>{const V=window.__veyl,T=V.TIMEO,O=V.MOONO,bad=[];V.startNew('reaver','Tester');const el=document.getElementById('dayIcon');
  T.time='night';for(const k of ['new','first','full','last']){O.moon=k;V.dayIcon();const c=V.moonNow();if(el.textContent!==c.icon)bad.push(k+' shows '+el.textContent);el.click();const t=document.getElementById('toasts').innerText;if(!t.includes(c.name))bad.push('tapping at '+k+' said: '+t.slice(0,80));if(!/full moon in/.test(t))bad.push('no next full moon in: '+t.slice(0,80))}
  O.moon=null;T.time='day';V.dayIcon();if(/[\u{1F311}-\u{1F318}]/u.test(el.textContent))bad.push('the moon shows by day');T.time=null;if(document.querySelector('.panel:not([hidden])#mapPanel'))bad.push('tapping opened the map');return bad}`));

await test('The ?moon= link holds a phase at night, and the moon draws in every zone without errors', async () => {
  const problems = [];
  await send('Page.navigate', { url: url + '?moon=full' }); await sleep(3000);
  const held = await ev(`()=>[window.__veyl.MOONO.moon,window.__veyl.TIMEO.time]`);
  if (held[0] !== 'full' || held[1] !== 'night') problems.push('the ?moon=full link gave ' + held);
  const drawn = await ev(`async()=>{const V=window.__veyl,bad=[],before=V.readErrors().length;V.startNew('lumen','Tester');for(const id of ['vale','dunes','frost','gloam','ember','abbey']){V.enterMap(id);await new Promise(r=>setTimeout(r,500))}V.enterMap('vale',V.G.maps.vale.start);const e=V.readErrors();if(e.length>before)bad.push(e.slice(before).join(' | ').slice(0,300));return bad}`);
  problems.push(...drawn);
  await send('Page.navigate', { url: url + '?moon=blue&time=day' }); await sleep(3000);
  const bad = await ev(`()=>[window.__veyl.MOONO.moon,window.__veyl.TIMEO.time]`);
  if (bad[0] !== null || bad[1] !== 'day') problems.push('?moon=blue gave ' + bad);
  return [...problems, ...logs];
});

// Achievements and titles (11.a).
await reset();
await test('Achievement data is sound and every achievement can be earned', () => ev(`()=>{const V=window.__veyl,bad=[],ids=new Set(),groups=new Set(V.ACHG.map(g=>g[0]));V.startNew('bulwark','Tester');
  for(const d of V.ACH){if(ids.has(d.id))bad.push('duplicate '+d.id);ids.add(d.id);if(!groups.has(d.g))bad.push(d.id+': unknown group '+d.g);if(!d.n||!d.d)bad.push(d.id+': no name or text');const g=typeof d.goal==='function'?d.goal():d.goal;if(!(g>=1))bad.push(d.id+': goal '+g);const v=d.v();if(!(v>=0))bad.push(d.id+': value '+v)}
  if(V.ACH.length<25)bad.push('only '+V.ACH.length+' achievements');const ts=V.ACH.filter(d=>d.t).map(d=>d.t);if(new Set(ts).size!==ts.length)bad.push('two achievements give the same title');if(ts.length<6)bad.push('only '+ts.length+' titles');
  if(V.achCheck(false).length)bad.push('a new hero earned something already');return bad}`));

await test('Kills, gathering, forging, fusing, places, quests and bosses all count, and a title can be worn', () => ev(`()=>{const V=window.__veyl,G=V.G,bad=[];V.startNew('thornstalker','Tester');const P=V.P,A=V.achS(),got=id=>!!V.achS().got[id];
  for(let i=0;i<100;i++){const e=V.mkEnemy('rat',1,P.x+40,P.y);G.enemies.push(e);V.killEnemy(e)}if(A.c.kills!==100)bad.push('counted '+A.c.kills+' kills');V.achCheck(true);if(!got('kill100'))bad.push('100 kills not earned');if(got('kill500'))bad.push('500 kills earned early');
  const k0=A.c.kills,e=V.mkEnemy('rat',1,P.x+40,P.y);G.enemies.push(e);V.killEnemy(e);V.killEnemy(e);if(A.c.kills!==k0+1)bad.push('a monster killed twice counted twice');
  const me=V.mkEnemy('wolf',5,P.x+40,P.y);G.enemies.push(me);V.moonElite(me);V.killEnemy(me);if(A.c.moonElites!==1)bad.push('moonlit elite not counted');
  P.bosses.vale=true;P.bosses.dunes=true;V.achCheck(true);if(!got('b_vale')||!got('b_dunes'))bad.push('bosses not earned');if(got('b_all'))bad.push('all bosses earned with two');
  for(const q of V.QUESTS.slice(0,10))P.q[q.id]={s:'done',n:q.n};V.achCheck(true);if(!got('q10'))bad.push('10 quests not earned');
  V.enterMap('vale');const m=G.map;for(const z of m.zones)V.achSeen(m,z.n);V.achCheck(true);if(!got('x_vale'))bad.push('all Veylmoor places visited but not earned');if(got('x_dunes'))bad.push('Dunes earned without visiting');
  V.achSeen(m,m.zones[0].n);if(A.seen.vale.length!==m.zones.length)bad.push('a place counted twice');
  A.c.kills=2000;const out=V.achCheck(false);if(!out.some(d=>d.id==='kill2000'))bad.push('2000 kills did not unlock');if(!/Monster Slayer/.test(document.getElementById('toasts').innerText))bad.push('no unlock toast');
  V.openPanel('char');document.querySelector('#book [data-act="ctab"][data-t="ach"]').click();const bk=()=>document.querySelector('#book').innerText;if(!/achievements earned/.test(bk()))bad.push('no Achievements tab');
  const tb=document.querySelector('#book [data-act="achtitle"][data-k="kill2000"]');if(!tb)bad.push('no title button');else{tb.click();if(V.achTitle()!=='Monster Slayer')bad.push('title not worn: '+V.achTitle())}
  if(document.querySelector('#book [data-act="achtitle"][data-k="huntall"]'))bad.push('an unearned title can be chosen');document.querySelector('#book [data-act="ctab"][data-t="eq"]').click();if(!/Monster Slayer/.test(bk()))bad.push('title not under the name');
  document.querySelector('#book [data-act="ctab"][data-t="ach"]').click();document.querySelector('#book [data-act="achtitle"][data-k=""]').click();if(V.achTitle())bad.push('title not removed');V.closePanel();
  const g0=P.gold,x0=P.xp;V.achCheck(false);if(P.gold!==g0||P.xp!==x0)bad.push('an achievement gave gold or XP');return bad}`));

await test('Achievements survive saving, and an old hero gets credit at once without toasts', () => ev(`()=>{const V=window.__veyl,bad=[];V.startNew('ashcaller','Saver');const P=V.P,A=V.achS();A.c.kills=150;A.c.gathered=7;V.achCheck(true);A.title=null;
  const d=JSON.parse(JSON.stringify(V.serialize()));V.loadSave(d);const B=V.achS();if(B.c.kills!==150||B.c.gathered!==7)bad.push('counters lost: '+JSON.stringify(B.c));if(!B.got.kill100)bad.push('earned achievement lost');
  const old=JSON.parse(JSON.stringify(d));delete old.ach;old.bosses={vale:true,dunes:true,frost:true,gloam:true,ember:true};const qs=V.QUESTS;old.q={};for(const q of qs)old.q[q.id]={s:'done',n:q.n};document.getElementById('toasts').innerHTML='';V.loadSave(old);const C=V.achS();
  for(const id of ['b_all','qall','q25','qzone','huntall'])if(!C.got[id])bad.push('old hero not credited with '+id);if(C.c.kills)bad.push('old hero has kills '+C.c.kills);if(/Achievement/.test(document.getElementById('toasts').innerText))bad.push('loading showed achievement toasts');
  const forged=JSON.parse(JSON.stringify(d));forged.ach={title:'kill2000',got:{},c:'x'};V.loadSave(forged);if(V.achTitle())bad.push('an unearned title loaded');if(typeof V.achS().c!=='object')bad.push('bad counters were kept');return bad}`));

const failed = results.filter(r => r.problems.length).length;
console.log(`\n${results.length - failed} of ${results.length} tests passed.`);
ws.close(); browser.kill(); server.close();
setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} process.exit(failed ? 1 : 0); }, 500);
