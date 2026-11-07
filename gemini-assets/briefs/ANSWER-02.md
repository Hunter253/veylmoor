# Brief 02: Hiding cover for each zone (12.b New quest types)

## 1. Assets Made

All 4 zone stealth cover props were created as new models matching the `hiding-reeds` profile (approx 1.4 tall by 1.6 wide, with solid cover at crouching height 0.8 to 1.1). None were replaced with recolours as each zone required distinct biome-native geometry (sandstone/scrub, snowy pines, violet brambles/fungus, and volcanic basalt/stumps).

1. `gemini-assets/hiding-cover-dunes.js` (Sunscar Dunes)
2. `gemini-assets/hiding-cover-frost.js` (Frostfang Reach)
3. `gemini-assets/hiding-cover-gloam.js` (Gloamwood)
4. `gemini-assets/hiding-cover-ember.js` (Emberfall Caldera)

## 2. Triangle Counts & Dimensions

| Asset | Triangles (Solid + Glow) | Budget | Dimensions (W x H x D) | Result |
| --- | --- | --- | --- | --- |
| `hiding-cover-dunes.js` | 288 (288 solid + 0 glow) | 400 (medium prop) | 1.58 x 1.42 x 1.56 | Approved (Job #21) |
| `hiding-cover-frost.js` | 308 (308 solid + 0 glow) | 400 (medium prop) | 1.56 x 1.40 x 1.56 | Approved (Job #22) |
| `hiding-cover-gloam.js` | 304 (304 solid + 0 glow) | 400 (medium prop) | 1.58 x 1.41 x 1.56 | Approved (Job #23) |
| `hiding-cover-ember.js` | 312 (276 solid + 36 glow) | 400 (medium prop) | 1.60 x 1.41 x 1.56 | Approved (Job #25) |

All 4 props are static props (`*Prop(g, ge, x, y, z)`), stand on `y = 0`, face `+z`, and have footprint centers at `(0, 0)`.

## 3. Movement
All four props are static environment props and do not animate via code.
- Foliage tips and bramble ends can receive gentle vertex-shader swaying in engine when wind effects are enabled.

## 4. Left Out & Notes
- On `hiding-cover-ember.js`, all colour channels were audited to ensure no values dipped below 25 (minimum channel value set to 28), and rock shades were stepped up to `[88, 78, 72]` on chipped crests to prevent silhouette flattening in dark volcanic biomes.
- Glowing fissures on `hiding-cover-ember.js` were kept restrained to 36 triangles across recessed crevices to prevent bloom wash-out while remaining visible from top-down angles.
- On `hiding-cover-gloam.js`, lighter top tones `[96, 62, 114]` were applied to upper bramble knots so the crown does not vanish against dark Gloamwood forest floors.

## 5. Ideas
- **Stealth Interaction Feedback**: When the player enters crouch within the cover radius of any hiding cover prop, a subtle rustle audio cue or small puff of biome debris (loose sand puffs in Dunes, snow flakes in Frostfang, violet spore drift in Gloamwood, or ember sparks in Emberfall) could trigger to confirm the player is concealed.
- **Bi-directional Peek Holes**: A small notched gap in the upper branches/rocks at eye-level allows players to see outward patrolling guards without breaking cover.
