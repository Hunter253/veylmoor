// Tris: 120 / 120 budget, measured | Size: 0.10 W x 0.69 H x 0.54 D
function minerPickProp(g,ge,x,y,z){
  const wood=[92,64,42],metal=[118,122,128],wrap=[58,44,34];
  g.cyl(T3(x,y-0.18,z,1,0.68,1),wood,6,0.026,0.034);
  g.cyl(T3(x,y-0.08,z,1,0.16,1),wrap,6,0.034,0.035);
  g.box(T3(x,y-0.18,z,0.07,0.04,0.07),wood);
  g.box(T3(x,y+0.44,z,0.09,0.10,0.11),metal);
  g.box(T3(x,y+0.43,z+0.13,0.06,0.07,0.18,0,0.18,0),metal);
  g.box(T3(x,y+0.39,z+0.23,0.04,0.04,0.08,0,0.35,0),metal);
  g.box(T3(x,y+0.43,z-0.13,0.06,0.07,0.18,0,-0.18,0),metal);
  g.box(T3(x,y+0.39,z-0.23,0.04,0.04,0.08,0,-0.35,0),metal);
}