// Emberfall Caldera: Ash Hound, charcoal hound with cracked rocky hide, ember seams and a mane of jagged plates | Tris: 878 / 1200 budget (beast or monster)
// Solid: 818 + Glow: 60 = 878 tris
// Size: 0.53 W x 1.02 H x 1.96 D. Stands on y=0, faces +z.
function ashHoundModel(){
  const fur=[58,52,50],dark=[34,30,30],pale=[86,74,68],spike=[44,40,40],eyeC=[240,150,60];
  const root=part('root',null);

  const body=part('body',mk(g=>{
    g.sphere(T3(0,0.62,0.28,0.26,0.30,0.28),fur,8,6);
    g.sphere(T3(0,0.58,-0.06,0.24,0.25,0.38),fur,8,6);
    g.sphere(T3(0,0.52,0.06,0.18,0.14,0.32),pale,7,5);
    g.ico(T3(0,0.72,0.32,0.26,0.24,0.22),dark);
    for(let k=0;k<6;k++){
      g.cyl(T3((k%2?0.03:-0.03),0.76-k*0.02,0.28-k*0.12,1,0.26-k*0.015,1,0,-0.5,(k%2?-0.2:0.2)),spike,4,0.045,0);
    }
    g.box(T3(0.16,0.74,0.36,0.04,0.16,0.10,0,0.2,-0.5),dark);
    g.box(T3(-0.16,0.74,0.36,0.04,0.16,0.10,0,0.2,0.5),dark);
  }),[0,0,0]);

  const head=part('head',mk(g=>{
    g.sphere(T3(0,0,0,0.17,0.16,0.18),fur,8,6);
    g.cyl(T3(0,-0.04,0.12,1,0.22,1,0,Math.PI/2),fur,6,0.09,0.05);
    g.box(T3(0,-0.10,0.20,0.08,0.04,0.16),dark);
    g.box(T3(0,-0.02,0.34,0.05,0.04,0.04),dark);
    for(const s of[-1,1]) g.cyl(T3(s*0.08,0.12,-0.03,1,0.15,1,0,-0.2,s*-0.35),dark,4,0.045,0);
  }),[0,0.76,0.54]);
  head.k.push(part('eyes',mk(g=>{
    for(const s of[-1,1]) g.box(T3(s*0.07,0.04,0.14,0.03,0.04,0.03),eyeC);
  }),[0,0,0],{e:2.0,t:'#ff9a3c'}));

  const tail=part('tail',mk(g=>{
    g.cyl(T3(0,0,0,1,0.48,1,0,-Math.PI/2+0.4),fur,5,0.065,0.02);
    g.cyl(T3(0,-0.26,-0.32,1,0.22,1,0,-Math.PI/2+0.1),dark,4,0.035,0);
  }),[0,0.64,-0.52]);
  body.k.push(part('embers',mk(g=>{
    g.box(T3(0.25,0.60,0.10,0.03,0.05,0.30),[240,128,40]);
    g.box(T3(-0.25,0.60,0.10,0.03,0.05,0.30),[240,128,40]);
    g.box(T3(0,0.86,-0.10,0.05,0.03,0.26),[240,128,40]);
  }),[0,0,0],{e:1.6,t:'#ff8028'}));
  root.k.push(body,head,tail);

  const legM=mk(g=>{
    g.cyl(T3(0,-0.26,0,1,0.26,1),fur,6,0.052,0.075);
    g.cyl(T3(0,-0.50,-0.02,1,0.24,1),dark,6,0.040,0.052);
    g.box(T3(0,-0.47,0.03,0.09,0.06,0.12),dark);
  });
  root.k.push(part('lf',legM,[0.13,0.50,0.36]));
  root.k.push(part('rf',legM,[-0.13,0.50,0.36]));
  root.k.push(part('lb',legM,[0.13,0.50,-0.40]));
  root.k.push(part('rb',legM,[-0.13,0.50,-0.40]));
  return {root,kind:'ashHound'};
}
