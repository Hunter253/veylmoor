// Dune dungeon pillar (Sunscar dungeon set, one tile) | Tris: 120 / 400 budget (medium prop)
// Parts: dark base 12, sandstone shaft 32, faded blue cloth band 32, flared neck 32, pale capital 12 = 120
// Size: 0.90 W x 3.20 H x 0.90 D. Fills one map tile; stands on y=0.
function duneDungeonPillarProp(g,ge,x,y,z){
  const base=[150,116,80],wall=[200,160,112],cap=[222,190,140],cloth=[70,110,140];
  g.box(T3(x,y+0.15,z,0.9,0.3,0.9),base);
  g.cyl(T3(x,y+0.3,z,1,2.4,1),wall,8,0.34,0.3);
  g.cyl(T3(x,y+1.75,z,1,0.32,1),cloth,8,0.335,0.33);
  g.cyl(T3(x,y+2.7,z,1,0.2,1),wall,8,0.3,0.42);
  g.box(T3(x,y+3.05,z,0.9,0.3,0.9),cap);
}
