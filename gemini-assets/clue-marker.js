// Clue marker (investigation ground clue prop) | Tris: 92 / 120 budget (small prop)
// Solid: 92 + Glow: 0 = 92 tris
// Parts: dirt base 12, stick 12, cloth wrap 12, cloth scrap 12, 3 stones (ico 20 + 2 boxes 24 = 44) = 92 tris
// Size: 0.52 W x 0.62 H x 0.48 D. Stands on y=0, faces +z.
function clueMarkerProp(g,ge,x,y,z){
  const dirt=[64,48,34],stickWood=[78,56,38],cloth=[174,54,44],clothDark=[142,42,34],stoneGrey=[118,114,110],stoneSlate=[88,92,98],stoneMoss=[82,94,74];

  // Disturbed dirt base
  g.box(T3(x,y+0.018,z,0.34,0.034,0.32),dirt);

  // Wooden stick driven into ground at an angle
  g.box(T3(x-0.02,y+0.30,z+0.02,0.045,0.60,0.045,0.12,0,0.14),stickWood);

  // Torn cloth scrap tied to upper stick
  g.box(T3(x+0.02,y+0.52,z+0.04,0.08,0.06,0.08,0.12,0,0.14),cloth);
  g.box(T3(x+0.10,y+0.45,z+0.07,0.16,0.18,0.035,0.35,-0.15,0.22),clothDark);

  // Scattered stones around the marker
  // 1 large faceted boulder beside stick
  g.ico(T3(x-0.14,y+0.07,z-0.08,0.12,0.08,0.11),stoneGrey);
  // 2 small stones
  g.box(T3(x+0.14,y+0.04,z-0.10,0.09,0.06,0.08,-0.2,0.3,0.15),stoneSlate);
  g.box(T3(x+0.06,y+0.04,z+0.15,0.08,0.05,0.08,0.4,-0.2,0.1),stoneMoss);
}
