// Dune fire bowl (Sunscar dungeon set light) | Tris: 92 / 120 budget (small prop)
// Parts: dark foot 12, sandstone pedestal 24, bronze bowl 32, two flame tongues (ge) 24 = 92
// Size: 0.60 W x 1.30 H x 0.60 D. Stands on y=0.
function duneFireBowlProp(g,ge,x,y,z){
  const base=[150,116,80],wall=[200,160,112],bronze=[150,110,62],flame=[240,150,60];
  g.box(T3(x,y+0.05,z,0.4,0.1,0.4),base);
  g.cyl(T3(x,y+0.1,z,1,0.62,1),wall,6,0.17,0.12);
  g.cyl(T3(x,y+0.72,z,1,0.22,1),bronze,8,0.14,0.3);
  ge.cyl(T3(x,y+0.86,z,1,0.42,1),flame,4,0.16,0);
  ge.cyl(T3(x+0.08,y+0.86,z+0.05,1,0.26,1,0.8),flame,4,0.1,0);
}
