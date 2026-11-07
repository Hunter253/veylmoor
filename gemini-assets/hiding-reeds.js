// Hiding reeds (dense moor cover prop) | Tris: 316 / 400 budget (medium prop)
// Solid: 316 + Glow: 0 = 316 tris
// Parts: peat mound 32, marsh loam base 12, 4 cattail stalks (4x16=64), 4 cattail heads (4x16=64), 12 reed blades (12x12=144) = 316 tris
// Size: 1.59 W x 1.42 H x 1.44 D. Stands on y=0, faces +z.
function hidingReedsProp(g,ge,x,y,z){
  const peat=[48,38,30],marshLoam=[62,48,36],reedDark=[52,78,38],reedMid=[68,104,46],reedLight=[86,128,52],reedDry=[148,132,78],cattail=[76,46,30];

  // Base hummock
  g.cyl(T3(x,y,z,1,0.12,1),peat,8,0.72,0.56);
  g.box(T3(x+0.12,y+0.04,z-0.08,0.70,0.06,0.62,0.2),marshLoam);

  // Tall central stalks with cattail flower spikes
  // Stalk 1
  g.cyl(T3(x-0.08,y+0.10,z+0.04,1,1.26,1,0,0.04,-0.06),reedDark,4,0.03,0.02);
  g.cyl(T3(x-0.15,y+0.92,z+0.08,1,0.30,1,0,0.04,-0.06),cattail,4,0.05,0.045);

  // Stalk 2
  g.cyl(T3(x+0.10,y+0.10,z-0.05,1,1.32,1,0,-0.05,0.08),reedDark,4,0.03,0.02);
  g.cyl(T3(x+0.18,y+0.98,z-0.10,1,0.32,1,0,-0.05,0.08),cattail,4,0.05,0.045);

  // Stalk 3
  g.cyl(T3(x+0.02,y+0.10,z+0.18,1,1.22,1,0,0.08,0.04),reedDark,4,0.03,0.02);
  g.cyl(T3(x+0.06,y+0.86,z+0.25,1,0.28,1,0,0.08,0.04),cattail,4,0.045,0.04);

  // Stalk 4
  g.cyl(T3(x-0.20,y+0.10,z-0.14,1,1.18,1,0,-0.08,-0.10),reedDark,4,0.03,0.02);
  g.cyl(T3(x-0.30,y+0.82,z-0.22,1,0.26,1,0,-0.08,-0.10),cattail,4,0.045,0.04);

  // 12 Dense reed blades creating thick cover
  // Tall central shielding blades
  g.box(T3(x-0.04,y+0.66,z+0.02,0.10,1.14,0.035,0.1,0.06,-0.08),reedMid);
  g.box(T3(x+0.07,y+0.68,z-0.02,0.10,1.16,0.035,-0.12,-0.08,0.10),reedLight);
  g.box(T3(x+0.02,y+0.64,z+0.12,0.10,1.10,0.035,0.3,0.12,0.05),reedDark);
  g.box(T3(x-0.10,y+0.65,z-0.08,0.10,1.12,0.035,-0.25,-0.10,-0.08),reedDry);

  // Wide side flanking blades
  g.box(T3(x-0.36,y+0.56,z+0.08,0.09,0.98,0.035,0.15,0.10,-0.22),reedLight);
  g.box(T3(x+0.36,y+0.56,z-0.08,0.09,0.98,0.035,-0.15,-0.08,0.22),reedDark);
  g.box(T3(x-0.46,y+0.46,z-0.10,0.08,0.84,0.035,-0.3,-0.15,-0.32),reedMid);
  g.box(T3(x+0.46,y+0.46,z+0.12,0.08,0.84,0.035,0.3,0.14,0.32),reedLight);

  // Outer fanning blades expanding cover footprint (~1.6 wide, ~1.4 deep)
  g.box(T3(x-0.62,y+0.30,z+0.04,0.08,0.58,0.034,0.1,0.1,-0.50),reedDry);
  g.box(T3(x+0.62,y+0.30,z-0.04,0.08,0.58,0.034,-0.1,-0.1,0.50),reedLight);
  g.box(T3(x+0.04,y+0.32,z+0.48,0.08,0.60,0.034,0.48,0.45,0.05),reedMid);
  g.box(T3(x-0.04,y+0.32,z-0.48,0.08,0.60,0.034,-0.48,-0.45,-0.05),reedDark);
}
