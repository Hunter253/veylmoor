# Hair styles (4.a Appearance choices)

**What this batch is for:** Hair choices on the character screen, shared by all five classes. The game recolours them, so use one mid-brown [110,80,50] for the hair.

**Zone:** None (worn by heroes).

**Existing models to reuse or match:** Read the hero models in index.html (H({...}) and the hero-*.js files). Each piece is a prop drawn around the head joint: the head is a ball about 0.24 wide centred at (0,0.12,0); the face points +z and its front is at z=0.12; the top of the head is at y=0.27. Don't draw the head itself.

**Assets (name, budget, what it is, how it moves):**

1. `hair-short.js`, budget **medium**: short cropped hair, aim 150 triangles.
2. `hair-long-tied.js`, budget **medium**: long hair tied at the back, the tail hanging to the shoulders, aim 200.
3. `hair-braids.js`, budget **medium**: two thick braids to the shoulders, aim 200.
4. `hair-topknot.js`, budget **medium**: shaved sides with a topknot, aim 150.
5. `hair-wild.js`, budget **medium**: a wild, shaggy mane, aim 220.

**Must include:** Write each one as nameProp(g,ge,x,y,z) with x,y,z = the head joint. Nothing below y=-0.02 at the back (it would clip into the neck).

**Must avoid:** text or letters, real-world symbols, modern items, anything from another game or film, and the story characters (the Keeper, the masked envoys).
