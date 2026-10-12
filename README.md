# Steertuning

Anonymous research project page for **Steertuning Policies from a Few Human Videos**, Paper ID 1039.

Current release: **v2026.10.11.5-anonymous**. GitHub Pages publishes `main` from the repository root at https://steertune-robot.github.io/.

The page shows anonymous authors, omits author affiliations and personal links, and retains the anonymous manuscript. Public provenance uses recording identifiers and checksums without private absolute paths. `robots.txt` and the page metadata discourage search indexing. Third-party licenses and attribution remain intact.

## Reading order and current design

The teaser and introductory human → finetune → steer → robot animation lead into the full manuscript Abstract. Chapters then cover collection, preparation, pretraining, finetuning, steering, deployment, evaluation, and detailed experiments. The page uses the original dotted paper background, open layouts, and square corners. `typography.css` is the final style layer: Source for body text, figures, and controls; Cormorant for editorial headings.

Five recorded paper-disposal demonstrations feed the LoRA training node together, alongside the frozen pretrained policy. The resulting task-adapted policy stays connected in desktop and phone layouts. The unnecessary replay control and schematic caption are removed. Deployment proceeds directly into the full-stack walkthrough and its three rollouts; the duplicate standalone execution subsection is removed. All detailed experiments remain visible, without content disclosures.

## Media and provenance

All non-teaser video files have no audio streams. The active teaser, `assets/teaser/steertuning-teaser-20261009.mp4`, retains the complete supplied edit, original audio, and 1× playback. Paper-disposal clips have 4× speed encoded and play at 1× in the browser. Human and robot clips are independent recordings. `assets/task-demos/paper-disposal/manifest.json` records the five reviewed action windows, source hashes, and output hashes.

Collection uses 28 genuine Dwild home-routine clips in four panning strips with pause, offscreen pause, and a static reduced-motion fallback. Manuscript statistics are 109.6 hours, 3.69M retained frames, and 48.7k instructions.

Preparation uses the recorded bread-to-oven episode. The full contact video includes the supplied stronger face blur, preserves all 524 frames and the full 17.466667-second duration, and has no audio. `assets/contact/privacy-manifest.json` records frame registration and refreshed imagery. Raw hand–scene distances, measured contact intervals, SAM masks, and scene geometry are preserved. The contact graph stays fixed beside the video; Qwen, Gemini, SAM, and propagation are illustrated over matching recorded frames. The pickup example uses frames 95–123, while downstream training-input pairs use placement frames 106–153. The contact scan runs at 4× and annotation at 2×. The three preparation pairs appear side by side on wide screens and stack on phones.

The policy architecture retains the original pot-to-bowl example. The separate pretrained-policy prediction section remains removed.

Steering uses genuine WUJI meshes and the controlled moved-bread experiment in `assets/steering/moved-bread/`. Right-hand guidance shifts 10 cm along world X; observations and left-hand guidance stay unchanged. The recorded approach, closure, and lift lead into the genuine predicted correction and corrected replay. The target-distance proxy changes 11.90→5.04 cm at a fixed grasp pose; it is not task success or contact accuracy. Replay, scrubbing, orbit/reset, translucent hand trails, and reduced-motion support remain available.

Charts retain manuscript results and identify approximate digitized curves. Shared non-scaling strokes preserve readable line weights across viewport sizes. Third-party runtime, font, model-logo, and WUJI license attribution is retained with the corresponding assets.
