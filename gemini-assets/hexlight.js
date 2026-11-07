// Gloamwood: Hexlight, floating violet will-o-wisp with a faceted core and three orbiting shards | Tris: 223 / 600 budget (small creature or pet)
// Solid: 203 + Glow: 20 = 223 tris
// Size: 0.48 W x 1.37 H x 0.42 D. Stands on y=0, faces +z.
// Motion: bobs (y +-0.06), shards orbit the core; attack flares the core and fires a violet bolt.
function hexlightModel(){
  const vapor=[150,108,196],shroud=[178,138,222],shard=[206,170,240],heart=[236,214,240];
  const root=part('root',null);

  const body=part('body',mk(g=>{
    g.cyl(T3(0,0,0,1,1.1,1),vapor,5,0.035,0.08);
    g.sphere(T3(0,1.2,0,0.17,0.17,0.17),shroud,8,6);
    g.cyl(T3(0,0.92,0,1,0.18,1,0,Math.PI,0),vapor,5,0.06,0);
  }),[0,0,0]);
  body.k.push(part('nucleus',mk(g=>{
    g.ico(T3(0,1.2,0,0.08,0.09,0.08),heart);
  }),[0,0,0],{e:2.0,t:'#c080ff'}));

  const shardM=mk(g=>{
    g.cyl(T3(0,-0.05,0,1,0.1,1),shard,4,0.03,0);
    g.cyl(T3(0,-0.05,0,1,0.1,1,0,Math.PI,0),shard,4,0.03,0);
  });
  body.k.push(part('mote1',shardM,[0.22,1.28,0.10]));
  body.k.push(part('mote2',shardM,[-0.20,1.14,-0.14]));
  body.k.push(part('mote3',shardM,[0.06,1.02,-0.22]));

  root.k.push(body);
  return {root,kind:'hexlight'};
}
