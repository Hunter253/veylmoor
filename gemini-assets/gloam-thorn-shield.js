// Gloam thorn shield (Gloamwood plate shield) | Tris: 96 / 120 budget (small prop)
// Parts: deep green backing point 12 + backing crown 24, violet field point 12 + field crown 24,
// two pale thorns 24 = 96
// Size: 0.62 W x 0.68 H x 0.07 D. Stands on y=0, face toward +z.
function gloamThornShieldProp(g,ge,x,y,z){
  const green=[44,70,52],violet=[108,70,140],deep=[70,44,96],thorn=[214,206,180],F=-Math.PI/2;
  g.cyl(T3(x,y+0.2333,z-0.025,0.2333,0.05,0.219,F,0,F),green,3,1,1);
  g.cyl(T3(x,y+0.46,z-0.025,0.22,0.05,0.22,F,0,F),green,6,1,1);
  g.cyl(T3(x,y+0.265,z-0.008,0.205,0.05,0.1848,F,0,F),deep,3,1,1);
  g.cyl(T3(x,y+0.46,z-0.01,0.185,0.05,0.185,F,0,F),violet,6,1,1);
  g.cyl(T3(x+0.16,y+0.46,z,1,0.16,1,0,0,-1.0),thorn,4,0.035,0);
  g.cyl(T3(x-0.16,y+0.46,z,1,0.16,1,0,0,1.0),thorn,4,0.035,0);
}
