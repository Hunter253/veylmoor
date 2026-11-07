// Hiding cover dunes (Sunscar Dunes crouch-behind stealth cover) | Tris: 288 / 400 budget (medium prop)
// Solid: 288 + Glow: 0 = 288 tris
// Parts: sand drift base 32, dark sand wedge 12, sandstone leaning slab 36 (3 boxes), boulder 20, rear drift 12, loose rock 12, scrub branches & twigs 84 (7 boxes), scrub bush clumps 80 (4 icos) = 288 tris
// Size: 1.58 W x 1.42 H x 1.56 D. Stands on y=0, faces +z.
function hidingCoverDunesProp(g,ge,x,y,z){
  const sand=[212,184,136],sandDark=[186,154,112],sandStone=[198,154,106],stoneDark=[164,124,84],stoneWarm=[214,172,120],scrubTwig=[98,82,56],scrubDry=[138,122,78],scrubPale=[156,138,90];

  // Base sand drift banked around the spot
  g.cyl(T3(x,y,z,1,0.10,1),sand,8,0.78,0.64);
  g.box(T3(x-0.10,y+0.04,z+0.08,0.76,0.06,0.68,0.15),sandDark);

  // Leaning slab of sandstone (solid crouch cover, reaches ~1.40 tall)
  // Main leaning slab
  g.box(T3(x-0.12,y+0.72,z-0.06,0.28,1.26,0.82,0.18,-0.10,0.16),sandStone);
  // Eroded top crest of the slab
  g.box(T3(x-0.22,y+1.22,z-0.08,0.22,0.30,0.74,0.18,-0.10,0.16),stoneWarm);
  // Strata ridge along the front face
  g.box(T3(x-0.04,y+0.62,z-0.02,0.10,0.16,0.78,0.18,-0.10,0.16),stoneDark);

  // Secondary sandstone boulder wedging the base of the slab
  g.ico(T3(x-0.34,y+0.25,z-0.12,0.26,0.22,0.26),stoneDark);

  // Banked sand drift blowing up against the slab rear
  g.box(T3(x-0.25,y+0.24,z-0.32,0.34,0.36,0.30,-0.2,0.3,-0.15),sand);

  // Displaced desert rock on the side
  g.box(T3(x-0.45,y+0.09,z+0.26,0.16,0.12,0.14,0.3,0.2,0.1),sandStone);

  // Cluster of dry desert scrub growing alongside and behind the slab
  // Gnarled root/branch bases
  g.box(T3(x+0.18,y+0.24,z+0.08,0.06,0.38,0.06,-0.1,0.2,0.25),scrubTwig);
  g.box(T3(x+0.32,y+0.28,z-0.06,0.06,0.44,0.06,0.2,-0.1,0.32),scrubTwig);
  g.box(T3(x+0.12,y+0.42,z+0.18,0.05,0.40,0.05,0.3,0.2,-0.15),scrubTwig);

  // Scrub bush clusters (spiny desert bushes)
  // Low bushy base
  g.ico(T3(x+0.22,y+0.36,z+0.06,0.32,0.25,0.28),scrubDry);
  // Mid scrub mass (adds solid height up to ~0.95 - 1.05)
  g.ico(T3(x+0.34,y+0.62,z+0.02,0.28,0.26,0.26),scrubPale);
  // Upper thorny scrub clump
  g.ico(T3(x+0.26,y+0.92,z-0.04,0.24,0.22,0.24),scrubDry);
  // Outer spreading bush extending the cover to ~1.6 wide
  g.ico(T3(x+0.56,y+0.42,z-0.08,0.28,0.24,0.26),scrubPale);

  // Dry branching twigs protruding from the scrub
  g.box(T3(x+0.38,y+0.98,z-0.02,0.04,0.34,0.04,0.15,0.3,0.22),scrubTwig);
  g.box(T3(x+0.60,y+0.60,z-0.12,0.04,0.32,0.04,-0.2,0.1,0.45),scrubTwig);
  g.box(T3(x+0.08,y+0.82,z+0.16,0.04,0.30,0.04,0.35,-0.2,-0.2),scrubTwig);
  g.box(T3(x-0.02,y+0.48,z+0.34,0.04,0.28,0.04,0.4,0.2,0.3),scrubTwig);
}
