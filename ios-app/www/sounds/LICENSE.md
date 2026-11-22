# Sounds in this folder

The short sounds in `bright/` and `warm/` come from **UI SFX**
(https://github.com/romainsimon/uisfx, version 0.4.0), whose audio files are
dedicated to the public domain under **Creative Commons CC0 1.0 Universal**
(https://creativecommons.org/publicdomain/zero/1.0/). No attribution is
required; this file records where each sound came from.

| File here | UI SFX file | What it is in CrossingTime |
|---|---|---|
| `bright/right-a.wav` | `glass/success` | right, or within the margin (choice A) |
| `bright/right-b.wav` | `glass/complete` | right, or within the margin (choice B) |
| `bright/wrong-a.wav` | `glass/blocked` | wrong, or outside the margin (choice A) |
| `bright/wrong-b.wav` | `glass/error` | wrong, or outside the margin (choice B) |
| `bright/marker.wav` | `glass/press` | the student's own sound |
| `bright/confirm.wav` | `glass/pause` | the button chime |
| `bright/reference.wav` | `glass/double-click` | the real crossing time |
| `warm/…` | the same seven files from `organic/` | the "Warm" style |

Changes made: converted to 16-bit mono WAV, the silent tail cut with a 15 ms
fade, and every file set to the same peak level. The start of each file is
untouched, so a sound begins on its first sample.

The steady warning-time sound is not a recording: the app generates it.
