// Ember glass shield (Emberfall Caldera plate shield) | Tris: 92 / 120 budget (small prop)
// Parts: black rock bevelled plate 24, three fireglass crown spikes 36, fireglass ground spike 12,
// glowing fireglass core (ge) 20 = 92
// Size: 0.45 W x 0.80 H x 0.10 D. Stands on y=0, face toward +z.
function emberGlassShieldProp(g,ge,x,y,z){
  const rock=[50,44,44],glass=[120,48,36],core=[240,128,48],F=-Math.PI/2;
  g.cyl(T3(x,y+0.40,z-0.03,0.30,0.06,0.26,F,0,F),rock,6,1,0.8);
  g.cyl(T3(x,y+0.62,z,1,0.18,1),glass,4,0.05,0);
  g.cyl(T3(x+0.12,y+0.52,z,1,0.15,1,0,0,-0.5),glass,4,0.04,0);
  g.cyl(T3(x-0.12,y+0.52,z,1,0.15,1,0,0,0.5),glass,4,0.04,0);
  g.cyl(T3(x,y,z,1,0.14,1),glass,4,0,0.045);
  ge.ico(T3(x,y+0.40,z+0.03,0.06,0.09,0.035),core);
}
