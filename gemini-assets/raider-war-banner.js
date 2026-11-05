// Raider war banner (back-mounted standard for the Dune Raider Commander) | Tris: 104
// Parts: back mount 12, pole 20, bronze spear tip 12, crossbar 12, faded cloth 12, sand band 12,
// two swallowtails 24 = 104. Counts toward the Commander's 2,500 humanoid budget, not a prop budget.
// Size: 0.44 W x 1.54 H x 0.12 D. Built in the torso's own space: x,y,z is the 'upper' joint
// (waist), +z is the wearer's front, so the banner sits on the back (-z) and rises over the head.
function raiderWarBannerProp(g,ge,x,y,z){
  const wood=[92,64,42],leather=[58,44,34],bronze=[150,110,62],cloth=[160,92,72],sand=[196,170,124];
  g.box(T3(x,y+0.22,z-0.17,0.14,0.16,0.06),leather);
  g.cyl(T3(x,y-0.05,z-0.22,1,1.4,1),wood,5,0.028,0.028);
  g.cyl(T3(x,y+1.35,z-0.22,1,0.14,1),bronze,4,0.045,0);
  g.box(T3(x,y+1.24,z-0.22,0.44,0.04,0.04),wood);
  g.box(T3(x,y+1.01,z-0.245,0.4,0.42,0.02),cloth);
  g.box(T3(x,y+1.08,z-0.245,0.41,0.07,0.03),sand);
  g.box(T3(x+0.1,y+0.76,z-0.245,0.18,0.14,0.02,0,0,0.3),cloth);
  g.box(T3(x-0.1,y+0.76,z-0.245,0.18,0.14,0.02,0,0,-0.3),cloth);
}
