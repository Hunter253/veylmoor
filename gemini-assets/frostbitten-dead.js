// Frostfang Reach: Frostbitten Dead, gaunt corpse in torn furs crusted with ice, pale blue skin and a frozen beard | Tris: 631 / 2500 budget (hero or humanoid monster)
// Solid: 607 + Glow: 24 = 631 tris
// Size: 0.54 W x 1.36 H x 0.61 D. Stands on y=0, faces +z.
// Motion: shambling hunch like the Fen Ghoul; idle sways, attack is a double claw swipe.
function frostbittenDeadModel(){
  const skin=[156,184,204],cloth=[110,92,74],trim=[200,194,180],accent=[196,226,240],claw=[118,140,160],eyeC=[170,226,240];
  const root=part('root',null);

  const torso=part('torso',mk(g=>{
    g.cyl(T3(0,0,0,1,0.44,0.72),cloth,10,0.15,0.198);
    g.sphere(T3(0,0.24,0.06,0.17,0.16,0.12),skin,8,6);
    g.box(T3(0,-0.04,0,0.28,0.14,0.18),cloth);
    g.sphere(T3(0,0.42,-0.02,0.24,0.08,0.18),trim,7,4);
    g.ico(T3(0.14,0.30,0.12,0.06,0.07,0.05),accent);
    g.ico(T3(-0.10,0.12,0.14,0.05,0.06,0.04),accent);
    g.ico(T3(0.04,0.36,-0.16,0.06,0.05,0.05),accent);
  }),[0,0.72,0]);

  const head=part('head',mk(g=>{
    g.sphere(T3(0,0.10,0,0.12,0.13,0.13),skin,8,6);
    g.box(T3(0,0.02,0.12,0.10,0.06,0.12),skin);
    g.cyl(T3(0,-0.12,0.10,1,0.12,1,0,Math.PI,0),accent,5,0.07,0);
    g.box(T3(0,0.20,-0.04,0.18,0.06,0.18),trim);
  }),[0,0.38,0.22],{r:[0.45,0,0]});
  head.k.push(part('eyes',mk(g=>{
    for(const s of[-1,1]) g.box(T3(s*0.045,0.12,0.12,0.035,0.035,0.035),eyeC);
  }),[0,0,0],{e:2.0,t:'#aae0ff'}));
  torso.k.push(head);

  const armM=mk(g=>{
    g.cyl(T3(0,-0.28,0,1,0.28,1),skin,5,0.042,0.048);
    g.cyl(T3(0,-0.56,0.02,1,0.28,1),skin,5,0.036,0.042);
    g.box(T3(0,-0.62,0.04,0.08,0.12,0.04),claw);
  });
  torso.k.push(part('armL',armM,[0.22,0.32,0.05]));
  torso.k.push(part('armR',armM,[-0.22,0.32,0.05],{s:[-1,1,1]}));

  const legM=mk(g=>{
    g.cyl(T3(0,-0.36,0,1,0.36,1),cloth,5,0.052,0.068);
    g.cyl(T3(0,-0.72,0.02,1,0.36,1),skin,5,0.042,0.052);
    g.box(T3(0,-0.69,0.06,0.09,0.06,0.18),claw);
  });
  root.k.push(torso);
  root.k.push(part('legL',legM,[0.12,0.72,0]));
  root.k.push(part('legR',legM,[-0.12,0.72,0],{s:[-1,1,1]}));
  return {root,kind:'frostbittenDead'};
}
