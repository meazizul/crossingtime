"""Build 29: makes the long right and wrong sounds shorter.

    python tools/sound-tighten.py www/sounds

Cindi (22 Nov 2026): some right and wrong sounds were too long to hear the
"now" in them. Each of those is two or three notes, each held for about a
quarter of a second. Here every note still starts exactly as it was
recorded, but is held for NOTE seconds only, and the last one for LAST
seconds, each ending in a short fade. The sound still begins on its first
sample and still goes up, or down, as before; it is only quicker.

NOTES gives where each note starts in the file as it came from UI SFX
(www/sounds/LICENSE.md). Run this once, on those files, not on its own
output: `git checkout <build 28> -- www/sounds` brings them back.
"""
import sys
import numpy as np, soundfile as sf

root = sys.argv[1]
NOTE, LAST = 0.11, 0.25      # seconds each note is held; the last one rings a little longer
NOTES = {                    # seconds, measured from each file's level in 5 ms steps
    "bright/right-a": [0, 0.193, 0.400],
    "bright/right-b": [0, 0.255, 0.555],
    "bright/wrong-a": [0, 0.168],
    "bright/wrong-b": [0, 0.266, 0.495],
    "warm/right-a": [0, 0.180, 0.385],
    "warm/right-b": [0, 0.250, 0.525],
}

for name, starts in NOTES.items():
    path = f"{root}/{name}.wav"
    a, rate = sf.read(path)
    if a.ndim > 1:
        a = a.mean(1)
    peak = np.abs(a).max()
    pieces = []
    for k, start in enumerate(starts):
        last = k == len(starts) - 1
        s = int(start * rate)
        piece = a[s:s + int((LAST if last else NOTE) * rate)].copy()
        fade = min(len(piece), int(rate * (0.08 if last else 0.012)))
        piece[-fade:] *= np.linspace(1, 0, fade)
        if k:   # a later note is cut out of a running sound: 3 ms in, so there is no click
            rise = int(rate * 0.003)
            piece[:rise] *= np.linspace(0, 1, rise)
        pieces.append(piece)
    out = np.concatenate(pieces)
    out *= peak / np.abs(out).max()
    sf.write(path, out, rate, subtype="PCM_16")
    print(f"{name}: {len(starts)} notes, {len(a) / rate:.2f} s -> {len(out) / rate:.2f} s")
