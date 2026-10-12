# Steertuning

Anonymous research project page for **Steertuning Policies from a Few Human Videos**, Paper ID 1039.

Current release: **v2026.10.12.1-anonymous**. GitHub Pages publishes `main` from the repository root at https://steertune-robot.github.io/.

The page shows anonymous authors, omits author affiliations and personal links, and retains the anonymous manuscript. Public provenance uses recording identifiers and checksums without private absolute paths. `robots.txt` and the page metadata discourage search indexing. Third-party licenses and attribution remain intact.

## Reading order and current design

The teaser and introductory human → finetune → steer → robot animation lead into the full manuscript Abstract. Chapters then cover collection, preparation, pretraining, finetuning, steering, deployment, evaluation, and detailed experiments. The page uses the original dotted paper background, open layouts, and square corners. `typography.css` is the final style layer: Source for body text, figures, and controls; Cormorant for editorial headings.

Five recorded paper-disposal demonstrations feed the LoRA training node together, alongside the frozen pretrained policy. The resulting task-adapted policy stays connected in desktop and phone layouts. The unnecessary replay control and schematic caption are removed. Deployment proceeds directly into the full-stack walkthrough and its three rollouts; the duplicate standalone execution subsection is removed. All detailed experiments remain visible, without content disclosures.

## Media and provenance

All non-teaser video files have no audio streams. The active teaser, `assets/teaser/steertuning-teaser-20261009.mp4`, retains the complete supplied edit, original audio, and 1× playback. Paper-disposal clips have 4× speed encoded and play at 1× in the browser. Human and robot clips are independent recordings. `assets/task-demos/paper-disposal/manifest.json` records the five reviewed action windows, source hashes, and output hashes.

Collection uses 28 genuine Dwild home-routine clips in four panning strips with pause, offscreen pause, and a static reduced-motion fallback. Manuscript statistics are 109.6 hours, 3.69M retained frames, and 48.7k instructions.

Preparation uses the recorded bread-to-oven episode. The full contact video includes the supplied stronger face blur, preserves all 524 frames and the full 17.466667-second duration, and has no audio. `assets/contact/privacy-manifest.json` records frame registration and refreshed imagery. Raw hand–scene distances, measured contact intervals, SAM masks, and scene geometry are preserved. The contact graph stays fixed beside the video at 1× playback, with pause, replay and scrubbing. Annotation overlays were removed. Model-input preparation shows one enlarged before/after pair at a time at 0.65×, advancing after each pair finishes; reduced motion shows all three static pairs. The processing pairs retain placement frames 106–153.

The policy architecture retains the original pot-to-bowl example. The separate pretrained-policy prediction section remains removed.

Steering uses genuine WUJI meshes and the controlled moved-bread experiment in `assets/steering/moved-bread/`. Right-hand guidance shifts 10 cm along world X; observations and left-hand guidance stay unchanged. Two matched views compare genuine unsteered and steered predictions, using identical framing, linked orbit/reset, and a shared replay clock. A recorded-scene still provides context; A/B markers identify the original bread and virtual target. Retargeted/interpolated poses and the absence of robot execution are labeled. The target-distance proxy changes 11.90→5.04 cm at a fixed grasp pose; it is not task success or contact accuracy. Replay, scrubbing, orbit/reset, translucent hand trails, and reduced-motion support remain available.

Charts retain manuscript results and identify approximate digitized curves. Shared non-scaling strokes preserve readable line weights across viewport sizes. Third-party runtime, font, model-logo, and WUJI license attribution is retained with the corresponding assets.

## Phone layouts

At viewport widths of 600 CSS pixels or less, the architecture uses a three-stage flow with the same recorded inputs and named encoders. Deployment uses a vertical numbered sequence without crossing wires. The steering comparison fits its full range into the available width; scaling charts use fewer tick labels while preserving every point, error bar, and selection control. Contact keeps the full video and measured graph. Narrow playback controls wrap onto two rows. Desktop and tablet layouts above this breakpoint remain unchanged.

Deployment spacing: diagram columns grow with their contents. Step cards keep 16 px vertical and 20 px horizontal padding; planner and skill cards use 20–24 px padding, with responsive wrapping and no fixed-height compression.

Flower-watering robot rollout: the full user-supplied replacement edit, `flower-robot-20261012.mp4`, runs for 3.5035 seconds at its original timing and full 1280 × 720 frame. Browser playback remains 1×; the human demonstration is unchanged.
