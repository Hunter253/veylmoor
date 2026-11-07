// Hiding cover frost (Frostfang Reach low snow-laden pine thicket) | Tris: 308 / 400 budget (medium prop)
// Solid: 308 + Glow: 0 = 308 tris
// Parts: snow base drift 32, shaded snow wedge 12, rock 20, trunks & timber branches 44 (cyl 20 + 2 boxes 24), pine tiers & snow caps 200 (10 5-seg cyls) = 308 tris
// Size: 1.56 W x 1.40 H x 1.56 D. Stands on y=0, faces +z.
function hidingCoverFrostProp(g,ge,x,y,z){
  const snowWhite=[238,244,252],snowBlue=[196,212,228],pineDark=[34,56,42],pineNeedles=[42,68,50],bark=[58,44,32],rock=[84,88,96];

  // Base snow drift mound
  g.cyl(T3(x,y,z,1,0.14,1),snowWhite,8,0.78,0.64);
  g.box(T3(x-0.08,y+0.06,z+0.06,0.76,0.08,0.68,0.15),snowBlue);

  // Cold mountain rock poking out of the drift
  g.ico(T3(x-0.45,y+0.16,z-0.24,0.18,0.14,0.18),rock);

  // Pine thicket timber trunks
  g.cyl(T3(x-0.06,y+0.10,z-0.02,1,0.55,1,0,0.04,-0.06),bark,5,0.08,0.05);
  g.box(T3(x-0.28,y+0.32,z+0.05,0.07,0.42,0.07,0.15,0.2,-0.35),bark);
  g.box(T3(x+0.28,y+0.30,z-0.06,0.07,0.40,0.07,-0.2,0.15,0.38),bark);

  // Central pine thicket tiers (reaching ~1.40 tall)
  // Lower bough tier & snow cap
  g.cyl(T3(x-0.04,y+0.48,z-0.02,1,0.38,1,0,0.02,-0.04),pineDark,5,0.48,0.26);
  g.cyl(T3(x-0.05,y+0.74,z-0.02,1,0.12,1,0,0.02,-0.04),snowWhite,5,0.46,0.24);

  // Mid bough tier & snow cap
  g.cyl(T3(x-0.05,y+0.78,z-0.02,1,0.36,1,0,-0.02,0.03),pineNeedles,5,0.38,0.18);
  g.cyl(T3(x-0.05,y+1.02,z-0.02,1,0.12,1,0,-0.02,0.03),snowWhite,5,0.36,0.16);

  // Top peak bough tier & snow crest
  g.cyl(T3(x-0.04,y+1.06,z-0.02,1,0.34,1,0,0.03,-0.02),pineDark,5,0.25,0.03);
  g.cyl(T3(x-0.04,y+1.24,z-0.02,1,0.16,1,0,0.03,-0.02),snowWhite,5,0.20,0.02);

  // Flanking low pine thicket boughs (expanding width to ~1.56 wide)
  // Left spreading bough + snow
  g.cyl(T3(x-0.34,y+0.28,z+0.06,1,0.42,1,0.1,0.15,-0.38),pineDark,5,0.36,0.16);
  g.cyl(T3(x-0.42,y+0.52,z+0.08,1,0.14,1,0.1,0.15,-0.38),snowWhite,5,0.34,0.14);

  // Right spreading bough + snow
  g.cyl(T3(x+0.34,y+0.26,z-0.06,1,0.44,1,-0.15,-0.1,0.36),pineNeedles,5,0.38,0.18);
  g.cyl(T3(x+0.42,y+0.52,z-0.08,1,0.14,1,-0.15,-0.1,0.36),snowWhite,5,0.36,0.15);
}
