// Veylmoor: Drowned Acolyte: hunched waterlogged cultist in a soaked grey-teal hooded robe, rope belt, hanging weed, rusted bell | Tris: 678 / 2500 budget (hero or humanoid monster)
// Solid: 654 + Glow: 24 = 678 tris
// Size: 0.66 W x 1.32 H x 0.62 D. Stands on y=0, faces +z.
function drownedAcolyteModel(){
  const robe=[86,112,110],robeDk=[58,78,80],hem=[44,58,58],rope=[150,124,84],weed=[66,98,54],
        skin=[146,158,148],face=[34,40,42],rust=[142,84,50],rustDk=[96,58,38],eye=[150,236,224];
  const root=part('root',null);

  // Soaked robe body: wide dragging hem, narrower chest, rope belt and hanging weed
  const torso=part('torso',mk(g=>{
    g.cyl(T3(0,-0.5,0,1,0.06,0.92),hem,8,0.29,0.28);
    g.cyl(T3(0,-0.44,0,1,0.54,0.9),robe,8,0.27,0.19);
    g.cyl(T3(0,0.1,-0.02,1,0.36,0.82),robeDk,8,0.19,0.15);
    g.torus(T3(0,0.1,-0.01,1,0.6,0.86),rope,0.19,0.025,8,3);
    g.box(T3(0.09,0.0,0.15,0.035,0.18,0.03),rope);
    g.box(T3(-0.14,-0.06,0.12,0.05,0.26,0.04,0,0,0.12),weed);
    g.box(T3(0.17,-0.12,0.05,0.05,0.3,0.04,0.5,0,-0.1),weed);
    g.box(T3(-0.02,-0.2,-0.2,0.06,0.32,0.04,0,0.1,0),weed);
    g.box(T3(0,0.42,-0.04,0.3,0.08,0.2),robe);
  }),[0,0.54,0],{r:[0.12,0,0]});

  // Hooded head bowed forward: deep hood, shadowed face, two pale eyes
  const head=part('head',mk(g=>{
    g.cyl(T3(0,-0.02,-0.02,1,0.3,1),robe,7,0.15,0.03);
    g.sphere(T3(0,0.09,0.06,0.1,0.11,0.07),face,7,5);
    g.box(T3(0,-0.03,0.08,0.2,0.05,0.07),robeDk);
  }),[0,0.52,0.06],{r:[0.32,0,0]});
  head.k.push(part('eyes',mk(ge=>{
    for(const s of[-1,1]) ge.box(T3(s*0.035,0.1,0.12,0.03,0.03,0.03),eye);
  }),[0,0,0],{e:1.8,t:'#96ece0'}));
  torso.k.push(head);

  // Arms: one shared wet sleeve (mirrored for the right), plus a rusted bell in the right hand
  const sleeve=mk(g=>{
    g.cyl(T3(0,-0.34,0,1,0.34,1),robe,6,0.075,0.05);
    g.cyl(T3(0,-0.38,0,1,0.06,1),robeDk,6,0.08,0.08);
    g.sphere(T3(0,-0.42,0.01,0.045,0.05,0.04),skin,5,4);
  });
  torso.k.push(part('armL',sleeve,[0.2,0.34,0.02],{r:[0.25,0,0.08]}));
  const armR=part('armR',sleeve,[-0.2,0.34,0.02],{r:[0.45,0,-0.08],s:[-1,1,1]});
  armR.k.push(part('bell',mk(g=>{
    g.cyl(T3(0,-0.47,0.03,1,0.04,1),rustDk,6,0.02,0.02);
    g.cyl(T3(0,-0.6,0.03,1,0.13,1),rust,7,0.085,0.035);
    g.torus(T3(0,-0.6,0.03),rustDk,0.085,0.015,8,3);
  }),[0,0,0]));
  torso.k.push(armR);

  // Legs hidden under the robe; only bare pale feet show at the hem
  const legM=mk(g=>{
    g.cyl(T3(0,-0.52,0,1,0.52,1),hem,5,0.05,0.06);
    g.box(T3(0,-0.51,0.06,0.08,0.05,0.16),skin);
  });
  root.k.push(torso);
  root.k.push(part('legL',legM,[0.1,0.54,0]));
  root.k.push(part('legR',legM,[-0.1,0.54,0],{s:[-1,1,1]}));

  return {root,kind:'drownedAcolyte'};
}
