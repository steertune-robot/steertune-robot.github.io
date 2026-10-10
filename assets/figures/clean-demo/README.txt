Table wiping: one coherent recorded sequence. See manifest.json for timing, data, and provenance.
Inputs: 80 frames / 8 seconds / 10 fps; freeze at clip frame 40 (4 seconds), preprocessed 280, raw 289.
Output: one genuine unadapted base-policy prediction, 15 saved poses, rendered over 4.5 seconds. No task finetuning or demonstration steering.
Mask: fresh SAM3 segmentation of the TABLE / task-relevant work surface, not the cloth. This exact generated mask is fed to the policy. The original dataset is unchanged.
Hands: recorded observations and saved predictions retargeted to Wuji geometry. Display interpolation is not inference or robot execution.
All media and numeric NPZ archives are byte-identical to the supplied export. Original staging remains untouched.
