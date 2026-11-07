// Gloamwood: Blighted Dead, hunched corpse in rotting violet rags with pale fungus caps and twisted roots | Tris: 660 / 2500 budget (hero or humanoid monster)
// Solid: 636 + Glow: 24 = 660 tris
// Size: 0.69 W x 1.35 H x 0.57 D. Stands on y=0, faces +z.
// Motion: shambling hunch like the Fen Ghoul; idle sways, attack is a double claw swipe.
function blightedDeadModel(){
  const skin=[132,120,146],cloth=[78,60,96],trim=[218,210,186],accent=[84,62,48],claw=[96,84,104],eyeC=[214,170,240];
  const root=part('root',null);

  const torso=part('torso',mk(g=>{
    g.cyl(T3(0,0,0,1,0.44,0.72),cloth,10,0.15,0.198);
    g.sphere(T3(0,0.24,0.06,0.17,0.16,0.12),skin,8,6);
    g.box(T3(0,-0.04,0,0.28,0.14,0.18),cloth);
    g.sphere(T3(0.12,0.38,0.06,0.07,0.03,0.07),trim,6,3);
    g.sphere(T3(-0.10,0.30,-0.10,0.06,0.03,0.06),trim,6,3);
    g.cyl(T3(0.12,0.34,0.06,1,0.05,1),[180,170,150],4,0.02,0.02);
    g.cyl(T3(-0.18,-0.10,0.02,1,0.40,1,0,0.2,0.4),accent,4,0.025,0.012);
    g.cyl(T3(0.16,-0.08,-0.06,1,0.36,1,0,-0.3,-0.5),accent,4,0.022,0.01);
  }),[0,0.72,0]);

  const head=part('head',mk(g=>{
    g.sphere(T3(0,0.10,0,0.12,0.13,0.13),skin,8,6);
    g.box(T3(0,0.02,0.12,0.10,0.06,0.12),skin);
    g.sphere(T3(0.05,0.22,-0.02,0.08,0.035,0.08),trim,6,3);
    g.cyl(T3(0.05,0.18,-0.02,1,0.05,1),[180,170,150],4,0.022,0.022);
  }),[0,0.38,0.22],{r:[0.45,0,0]});
  head.k.push(part('eyes',mk(g=>{
    for(const s of[-1,1]) g.box(T3(s*0.045,0.12,0.12,0.035,0.035,0.035),eyeC);
  }),[0,0,0],{e:2.0,t:'#d4a8ff'}));
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
  return {root,kind:'blightedDead'};
}
