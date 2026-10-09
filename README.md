# Steertuning

Anonymous research project page for **Steertuning Policies from a Few Human Videos** (Paper ID 1039).

## Local preview

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

The repository root is the complete static site. GitHub Pages should publish the `main` branch from `/ (root)`. The intended address is https://steertune-robot.github.io/.

## Files

- `index.html`: project page with interactive paper figures and remaining video placeholders.
- `style.css`: responsive layout and typography.
- `figures.css` and `figures.js`: system overview, processing stages, policy diagram, and object comparisons.
- `assets/figures/`: compact research media; `manifest.json` documents sources and checksums.
- `charts.js`: manuscript results from Tables I–III and Figure 8.
- `plots.js`: interactive scaling and steering plots.
- `plot-data.js` and `assets/plot-data.json`: approximate values digitized from Figures 6–7.
- `assets/steertuning-paper.pdf`: supplied anonymous manuscript.
- `assets/fonts/`: self-hosted fonts and their required licenses.

All numerical results and uncertainty labels are preserved. Figure values are approximate, not raw logs; clipped values above 350 MSE remain unknown. Teaser and rollout video slots remain placeholders. The overview, processing, architecture, and object-generalization figures use supplied project media and manuscript values.

The page omits author names, affiliations, personal links, and contribution notes. Search indexing is discouraged with a robots meta tag. Repository ownership, commit attribution, and deployment activity are separate from the page content.

## Interactive figures

The four overview clips are synchronized, eight-second, alpha WebMs. They load only when visible, pause offscreen, and have PNG posters. Motion respects the system reduced-motion preference and can be paused. The output clip is an existing **base-policy prediction**, not a task-adapted robot rollout. The RGB cutout and dense cloud illustrate the representations rather than the exact network tensors.

The architecture follows the manuscript; the steering slider illustrates the blend at one noise level inside reverse sampling. It never changes experimental results or the prerecorded prediction. Figure 8 retains the exact original/replacement photos and trial counts. No experimental image was generated.

Interaction references: [Nerfies](https://nerfies.github.io/) (scrubbing controls; Bulma slider/carousel), [Diffusion Explainer](https://poloclub.github.io/diffusion-explainer/) (inspectable architecture; D3), and [Interactive World Simulator](https://www.yixuanwang.me/interactive_world_sim/) (paired media and task selection). This implementation uses original HTML/SVG, CSS, and browser APIs, with no remote runtime, analytics, or third-party code copied from these projects.
