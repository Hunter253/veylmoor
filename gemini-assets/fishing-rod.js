// Tris: 120 / 120 budget, measured | Size: 0.11 W x 1.40 H x 0.17 D
function fishingRodProp(g,ge,x,y,z){
  const wood=[92,64,42],metal=[118,122,128],wrap=[58,44,34];
  g.cyl(T3(x,y-0.22,z,1,0.34,1),wrap,6,0.034,0.030);
  g.cyl(T3(x,y+0.12,z,1,0.64,1),wood,5,0.028,0.021);
  g.cyl(T3(x,y+0.76,z,1,0.42,1),wood,4,0.021,0.016);
  g.box(T3(x,y+0.10,z+0.03,0.04,0.08,0.04),metal);
  g.cyl(T3(x-0.04,y+0.10,z+0.08,1,0.08,1,0,0,-1.57),wood,6,0.055,0.055);
  g.box(T3(x+0.05,y+0.10,z+0.10,0.03,0.03,0.07),metal);
  g.box(T3(x,y+1.16,z+0.03,0.04,0.04,0.05),metal);
}