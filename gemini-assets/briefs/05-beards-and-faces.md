# Beards (4.a Appearance choices)

**What this batch is for:** Beard choices on the character screen. Use one mid-brown [110,80,50]; the game recolours it.

**Zone:** None (worn by heroes).

**Existing models to reuse or match:** Same head frame as brief 04: head ball about 0.24 wide centred at (0,0.12,0), face front at z=0.12, chin at about y=0.0.

**Assets (name, budget, what it is, how it moves):**

1. `beard-short.js`, budget **small**: a short full beard, aim 90.
2. `beard-long.js`, budget **medium**: a long beard to mid-chest, aim 160.
3. `beard-braided.js`, budget **medium**: a beard in one thick braid, aim 160.
4. `beard-moustache.js`, budget **small**: a broad moustache only, aim 60.

**Must include:** nameProp(g,ge,x,y,z) with x,y,z = the head joint.

**Must avoid:** text or letters, real-world symbols, modern items, anything from another game or film, and the story characters (the Keeper, the masked envoys).
