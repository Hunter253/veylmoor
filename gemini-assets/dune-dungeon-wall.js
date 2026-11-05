// Dune dungeon wall (Sunscar dungeon set, one tile) | Tris: 36 (budget: small prop 120, kept low as it repeats on every edge tile)
// Parts: dark plinth 12, sandstone block 12, pale capstone 12 = 36
// Size: 1.06 W x 2.86 H x 1.06 D. Fills one map tile; stands on y=0.
function duneDungeonWallProp(g,ge,x,y,z){
  const base=[150,116,80],wall=[200,160,112],cap=[222,190,140];
  g.box(T3(x,y+0.15,z,1.06,0.3,1.06),base);
  g.box(T3(x,y+1.5,z,1.01,2.4,1.01),wall);
  g.box(T3(x,y+2.78,z,1.06,0.16,1.06),cap);
}
