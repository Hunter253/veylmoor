// Emberfall Caldera: Magma Scuttler, low wide scorpion of black volcanic rock plates with glowing magma joints | Tris: 672 / 1200 budget (beast or monster)
// Solid: 616 + Glow: 56 = 672 tris
// Size: 1.12 W x 0.87 H x 1.76 D. Stands on y=0, faces +z.
// Motion: like the Dune Scorpion; claws snap, tail arches and strikes; magma seams pulse.
function magmaScuttlerModel(){
  const rock=[52,46,44],rockDk=[32,28,28],plate=[78,66,60],magma=[240,120,40];
  const root=part('root',null);

  const body=part('body',mk(g=>{
    g.sphere(T3(0,0.30,0,0.34,0.15,0.44),rock,8,6);
    g.sphere(T3(0,0.32,0.38,0.24,0.13,0.18),rock,8,5);
    for(let k=0;k<4;k++){
      g.ico(T3((k%2?0.06:-0.06),0.44,-0.22+k*0.15,0.20-k*0.01,0.06,0.09),plate);
    }
    for(let k=0;k<4;k++){
      const zOff=-0.18+k*0.13,pitch=(k-1.5)*0.15;
      g.cyl(T3(0.26,0.32,zOff,1,0.42,1,0,pitch,2.43),rockDk,4,0.036,0.018);
      g.cyl(T3(-0.26,0.32,zOff,1,0.42,1,0,pitch,-2.43),rockDk,4,0.036,0.018);
    }
  }),[0,0,0]);
  body.k.push(part('magma',mk(g=>{
    g.box(T3(0,0.43,0.0,0.06,0.03,0.46),magma);
    g.box(T3(0.30,0.30,0.0,0.03,0.04,0.40),magma);
    g.box(T3(-0.30,0.30,0.0,0.03,0.04,0.40),magma);
  }),[0,0,0],{e:1.7,t:'#ff7828'}));

  const clawM=mk(g=>{
    g.cyl(T3(0,0,0,1,0.36,1,0,Math.PI/2-0.2),rockDk,4,0.05,0.042);
    g.ico(T3(0,0.06,0.38,0.12,0.09,0.15),rock);
    g.box(T3(0.05,0.06,0.53,0.04,0.04,0.17,0.25),plate);
    g.box(T3(-0.05,0.06,0.53,0.04,0.04,0.17,-0.25),plate);
  });
  const clawL=part('clawL',clawM,[0.24,0.32,0.42],{r:[0,0.4,0]});
  const clawR=part('clawR',clawM,[-0.24,0.32,0.42],{r:[0,-0.4,0],s:[-1,1,1]});

  const tail=part('tail',mk(g=>{
    let py=0,pz=0;
    for(let k=0;k<5;k++){
      const a=-0.2+k*0.58;
      py+=Math.sin(a)*0.14;
      pz-=Math.cos(a)*0.14*(1-k*0.22);
      g.ico(T3(0,py,pz,0.10-k*0.01,0.09-k*0.01,0.10-k*0.01),k%2?plate:rock);
    }
    g.cyl(T3(0,py+0.06,pz+0.12,1,0.22,1,0,1.9),rockDk,4,0.042,0);
  }),[0,0.36,-0.38]);
  tail.k.push(part('venom',mk(g=>{
    g.ico(T3(0,0.42,-0.30,0.07,0.07,0.08),magma);
  }),[0,0,0],{e:1.8,t:'#ff8a3a'}));

  root.k.push(body,clawL,clawR,tail);
  return {root,kind:'magmaScuttler'};
}
