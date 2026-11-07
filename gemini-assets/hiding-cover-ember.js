// Hiding cover ember (Emberfall Caldera basalt rock crag with charred stumps) | Tris: 312 / 400 budget (medium prop)
// Solid: 276 + Glow: 36 = 312 tris
// Parts: ash base 32, ash wedge 12, basalt crags & boulders 140 (4 boxes 48 + 4 icos 80 + peak 12), charred stumps & branches 92 (2 cyls 36 + 4 boxes 48 + 1 ico 8?), glowing fissures 36 (3 boxes) = 312 tris
// Size: 1.60 W x 1.41 H x 1.56 D. Stands on y=0, faces +z.
function hidingCoverEmberProp(g,ge,x,y,z){
  const ash=[52,46,44],ashDark=[38,34,32],rockDark=[46,40,38],rockMid=[60,52,48],rockLight=[74,66,60],rockTop=[88,78,72],stumpWarm=[72,48,34],stumpDark=[58,38,28],emberGlow=[238,110,28];

  // Base volcanic ash mound
  g.cyl(T3(x,y,z,1,0.12,1),ash,8,0.78,0.64);
  g.box(T3(x-0.10,y+0.05,z+0.08,0.76,0.08,0.68,0.15),ashDark);

  // Central jumble of basalt rock (tallest peak reaching ~1.40 tall)
  // Main basalt crag base
  g.box(T3(x-0.12,y+0.62,z-0.06,0.48,1.06,0.58,0.18,-0.10,0.14),rockDark);
  // Jagged crag boulder mid-section
  g.ico(T3(x-0.15,y+0.92,z-0.04,0.36,0.32,0.34),rockMid);
  // Chipped pinnacle peak (lighter top)
  g.ico(T3(x-0.18,y+1.24,z-0.05,0.24,0.20,0.22),rockTop);
  // Supporting basalt buttress
  g.box(T3(x-0.28,y+0.42,z-0.18,0.32,0.64,0.36,-0.15,0.2,-0.2),rockMid);

  // Left flanking rock boulder (expanding width to ~1.60 wide)
  g.ico(T3(x-0.52,y+0.40,z+0.04,0.32,0.28,0.30),rockLight);
  g.box(T3(x-0.60,y+0.25,z-0.08,0.24,0.38,0.28,-0.2,-0.1,-0.32),rockDark);

  // Right flanking rock formation & ledge
  g.ico(T3(x+0.22,y+0.48,z-0.12,0.34,0.30,0.32),rockMid);
  g.box(T3(x+0.46,y+0.34,z-0.08,0.34,0.52,0.36,-0.1,0.15,0.32),rockDark);
  g.ico(T3(x+0.56,y+0.34,z+0.04,0.28,0.24,0.26),rockLight);

  // Charred stumps clustered against the rock face (warm brown tones)
  // 1. Tall charred stump (standing ~0.95 high for crouch cover)
  g.cyl(T3(x+0.06,y+0.10,z+0.16,1,0.82,1,0,0.06,-0.08),stumpWarm,5,0.16,0.11);
  // Hollow charcoal top
  g.box(T3(x+0.08,y+0.88,z+0.18,0.18,0.10,0.16,0,0.2,0.1),stumpDark);
  // Burnt root flares
  g.box(T3(x+0.20,y+0.14,z+0.25,0.22,0.16,0.12,-0.1,0.4,0.2),stumpWarm);
  g.box(T3(x-0.08,y+0.14,z+0.28,0.18,0.16,0.14,0.2,-0.3,-0.15),stumpDark);

  // 2. Smaller secondary burnt stump
  g.cyl(T3(x+0.32,y+0.10,z+0.20,1,0.46,1,0,-0.1,0.12),stumpWarm,4,0.12,0.08);

  // Fallen charred branch
  g.box(T3(x+0.02,y+0.15,z-0.34,0.10,0.12,0.48,-0.15,-0.2,0.05),stumpDark);

  // Glowing orange crack (longer, clearly visible from above between rocks)
  // Horizontal fissure channel across the rock ledge (viewed from above)
  ge.box(T3(x-0.06,y+0.16,z-0.08,0.045,0.04,0.28,0.15,0.2,0),emberGlow);
  ge.box(T3(x+0.04,y+0.16,z+0.12,0.045,0.04,0.26,-0.2,0.35,0),emberGlow);
  // Vertical glowing crevice climbing the crag face
  ge.box(T3(x-0.08,y+0.32,z-0.02,0.04,0.26,0.045,0.18,-0.1,0.15),emberGlow);
}
