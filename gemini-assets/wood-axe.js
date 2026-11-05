// Tris: 120 / 120 budget, measured | Size: 0.10 W x 0.74 H x 0.28 D
function woodAxeProp(g,ge,x,y,z){
  const wood=[92,64,42],metal=[118,122,128],wrap=[58,44,34];
  g.cyl(T3(x,y-0.18,z,1,0.68,1),wood,6,0.028,0.035);
  g.cyl(T3(x,y-0.08,z,1,0.16,1),wrap,6,0.036,0.036);
  g.box(T3(x,y-0.18,z-0.01,0.07,0.05,0.09,0,0.2,0),wood);
  g.box(T3(x,y+0.42,z-0.01,0.09,0.13,0.11),metal);
  g.box(T3(x,y+0.50,z,0.06,0.04,0.06),wood);
  g.box(T3(x,y+0.42,z+0.09,0.06,0.16,0.12),metal);
  g.box(T3(x,y+0.46,z+0.16,0.04,0.13,0.09,0,-0.22,0),metal);
  g.box(T3(x,y+0.37,z+0.16,0.04,0.13,0.09,0,0.28,0),metal);
}