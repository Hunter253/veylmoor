#!/usr/bin/env node
// Sends an asset you wrote in gemini-assets/ to Hunter's Asset Studio for review, then waits for the decision.
// Hunter watches it there in 3D and approves it, rejects it with a note, or drops it.
//
//   node gemini-assets/studio-review.mjs <file.js> --prompt "what it is" --zone <zone> --budget <budget>
//   node gemini-assets/studio-review.mjs --wait <job number>     (go back to waiting after an interruption)
//
// zone:   veylmoor | dunes | frost | gloam | ember
// budget: small | medium | house | landmark | pet | monster | mount | npc | hero | boss
//
// Exit codes: 0 approved (commit it) · 2 rejected (revise and send again) · 3 dropped (delete it, don't commit)
//             4 failed the check (fix and send again) · 5 the Studio can't be reached (don't commit; ask Hunter)
// No key is stored in this file: it is read at run time from the Studio's settings on this PC, outside the repo.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url)); // gemini-assets/
const BASE = `http://127.0.0.1:${process.env.STUDIO_PORT || 4777}`;
const say = s => console.log(s);
const quit = (code, ...lines) => { for (const l of lines) if (l) say(l); process.exit(code); };
const unreachable = why => quit(5, `STUDIO REVIEW: STUDIO NOT REACHABLE (${why}).`,
  'Ask Hunter to open the Veylmoor Asset Studio (the desktop icon), then run this again. Do not commit the asset yet.');

function findKey() {
  if (process.env.STUDIO_KEY) return process.env.STUDIO_KEY;
  const brain = path.join(os.homedir(), '.gemini', 'antigravity', 'brain');
  let best = null;
  try {
    for (const d of fs.readdirSync(brain)) {
      const f = path.join(brain, d, 'scratch', 'studio-secret.json');
      if (fs.existsSync(f)) { const t = fs.statSync(f).mtimeMs; if (!best || t > best.t) best = { f, t }; }
    }
  } catch {}
  if (!best) return null;
  try { return JSON.parse(fs.readFileSync(best.f, 'utf8')).key || null; } catch { return null; }
}

const args = process.argv.slice(2), opt = {};
let file = null;
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) opt[args[i].slice(2)] = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
  else file = args[i];
}

const KEY = findKey();
if (!KEY) unreachable('no Studio settings found on this PC');
const H = { 'Content-Type': 'application/json', Cookie: `veylmoor_auth=${encodeURIComponent(KEY)}` };
async function api(p, body) {
  let r;
  try { r = await fetch(BASE + p, body ? { method: 'POST', headers: H, body: JSON.stringify(body) } : { headers: H }); }
  catch { unreachable('it is not running'); }
  if (r.status === 401) unreachable('the access key was refused');
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`);
  return j;
}

let id = Number(opt.wait) || null;
if (!id) {
  if (!file) quit(1, 'Usage: node gemini-assets/studio-review.mjs <file.js> --prompt "what it is" --zone <zone> --budget <budget>');
  const name = path.basename(file);
  if (!fs.existsSync(path.join(HERE, name)))
    quit(1, `There is no gemini-assets/${name}. Save the asset there first.`);
  try {
    const r = await api('/api/jobs/submit', { file: name, prompt: opt.prompt || '', zone: opt.zone || 'veylmoor', budget: opt.budget || null });
    id = r.id;
    say(`Sent gemini-assets/${name} to the Studio as job #${id} (version ${r.version}). Waiting for Hunter's decision...`);
    say(`If this command is interrupted, go back to waiting with: node gemini-assets/studio-review.mjs --wait ${id}`);
  } catch (err) { quit(1, `STUDIO REVIEW: NOT SENT: ${err.message}`); }
}

let last = 0;
for (;;) {
  let j;
  try { j = (await api(`/api/jobs/${id}`)).job; }
  catch (err) { quit(5, `STUDIO REVIEW: JOB #${id} NOT FOUND: ${err.message}`, 'Send the asset again with the first form of this command.'); }
  const note = j.note ? `Hunter's note: ${j.note}` : 'Hunter left no note.';
  const f = j.file ? `gemini-assets/${j.file}` : 'the asset';
  if (j.status === 'approved') quit(0, `STUDIO REVIEW: APPROVED (job #${id}).`, note, `You may commit ${f} now.`);
  if (j.status === 'rejected') quit(2, `STUDIO REVIEW: REJECTED (job #${id}).`, note, `Revise ${f} using the note, then run this command again to send the new version. Do not commit it yet.`);
  if (j.status === 'dropped' || j.status === 'stopped') quit(3, `STUDIO REVIEW: DROPPED (job #${id}).`, note, `Delete ${f} and do not commit it.`);
  if (j.status === 'failed') quit(4, `STUDIO REVIEW: FAILED THE CHECK (job #${id}): ${j.error}`, `Fix ${f}, then run this command again. Do not commit it yet.`);
  if (Date.now() - last > 60000) {
    if (last) say(`Still waiting for Hunter (job #${id}, ${j.status === 'review' ? 'ready for review' : j.status})...`);
    last = Date.now();
  }
  await new Promise(r => setTimeout(r, 2000));
}
