// Gloamwood: Gloom Stalker, lean long-legged shadow-violet wolf with bony shoulder ridges and pale fungus | Tris: 922 / 1200 budget (beast or monster)
// Solid: 898 + Glow: 24 = 922 tris
// Size: 0.52 W x 1.13 H x 1.96 D. Stands on y=0, faces +z.
function gloomStalkerModel(){
  const fur=[84,70,112],dark=[46,38,64],pale=[118,104,146],spike=[206,196,170],eyeC=[212,160,240];
  const root=part('root',null);

  const body=part('body',mk(g=>{
    g.sphere(T3(0,0.71,0.28,0.26,0.30,0.28),fur,8,6);
    g.sphere(T3(0,0.67,-0.06,0.24,0.25,0.38),fur,8,6);
    g.sphere(T3(0,0.60,0.06,0.18,0.14,0.32),pale,7,5);
    g.ico(T3(0,0.83,0.32,0.26,0.24,0.22),dark);
    for(let k=0;k<6;k++){
      g.cyl(T3((k%2?0.03:-0.03),0.87-k*0.02,0.28-k*0.12,1,0.18-k*0.015,1,0,-0.5,(k%2?-0.2:0.2)),spike,4,0.045,0);
    }
    g.sphere(T3(0.10,0.86,0.02,0.07,0.035,0.07),[214,206,184],6,3);
    g.sphere(T3(-0.08,0.84,-0.18,0.06,0.03,0.06),[214,206,184],6,3);
    g.cyl(T3(0.10,0.80,0.02,1,0.06,1),[176,168,150],4,0.018,0.018);
    g.cyl(T3(-0.08,0.78,-0.18,1,0.06,1),[176,168,150],4,0.016,0.016);
  }),[0,0,0]);

  const head=part('head',mk(g=>{
    g.sphere(T3(0,0,0,0.17,0.16,0.18),fur,8,6);
    g.cyl(T3(0,-0.04,0.12,1,0.22,1,0,Math.PI/2),fur,6,0.09,0.05);
    g.box(T3(0,-0.10,0.20,0.08,0.04,0.16),dark);
    g.box(T3(0,-0.02,0.34,0.05,0.04,0.04),dark);
    for(const s of[-1,1]) g.cyl(T3(s*0.08,0.12,-0.03,1,0.15,1,0,-0.2,s*-0.35),dark,4,0.045,0);
  }),[0,0.87,0.54]);
  head.k.push(part('eyes',mk(g=>{
    for(const s of[-1,1]) g.box(T3(s*0.07,0.04,0.14,0.03,0.04,0.03),eyeC);
  }),[0,0,0],{e:2.0,t:'#d4a0ff'}));

  const tail=part('tail',mk(g=>{
    g.cyl(T3(0,0,0,1,0.48,1,0,-Math.PI/2+0.4),fur,5,0.065,0.02);
    g.cyl(T3(0,-0.26,-0.32,1,0.22,1,0,-Math.PI/2+0.1),dark,4,0.035,0);
  }),[0,0.74,-0.52]);
  root.k.push(body,head,tail);

  const legM=mk(g=>{
    g.cyl(T3(0,-0.30,0,1,0.30,1),fur,6,0.052,0.075);
    g.cyl(T3(0,-0.57,-0.02,1,0.28,1),dark,6,0.040,0.052);
    g.box(T3(0,-0.54,0.03,0.09,0.06,0.12),dark);
  });
  root.k.push(part('lf',legM,[0.13,0.57,0.36]));
  root.k.push(part('rf',legM,[-0.13,0.57,0.36]));
  root.k.push(part('lb',legM,[0.13,0.57,-0.40]));
  root.k.push(part('rb',legM,[-0.13,0.57,-0.40]));
  return {root,kind:'gloomStalker'};
}
