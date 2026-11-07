# Brief 01: Tracks, clues and search spots (12.b New quest types)

## 1. Assets Made

All 4 requested assets were made as new models. None were replaced with recolours as these are bespoke quest interaction ground props.

1. `gemini-assets/track-marks.js`
2. `gemini-assets/clue-marker.js`
3. `gemini-assets/search-spot.js`
4. `gemini-assets/hiding-reeds.js`

## 2. Triangle Counts & Dimensions

| Asset | Triangles (Solid + Glow) | Budget | Dimensions (W x H x D) | Result |
| --- | --- | --- | --- | --- |
| `track-marks.js` | 120 (120 solid + 0 glow) | 120 (small prop) | 0.44 x 0.04 x 1.76 | Approved (Job #16) |
| `clue-marker.js` | 92 (92 solid + 0 glow) | 120 (small prop) | 0.52 x 0.62 x 0.48 | Approved (Job #17) |
| `search-spot.js` | 92 (92 solid + 0 glow) | 120 (small prop) | 0.63 x 0.28 x 0.57 | Approved (Job #19) |
| `hiding-reeds.js` | 316 (316 solid + 0 glow) | 400 (medium prop) | 1.59 x 1.42 x 1.44 | Approved (Job #20) |

All 4 assets are static props (`*Prop(g, ge, x, y, z)`), stand on `y = 0`, face `+z`, and have footprint centers at `(0, 0)`.

## 3. Movement
All four props in this batch are static props and do not move in code.
- `hiding-reeds.js` is designed so the engine's vertex shader / wind system can sway the upper blades and stalks naturally.

## 4. Left Out & Notes
- Fine rivets, chest locks, and text / letters were omitted per the engine asset guidelines (keeping details chunky and >= 0.03 thick so they read from 10 units away).
- On `search-spot.js`, the dug hole was modeled as a dark loam patch sitting flush on `y = 0` rather than recessing below ground, preserving the `y >= 0` rule.
- On `track-marks.js`, the trail length was set to 1.76 units alternating paw and heeled boot prints with warmer displaced mud highlights so it clearly reads from above.

## 5. Ideas
- **Interactive state changes**: `search-spot.js` could have a paired excavated variant `search-spot-dug.js` (empty chest with open lid) for when the player finishes looting the spot.
- **Investigation particle / gleam**: For tracking quests, an occasional subtle faint glint or disturbance particle could trigger above `clue-marker.js` to draw players' eyes during foggy moor weather without needing glow polygons.
