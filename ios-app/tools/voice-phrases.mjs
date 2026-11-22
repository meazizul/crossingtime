// Build 28: lists the sentences the app can say, for the recorded voice.
//
//   node tools/voice-phrases.mjs > /tmp/phrases.json
//
// Reads the app's own files, so the list follows the wording as it changes:
//   - every plain text in www/js/*.js that reads as a sentence or a short
//     prompt ("Get ready", "Replay");
//   - templates whose only moving parts are a choice between fixed words
//     (within or outside the margin; longer, shorter or about the same);
//   - the directions and notices written in www/index.html.
// A sentence with a number of seconds or a name in it cannot be listed; the
// app says those with the phone's voice.
import { readFileSync, readdirSync } from "node:fs";

const root = new URL("../www/", import.meta.url);
const SENTENCE = /\S.*?(?:[.!?…]+(?=\s|$)|$)/g;
const key = (s) => s.replace(/​/g, "").replace(/\s+/g, " ").trim().replace(/[.!…]+$/, "").trim().toLowerCase();

// Words a template may choose between.
const CHOICES = [
  [/\$\{gsVerdictWords\([^)]*\)\}/g, ["within the margin", "outside the margin"]],
  [/\$\{gsAnswerTruthWords\([^}]*\)\}/g, ["longer", "shorter", "about the same"]]
];
const TERNARY = /\$\{[^{}?]*\?\s*"([^"]*)"\s*:\s*"([^"]*)"\s*\}/;

function expand(template) {
  let list = [template];
  for (const [pattern, words] of CHOICES) {
    list = list.flatMap((t) => (pattern.test(t) ? words.map((w) => t.replace(pattern, w)) : [t]));
    pattern.lastIndex = 0;
  }
  for (let round = 0; round < 4; round += 1) {
    list = list.flatMap((t) => {
      const m = t.match(TERNARY);
      return m ? [t.replace(m[0], m[1]), t.replace(m[0], m[2])] : [t];
    });
  }
  return list.filter((t) => !t.includes("${"));
}

const texts = new Set();
for (const name of readdirSync(new URL("js/", root)).filter((n) => n.endsWith(".js"))) {
  const code = readFileSync(new URL(`js/${name}`, root), "utf8");
  for (const m of code.matchAll(/"((?:[^"\\\n]|\\.)*)"/g)) texts.add(m[1].replace(/\\"/g, '"').replace(/\\n/g, " "));
  for (const m of code.matchAll(/`((?:[^`\\]|\\.)*)`/g)) expand(m[1]).forEach((t) => texts.add(t.replace(/\\`/g, "`")));
}
const html = readFileSync(new URL("index.html", root), "utf8")
  .replace(/<script[\s\S]*?<\/script>/g, " ")
  .replace(/<style[\s\S]*?<\/style>/g, " ");
for (const m of html.matchAll(/>([^<>]+)</g)) {
  const t = m[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  if (t) texts.add(t);
}

const SHORT = new Set(["get ready", "replay", "correct", "not correct", "updated", "saved", "copied", "deleted", "unlocked", "locked", "ready", "listen", "wait", "now", "longer", "shorter", "about the same"]);
const sentences = new Map();
for (const text of texts) {
  if (/[<>{}\\=;]|\$\(|https?:|\.js|\.css|^[a-z]/.test(text)) continue;
  if (text.length > 400) continue;
  for (const raw of text.match(SENTENCE) || []) {
    const s = raw.trim();
    const k = key(s);
    if (!k || k.length < 3 || s.length > 220) continue;
    if (!/^["'“(]?[A-Z]/.test(s)) continue;
    if (!/[a-z]{2}/.test(s)) continue;
    if (!/\s/.test(k) && !SHORT.has(k)) continue;
    if (/&[a-z]+;/.test(s)) continue;
    if (!sentences.has(k)) sentences.set(k, /[.!?…]$/.test(s) ? s : `${s}.`);
  }
}
const out = [...sentences.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, text]) => ({ key: k, text }));
process.stdout.write(JSON.stringify(out, null, 1));
