// Search spot (investigation ground search prop) | Tris: 92 / 120 budget (small prop)
// Solid: 92 + Glow: 0 = 92 tris
// Parts: dug dark soil patch 12, spoil mound 20, rock 12, box body 12, lid lip 12, iron band 12, iron corner brace 12 = 92 tris
// Size: 0.63 W x 0.28 H x 0.57 D. Stands on y=0, faces +z.
function searchSpotProp(g,ge,x,y,z){
  const pitLoam=[42,32,24],spoilEarth=[82,62,44],woodPale=[168,132,88],woodPlank=[184,146,98],ironDark=[54,58,64],rock=[114,110,104];

  // Dug dark soil patch on top of ground (stands on y=0)
  g.box(T3(x,y+0.018,z,0.56,0.034,0.52),pitLoam);

  // Excavated spoil mound - single shape
  g.ico(T3(x+0.16,y+0.075,z+0.14,0.22,0.07,0.20),spoilEarth);

  // Displaced rock beside spoil
  g.box(T3(x+0.22,y+0.05,z-0.14,0.11,0.06,0.09,0.25,0,0),rock);

  // Box corner poking up out of the soil (pale weathered planks)
  g.box(T3(x-0.05,y+0.15,z-0.06,0.22,0.18,0.20,0.35,0.25,-0.22),woodPale);

  // Box lid plank lip along upper edge
  g.box(T3(x-0.04,y+0.20,z-0.05,0.23,0.045,0.21,0.35,0.25,-0.22),woodPlank);

  // Dark iron band wrapping the exposed corner/edge
  g.box(T3(x-0.02,y+0.18,z-0.03,0.06,0.17,0.06,0.35,0.25,-0.22),ironDark);

  // Dark iron corner brace at the peak
  g.box(T3(x-0.01,y+0.23,z-0.02,0.08,0.05,0.08,0.35,0.25,-0.22),ironDark);
}
