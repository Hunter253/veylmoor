// Frost tower shield (Frostfang Reach plate shield) | Tris: 96 / 120 budget (small prop)
// Parts: dark timber backing 12, steel-blue face plate 12, snow cap 12, two iron bands 24,
// ice-pale pyramid boss 12, two iron ground spikes 24 = 96
// Size: 0.48 W x 0.79 H x 0.14 D. Stands on y=0, face toward +z.
function frostTowerShieldProp(g,ge,x,y,z){
  const timber=[64,48,38],steel=[92,108,128],snow=[222,232,238],iron=[118,122,128],ice=[168,196,214],dark=[84,88,96];
  g.box(T3(x,y+0.41,z,0.44,0.7,0.05),timber);
  g.box(T3(x,y+0.41,z+0.025,0.36,0.6,0.03),steel);
  g.box(T3(x,y+0.76,z+0.005,0.48,0.06,0.09),snow);
  g.box(T3(x,y+0.22,z+0.01,0.46,0.05,0.07),iron);
  g.box(T3(x,y+0.60,z+0.01,0.46,0.05,0.07),iron);
  g.cyl(T3(x,y+0.41,z+0.04,1,0.08,1,0,Math.PI/2),ice,4,0.08,0);
  g.cyl(T3(x+0.14,y,z,1,0.07,1),dark,4,0,0.035);
  g.cyl(T3(x-0.14,y,z,1,0.07,1),dark,4,0,0.035);
}
