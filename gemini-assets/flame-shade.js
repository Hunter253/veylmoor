// Emberfall Caldera: Flame Shade, floating hooded spirit of tattered orange and deep red flame-shaped cloth with a yellow core | Tris: 444 / 1200 budget (beast or monster)
// Solid: 400 + Glow: 44 = 444 tris
// Size: 0.81 W x 1.77 H x 0.80 D. Stands on y=0, faces +z.
// Motion: hovers (y +-0.04), tatters sway; walk is a glide; attack raises both claws then thrusts forward (ranged bolt from the core).
function flameShadeModel(){
  const cloth=[214,106,46],deep=[150,46,30],shadow=[28,30,36],claw=[64,36,30],eyeC=[240,232,140],coreC=[240,214,90];
  const root=part('root',null);

  const body=part('body',mk(g=>{
    g.cyl(T3(0,0,0,1,1.0,1),cloth,10,0.40,0.21);
    for(let k=0;k<7;k++){
      const a=k/7*Math.PI*2;
      g.cyl(T3(Math.cos(a)*0.34,0.32,Math.sin(a)*0.34,1,0.32,1,0,Math.PI,0),deep,4,0.07,0);
    }
    g.cyl(T3(0,1.0,0,1,0.44,1),deep,8,0.22,0.15);
    g.sphere(T3(0,1.56,0,0.18,0.21,0.18),cloth,8,6);
    g.sphere(T3(0,1.53,0.08,0.13,0.15,0.10),shadow,6,5);
  }),[0,0,0]);
  body.k.push(part('eyes',mk(g=>{
    for(const s of[-1,1]) g.box(T3(s*0.05,1.55,0.16,0.035,0.035,0.035),eyeC);
  }),[0,0,0],{e:2.4,t:'#ffe08c'}));
  body.k.push(part('core',mk(g=>{
    g.ico(T3(0,0.98,0.14,0.08,0.08,0.08),coreC);
  }),[0,0,0],{e:1.8,t:'#ff8a3a'}));

  const armM=mk(g=>{
    g.cyl(T3(0,-0.40,0,1,0.40,1),cloth,5,0.046,0.074);
    g.box(T3(0,-0.50,0.03,0.08,0.12,0.05),claw);
    g.cyl(T3(0,-0.62,0.05,1,0.08,1,0,Math.PI,0),claw,4,0.03,0);
  });
  const armL=part('armL',armM,[0.26,1.26,0],{r:[-0.2,0,0.15]});
  const armR=part('armR',armM,[-0.26,1.26,0],{r:[-0.2,0,-0.15],s:[-1,1,1]});
  root.k.push(body,armL,armR);
  return {root,kind:'flameShade'};
}
