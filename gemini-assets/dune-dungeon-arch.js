// Dune dungeon arch (Sunscar dungeon set doorway) | Tris: 196 / 400 budget (medium prop)
// Parts: two pilasters 24, two dark bases 24, lintel 12, upper step 12, bronze keystone 12,
// two corner braces 24, two faded cloth hangings 24, small dome 64 = 196
// Size: 3.10 W x 3.49 H x 0.82 D. Clear walkway 2.0 wide x 2.3 tall between the pilasters.
// Pilasters sit on the wall tiles either side of a 2-tile corridor; stands on y=0, faces +z.
function duneDungeonArchProp(g,ge,x,y,z){
  const base=[150,116,80],wall=[200,160,112],cap=[222,190,140],bronze=[150,110,62],cloth=[160,92,72];
  g.box(T3(x+1.25,y+1.45,z,0.5,2.9,0.7),wall);
  g.box(T3(x-1.25,y+1.45,z,0.5,2.9,0.7),wall);
  g.box(T3(x+1.25,y+0.15,z,0.6,0.3,0.8),base);
  g.box(T3(x-1.25,y+0.15,z,0.6,0.3,0.8),base);
  g.box(T3(x,y+2.75,z,3.1,0.45,0.8),cap);
  g.box(T3(x,y+3.12,z,2.0,0.3,0.7),wall);
  g.box(T3(x,y+2.72,z,0.36,0.5,0.82),bronze);
  g.box(T3(x+0.9,y+2.4,z,0.42,0.42,0.66,0,0,Math.PI/4),wall);
  g.box(T3(x-0.9,y+2.4,z,0.42,0.42,0.66,0,0,Math.PI/4),wall);
  g.box(T3(x+1.25,y+1.75,z+0.36,0.3,0.9,0.02),cloth);
  g.box(T3(x-1.25,y+1.75,z+0.36,0.3,0.9,0.02),cloth);
  g.sphere(T3(x,y+3.27,z,0.42,0.22,0.32),cap,8,4);
}
