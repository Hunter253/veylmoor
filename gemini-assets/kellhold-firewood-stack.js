// Kellhold firewood stack (Frostfang Reach town prop) | Tris: 96 / 120 budget (small prop)
// Parts: two slender side stakes 24, four Z-oriented split logs in a 2x2 grid 48,
// two uneven stepped snow patches 24 = 96
// Size: 0.86 W x 0.70 H x 0.62 D. Stands on y=0, faces +z.
function kellholdFirewoodStackProp(g,ge,x,y,z){
  const stake=[52,38,30],bark=[64,46,36],log=[86,62,48],heart=[140,108,76],split=[158,126,90],snow=[224,234,240];
  g.box(T3(x-0.37,y+0.35,z,0.06,0.70,0.10,0,0,0.03),stake);
  g.box(T3(x+0.37,y+0.34,z,0.06,0.68,0.10,0,0,-0.03),stake);
  g.box(T3(x-0.16,y+0.15,z-0.02,0.32,0.28,0.52,0,0,0.12),bark);
  g.box(T3(x+0.16,y+0.16,z+0.05,0.31,0.27,0.56,0,0.03,-0.18),split);
  g.box(T3(x-0.15,y+0.42,z+0.04,0.30,0.26,0.55,0.02,0,-0.20),heart);
  g.box(T3(x+0.15,y+0.40,z-0.04,0.30,0.25,0.52,-0.02,0,0.18),log);
  g.box(T3(x-0.15,y+0.58,z+0.02,0.31,0.06,0.46,0.03,0,-0.12),snow);
  g.box(T3(x+0.15,y+0.53,z-0.03,0.29,0.06,0.44,-0.03,0,0.14),snow);
}
