// Hiding cover gloam (Gloamwood twisted violet bramble thicket) | Tris: 304 / 400 budget (medium prop)
// Solid: 304 + Glow: 0 = 304 tris
// Parts: loam base 32, moss wedge 12, root rock 20, bramble canes & side thickets 96 (8 boxes), bramble knot clumps 80 (4 icos), pale fungus caps 64 (4 4-seg cyls) = 304 tris
// Size: 1.58 W x 1.41 H x 1.56 D. Stands on y=0, faces +z.
function hidingCoverGloamProp(g,ge,x,y,z){
  const loam=[42,30,46],brambleDark=[58,36,72],brambleMid=[78,48,94],brambleLight=[96,62,114],mossGreen=[36,54,40],fungusPale=[222,216,198];

  // Base loam & root mound
  g.cyl(T3(x,y,z,1,0.12,1),loam,8,0.78,0.64);
  g.box(T3(x+0.10,y+0.05,z-0.08,0.74,0.08,0.66,0.2),mossGreen);

  // Gnarled forest stone embedded in roots
  g.ico(T3(x-0.42,y+0.16,z-0.22,0.22,0.14,0.20),loam);

  // Twisted main bramble arches (solid core cover reaching ~1.40 tall)
  // Central twisted cane 1
  g.box(T3(x-0.06,y+0.70,z-0.02,0.14,1.20,0.14,0.18,0.12,-0.10),brambleMid);
  // Central cane 2 (crossing arch)
  g.box(T3(x+0.08,y+0.68,z+0.04,0.13,1.16,0.13,-0.15,-0.10,0.12),brambleDark);
  // Twisted top crest knot
  g.ico(T3(x-0.04,y+1.26,z+0.02,0.24,0.18,0.22),brambleLight);

  // Dense bramble tangle clumps (providing full opacity for crouch height 0.8 - 1.1)
  g.ico(T3(x-0.12,y+0.82,z+0.06,0.36,0.28,0.34),brambleMid);
  g.ico(T3(x+0.14,y+0.78,z-0.06,0.34,0.26,0.32),brambleDark);
  g.ico(T3(x+0.02,y+0.46,z+0.12,0.38,0.26,0.36),brambleLight);

  // Flanking twisted bramble arches (expanding width to ~1.58 wide)
  // Left arching cane & side thicket clump
  g.box(T3(x-0.34,y+0.52,z+0.08,0.11,0.92,0.11,0.22,0.18,-0.32),brambleDark);
  g.box(T3(x-0.54,y+0.38,z-0.04,0.22,0.62,0.22,-0.2,-0.15,-0.45),brambleLight);

  // Right arching cane & side thicket clump
  g.box(T3(x+0.34,y+0.50,z-0.08,0.11,0.90,0.11,-0.20,-0.15,0.32),brambleMid);
  g.box(T3(x+0.54,y+0.36,z+0.04,0.22,0.60,0.22,0.2,0.15,0.45),brambleDark);

  // Front & rear bramble tendrils with thorns
  g.box(T3(x+0.04,y+0.40,z+0.36,0.08,0.68,0.08,0.45,0.32,0.1),brambleLight);
  g.box(T3(x-0.06,y+0.40,z-0.36,0.08,0.68,0.08,-0.45,-0.32,-0.1),brambleDark);

  // Pale fungus caps (4 distinct mushroom caps on the wood and root base)
  // 1. Large shelf fungus bracket on lower trunk
  g.cyl(T3(x-0.22,y+0.28,z+0.18,1,0.09,1,0.1,0.2,-0.15),fungusPale,4,0.18,0.12);

  // 2. High shelf fungus on mid-bramble
  g.cyl(T3(x+0.18,y+0.64,z+0.16,1,0.08,1,-0.15,-0.2,0.15),fungusPale,4,0.16,0.10);

  // 3. Ground toadstool cap on root mound
  g.cyl(T3(x+0.36,y+0.16,z+0.22,1,0.10,1,0,0,0),fungusPale,4,0.15,0.09);

  // 4. Small rear shelf cap
  g.cyl(T3(x-0.16,y+0.46,z-0.22,1,0.07,1,0.2,-0.15,-0.1),fungusPale,4,0.13,0.08);
}
