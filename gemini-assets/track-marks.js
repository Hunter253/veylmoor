// Track marks (tracking and clue ground prop) | Tris: 120 / 120 budget (small prop)
// Solid: 120 + Glow: 0 = 120 tris
// Parts: 2 boot prints (2 sole + 2 heel = 4 boxes: 48 tris), 3 beast paw prints (3 pads + 3 toe rows = 6 boxes: 72 tris) = 120 tris
// Size: 0.44 W x 0.04 H x 1.76 D. Stands on y=0, faces +z.
function trackMarksProp(g,ge,x,y,z){
  const mudWarm=[96,74,52],mudDark=[54,40,28];

  // Boot print 1 (left foot, trail start at z -0.72)
  // Sole: warmer displaced mud tread; Heel: darker indented heel-strike
  g.box(T3(x-0.14,y+0.02,z-0.64,0.11,0.034,0.18,-0.10),mudWarm);
  g.box(T3(x-0.16,y+0.02,z-0.80,0.08,0.034,0.09,-0.10),mudDark);

  // Paw print 1 (beast rear paw at z -0.32, right side)
  // Pad: dark indented centre; Toes: arched row of claw marks
  g.box(T3(x+0.10,y+0.02,z-0.35,0.12,0.034,0.10,0.08),mudDark);
  g.box(T3(x+0.11,y+0.02,z-0.26,0.14,0.034,0.045,0.08),mudWarm);

  // Boot print 2 (right foot, mid-trail at z +0.06, left side)
  g.box(T3(x-0.08,y+0.02,z+0.14,0.11,0.034,0.18,0.05),mudWarm);
  g.box(T3(x-0.07,y+0.02,z-0.02,0.08,0.034,0.09,0.05),mudDark);

  // Paw print 2 (beast front paw at z +0.44, right side)
  g.box(T3(x+0.12,y+0.02,z+0.41,0.12,0.034,0.10,-0.06),mudDark);
  g.box(T3(x+0.11,y+0.02,z+0.50,0.14,0.034,0.045,-0.06),mudWarm);

  // Paw print 3 (leading beast paw at z +0.80, centre-left)
  g.box(T3(x-0.05,y+0.02,z+0.77,0.12,0.034,0.10,0.10),mudDark);
  g.box(T3(x-0.04,y+0.02,z+0.86,0.14,0.034,0.045,0.10),mudWarm);
}
