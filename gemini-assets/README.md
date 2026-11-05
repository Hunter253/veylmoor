# Gemini assets

Drop-off folder for 3D assets made by Gemini for Wardens of Veylmoor. Nothing here is in the game until it has been measured, tested and added to `index.html`.

## Adding an asset

- Work on the `gemini` branch. Never commit to `main`, because `main` goes straight to the live game.
- Add one file per asset, named after it in lowercase with hyphens, such as `lantern-post.js`.
- The file holds one function, built only from the shapes allowed in the asset rules, with its triangle count and size in a comment at the top.
- Follow the asset rules you were given: theme, scale, triangle budgets and moving parts.

## Don't add

- Image textures, imported model files or anything that needs Three.js
- Anything copied from another game, film or artist
- Story secrets: this repo is public, so anyone can read this folder

When this branch is merged, this folder goes live with the site unless it's removed or blocked first.
