// Dune round shield (Sunscar Dunes plate shield) | Tris: 92 / 120 budget (small prop)
// Parts: bronze rim disc 32, sand conical face 24, bronze dome boss 24, faded cloth streamer 12 = 92
// Size: 0.56 W x 0.62 H x 0.16 D. Stands on y=0, face toward +z.
function duneRoundShieldProp(g,ge,x,y,z){
  const bronze=[150,110,62],sand=[196,170,124],dome=[182,142,84],cloth=[160,92,72],U=Math.PI/2;
  g.cyl(T3(x,y+0.34,z-0.025,1,0.045,1,0,U),bronze,8,0.28,0.28);
  g.cyl(T3(x,y+0.34,z+0.015,1,0.06,1,0,U),sand,8,0.245,0);
  g.cyl(T3(x,y+0.34,z+0.04,1,0.06,1,0,U),dome,6,0.075,0.04);
  g.box(T3(x-0.1,y+0.12,z-0.035,0.1,0.22,0.015,0,0,0.18),cloth);
}
