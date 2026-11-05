// Moor heater shield (Veylmoor plate shield) | Tris: 90 / 120 budget (small prop)
// Parts: iron backing box 12 + iron backing point 12, red-brown field box 12 + field point 12,
// moss chevron 2 boxes 24, iron boss cone 18 = 90
// Size: 0.48 W x 0.62 H x 0.13 D. Stands on y=0, face toward +z.
function moorHeaterShieldProp(g,ge,x,y,z){
  const iron=[118,122,128],field=[132,54,40],moss=[96,116,66],boss=[84,88,96],F=-Math.PI/2;
  g.box(T3(x,y+0.48,z,0.48,0.28,0.05),iron);
  g.cyl(T3(x,y+0.227,z-0.025,0.227,0.05,0.277,F,0,F),iron,3,1,1);
  g.box(T3(x,y+0.4625,z+0.015,0.41,0.245,0.05),field);
  g.cyl(T3(x,y+0.265,z-0.01,0.205,0.05,0.2286,F,0,F),field,3,1,1);
  g.box(T3(x+0.075,y+0.39,z+0.045,0.25,0.06,0.03,0,0,-0.817),moss);
  g.box(T3(x-0.075,y+0.39,z+0.045,0.25,0.06,0.03,0,0,0.817),moss);
  g.cyl(T3(x,y+0.2,z+0.035,1,0.07,1,0,Math.PI/2),boss,6,0.06,0);
}
