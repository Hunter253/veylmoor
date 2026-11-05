// Dune sand rubble (Sunscar dungeon set floor scatter) | Tris: 96 / 120 budget (small prop)
// Parts: two sand drifts 36, three fallen blocks 36, fallen column drum 24 = 96
// Size: 1.20 W x 0.40 H x 1.00 D. Stands on y=0.
function duneSandRubbleProp(g,ge,x,y,z){
  const sand=[214,184,130],wall=[200,160,112],base=[150,116,80],cap=[222,190,140];
  g.cyl(T3(x,y,z,1,0.22,1),sand,6,0.5,0);
  g.cyl(T3(x+0.3,y,z+0.22,1,0.14,1),sand,6,0.32,0);
  g.box(T3(x-0.3,y+0.14,z-0.1,0.34,0.26,0.28,0.4,0,0.18),wall);
  g.box(T3(x+0.08,y+0.2,z-0.2,0.28,0.22,0.26,-0.3,0.25,0),base);
  g.box(T3(x-0.12,y+0.33,z-0.12,0.2,0.16,0.2,0.9,0,-0.3),cap);
  g.cyl(T3(x+0.38,y+0.13,z-0.15,1,0.36,1,0.5,0,Math.PI/2),wall,6,0.13,0.13);
}
