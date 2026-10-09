Steertuning diagram dependencies

d3.v7.min.js — D3 7.9.0, self-hosted browser runtime for SVG rendering and
diagram interaction. License: d3-LICENSE.txt.
Source: https://github.com/d3/d3

ELK 0.12.0 is a build-time dependency used by scripts/build-architecture.cjs.
Its generated node/edge layouts are stored in dist/graph-layouts.js; the ELK
runtime is not served to visitors. License: elkjs-LICENSE.md.
Source: https://github.com/kieler/elkjs

Both versions are pinned in the project package manifest and lockfile.
The explainer projects linked in the project README are design/implementation
references only; no source code or media from those projects is redistributed.
