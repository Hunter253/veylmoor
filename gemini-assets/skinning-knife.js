// Tris: 60 / 120 budget, measured | Size: 0.08 W x 0.34 H x 0.12 D
function skinningKnifeProp(g,ge,x,y,z){
  const wood=[92,64,42],metal=[118,122,128],wrap=[58,44,34];
  g.box(T3(x,y-0.06,z,0.06,0.04,0.07),wood);
  g.box(T3(x,y,z,0.05,0.10,0.06),wrap);
  g.box(T3(x,y+0.06,z+0.01,0.08,0.03,0.09),metal);
  g.box(T3(x,y+0.13,z+0.01,0.04,0.12,0.08,0,-0.12,0),metal);
  g.box(T3(x,y+0.21,z+0.03,0.035,0.09,0.07,0,-0.38,0),metal);
}