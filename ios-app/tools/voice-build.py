"""Build 28: records the app's fixed sentences in a natural voice.

    node tools/voice-phrases.mjs > phrases.json
    python tools/voice-build.py phrases.json www/voice MODEL_DIR FFMPEG

Uses the open Kokoro text-to-speech model (Apache 2.0; model files from
github.com/thewh1teagle/kokoro-onnx, package `kokoro-onnx`), voice af_heart.
The recordings are made once, on the developer's computer, and shipped with
the app: nothing is sent anywhere when the app speaks.

Each sentence becomes www/voice/<10 hex digits>.mp3 (the name is made from
the sentence, so an unchanged sentence keeps its file), and
www/voice/manifest.json maps sentence to file. A sentence already recorded is
not recorded again.
"""
import hashlib, json, os, re, subprocess, sys, tempfile
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

phrases_path, out_dir, model_dir, ffmpeg = sys.argv[1:5]
VOICE, SPEED = "af_heart", 1.0
os.makedirs(out_dir, exist_ok=True)
phrases = json.load(open(phrases_path))
kokoro = Kokoro(f"{model_dir}/kokoro-v1.0.onnx", f"{model_dir}/voices-v1.0.bin")

SAY = [  # how to say what the model would stumble on
    (r"\bCrossingTime\b", "Crossing Time"), (r"\bVoiceOver\b", "Voice Over"), (r"\bTalkBack\b", "Talk Back"),
    (r"\bO&M\b", "O and M"), (r"&", " and "), (r"…", "."), (r"[“”\"]", ""), (r"’", "'"),
    (r"\bCSV\b", "C S V"), (r"\be\.g\.", "for example"), (r"\s+", " "),
]

def spoken(text):
    for pattern, to in SAY:
        text = re.sub(pattern, to, text)
    return text.strip()

clips, made, kept = {}, 0, 0
for item in phrases:
    key, text = item["key"], item["text"]
    name = hashlib.sha1(key.encode("utf-8")).hexdigest()[:10]
    clips[key] = name
    target = f"{out_dir}/{name}.mp3"
    if os.path.exists(target) and os.path.getsize(target) > 500:
        kept += 1
        continue
    audio, rate = kokoro.create(spoken(text), voice=VOICE, speed=SPEED, lang="en-us")
    audio = np.asarray(audio, dtype="float32")
    loud = np.where(np.abs(audio) > 0.01)[0]
    if len(loud) == 0:
        print("SILENT:", text); del clips[key]; continue
    start = max(0, loud[0] - int(0.03 * rate)); end = min(len(audio), loud[-1] + int(0.12 * rate))
    audio = audio[start:end].copy()
    fade = int(0.01 * rate)
    audio[:fade] *= np.linspace(0, 1, fade, dtype="float32"); audio[-fade:] *= np.linspace(1, 0, fade, dtype="float32")
    # One loudness for every sentence: -19 dB RMS, peaks held under -1 dB.
    rms = float(np.sqrt((audio ** 2).mean()))
    gain = min(10 ** (-19 / 20) / max(rms, 1e-6), 0.89 / float(np.abs(audio).max()))
    audio *= gain
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        sf.write(tmp.name, audio, rate, subtype="PCM_16")
    subprocess.run([ffmpeg, "-y", "-loglevel", "error", "-i", tmp.name, "-ac", "1", "-ar", "24000",
                    "-c:a", "libmp3lame", "-b:a", "40k", "-write_xing", "0", target], check=True)
    os.unlink(tmp.name)
    made += 1
    if made % 50 == 0: print(f"{made} recorded", flush=True)

# Drop recordings of sentences the app no longer has.
wanted = {f"{name}.mp3" for name in clips.values()}
removed = 0
for name in os.listdir(out_dir):
    if name.endswith(".mp3") and name not in wanted:
        os.unlink(f"{out_dir}/{name}"); removed += 1
json.dump({"v": 1, "voice": f"kokoro {VOICE}", "clips": clips}, open(f"{out_dir}/manifest.json", "w"), ensure_ascii=False, separators=(",", ":"), sort_keys=True)
size = sum(os.path.getsize(f"{out_dir}/{n}") for n in os.listdir(out_dir))
print(f"done: {made} recorded, {kept} kept, {removed} removed, {len(clips)} sentences, {size/1e6:.1f} MB")
