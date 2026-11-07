// Sunscar Dunes: Dune Raider, desert bandit in faded rust cloth wraps and head scarf, leather vest, curved short blade | Tris: 680 / 2500 budget (hero or humanoid monster)
// Solid: 680 + Glow: 0 = 680 tris
// Size: 0.53 W x 1.56 H x 0.42 D. Stands on y=0, faces +z.
// Motion: quick crouched stance; walk is a fast lope; attack is a forehand slash with the right arm.
function duneRaiderModel(){
  const wrap=[176,104,56],scarf=[204,176,124],vest=[96,64,42],skin=[150,108,76],steel=[172,176,182],dark=[54,40,32];
  const root=part('root',null);

  const torso=part('torso',mk(g=>{
    g.cyl(T3(0,-0.06,0,1,0.18,0.8),wrap,8,0.17,0.16);
    g.cyl(T3(0,0.10,0,1,0.36,0.72),vest,8,0.17,0.2);
    g.box(T3(0,0.22,0.13,0.10,0.26,0.03),wrap);
    g.torus(T3(0,0.06,0,1,0.6,0.82),dark,0.175,0.022,8,3);
    g.cyl(T3(0,0.44,0,1,0.06,1),scarf,8,0.13,0.12);
    g.box(T3(0.08,-0.16,0.14,0.10,0.24,0.03,0,0,0.1),wrap);
  }),[0,0.82,0],{r:[0.1,0,0]});

  const head=part('head',mk(g=>{
    g.sphere(T3(0,0.12,0,0.11,0.12,0.11),skin,8,6);
    g.sphere(T3(0,0.16,-0.01,0.13,0.11,0.13),scarf,8,5);
    g.box(T3(0,0.06,0.09,0.17,0.07,0.06),scarf);
    g.cyl(T3(0,0.06,-0.12,1,0.22,1,0,-2.6,0),scarf,4,0.05,0);
    g.box(T3(0,0.13,0.11,0.12,0.03,0.03),dark);
  }),[0,0.48,0.02]);
  torso.k.push(head);

  const armL=mk(g=>{
    g.cyl(T3(0,-0.26,0,1,0.26,1),wrap,5,0.045,0.055);
    g.cyl(T3(0,-0.52,0,1,0.26,1),skin,5,0.038,0.045);
    g.sphere(T3(0,-0.56,0.01,0.045,0.05,0.04),skin,5,4);
  });
  torso.k.push(part('armL',armL,[0.21,0.36,0]));
  const armR=part('armR',armL,[-0.21,0.36,0],{r:[0.3,0,0],s:[-1,1,1]});
  armR.k.push(part('blade',mk(g=>{
    g.box(T3(0,-0.58,0.04,0.03,0.03,0.12),dark);
    g.box(T3(0,-0.58,0.20,0.03,0.06,0.24,0,-0.15,0),steel);
    g.box(T3(0,-0.55,0.34,0.03,0.05,0.10,0,-0.45,0),steel);
  }),[0,0,0]));
  torso.k.push(armR);

  const legM=mk(g=>{
    g.cyl(T3(0,-0.40,0,1,0.40,1),wrap,5,0.055,0.068);
    g.cyl(T3(0,-0.80,0,1,0.40,1),dark,5,0.045,0.055);
    g.box(T3(0,-0.79,0.05,0.09,0.05,0.18),dark);
  });
  root.k.push(torso);
  root.k.push(part('legL',legM,[0.10,0.82,0]));
  root.k.push(part('legR',legM,[-0.10,0.82,0],{s:[-1,1,1]}));
  return {root,kind:'duneRaider'};
}
