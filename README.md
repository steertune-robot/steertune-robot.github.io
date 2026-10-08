# Steertuning

Anonymous research project page for **Steertuning Policies from a Few Human Videos** (Paper ID 1039).

## Local preview

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

The repository root is the complete static site. GitHub Pages should publish the `main` branch from `/ (root)`. The intended address is https://steertune-robot.github.io/.

## Files

- `index.html`: project page and labeled scientific-media placeholders.
- `style.css`: responsive layout and typography.
- `charts.js`: manuscript results from Tables I–III and Figure 8.
- `plots.js`: interactive scaling and steering plots.
- `plot-data.js` and `assets/plot-data.json`: approximate values digitized from Figures 6–7.
- `assets/steertuning-paper.pdf`: supplied anonymous manuscript.
- `assets/fonts/`: self-hosted fonts and their required licenses.

All numerical results and uncertainty labels are preserved. Figure values are approximate, not raw logs; clipped values above 350 MSE remain unknown. Media slots are placeholders.

The page omits author names, affiliations, personal links, and contribution notes. Search indexing is discouraged with a robots meta tag. Repository ownership, commit attribution, and deployment activity are separate from the page content.
