# CrossingTime

An **Orientation & Mobility (O&M)** training tool that helps blind and low-vision
travelers build a felt, intuitive sense of how long it takes them to cross a
street.

The core design principle: feedback is delivered as **felt duration** — sounds,
visual flashes, and vibration — **never as a number of seconds**. The student
learns the *feel* of the duration, not a stopwatch reading.

## Origins

CrossingTime, which was called CrossingTime from August to October 2026, began as a copy of **Cindi Lashinsky's CrossingTime (Streets)
repository**, her original proof of concept, and has been refined and expanded
through ongoing collaboration with her. See [`NOTICE.md`](NOTICE.md).

---

## Install the app (build 18)

**One link, for everyone:** <https://azizulhaque.me/crossingtime/>. It has a
button for iPhone, a button for Android and a button for the browser version,
with two short steps under each. Send that link; it never changes.

Behind the buttons:

- **iPhone:** TestFlight, <https://testflight.apple.com/join/wYreYpF6>. Press
  **Accept**, then **Install**. Already have it? Open TestFlight, press **Update**.
- **Android:** the newest build,
  <https://github.com/meazizul/crossingtime/releases/latest/download/CrossingTime-android.apk>.
  Open the downloaded file, press **Install**, allow this source once if asked.
  A Google Play version is in closed testing and will replace this step.
- **Browser:** <https://azizulhaque.me/crossingtime/app/>. Everything works
  except vibration.

**The session code.** The first time the app is opened it asks for a session
code; the four practice activities open after it is typed, and the phone stays
unlocked from then on. Everything else in the app works without it. Instructors running their own sessions: ask
the team for the code.

To check which build you have: open the app, **Help**, **About**. It should say
build 19. Step-by-step help for each phone, written to be read aloud:
[`docs/INSTALL_GUIDE.md`](docs/INSTALL_GUIDE.md).

## Test it and tell us what you find

You do not need to ask anyone how to test. In order:

1. **Install** with the steps above, or just open the browser link.
2. **Set up:** open **Instructor setup**, enter a first-half time (for example 4), a full-street time (for example 8) and a margin (0.4), then go back. Or press **Try it now with example times** on Home.
3. **Try the four activities** in order: Practice my timing, Comparison preparation, Comparison practice, At the street. The answer screens take a swipe or a tap anywhere; **Back**, top left, cancels a try.
4. **With VoiceOver or TalkBack on,** follow [`docs/TESTING.md`](docs/TESTING.md), section H4b: it lists exactly what should happen on each answer screen.
5. **Report** anything wrong or unclear as a GitHub issue: <https://github.com/meazizul/crossingtime/issues/new>. Say the phone, the build (Help, About), what you did, what happened and what you expected. Screen recordings with VoiceOver on are the most useful thing you can send.

The step-by-step checklists for everything else are in [`docs/TESTING.md`](docs/TESTING.md); what each part of the app does and why is in [`docs/HOW_IT_WORKS.md`](docs/HOW_IT_WORKS.md).

## For reviewers: the 60-second version

**What it does.** The O&M Specialist sets two crossing times (the first half of
the street, and the full street). The student then practices in four steps:

1. **Practice my timing.** Tap when you step off, tap again when you think you
   would arrive. The app replays the taps against the real times: a bright
   chime if within the margin, a low buzzing pulse if not. The *timing error
   is heard as rhythm*, not read as a number.
2. **Comparison preparation.** The app starts a sound after a random wait. The
   student stops it when their crossing time is up.
3. **Comparison practice.** The app plays a sample warning time. The student
   judges it longer, shorter, or about the same as their crossing time.
4. **At the street.** The same judgment with real vehicles.

The app is meant to be used under the guidance of an O&M Specialist. It does
not replace instruction.

**How to try it right now,** in order of effort:

| | Effort | What you need | What you get |
|---|---|---|---|
| **1** | 10 seconds | Any browser | Open [`ios-app/www/index.html`](ios-app/www/index.html) directly, or run a static server (below) |
| **2** | 2 minutes | An iPhone on the same Wi-Fi | Real phone install via Safari → Add to Home Screen |
| **3** | longer | A Mac with Xcode, or Android Studio | Build the native apps yourself (see [`ios-app/README-IOS.md`](ios-app/README-IOS.md)) |

**To try it instantly — nothing to install:**

```
https://azizulhaque.me/crossingtime/app/?demo=1
```

That link loads example times and opens straight into practice, so you can press
the button immediately.

Fastest path to run it locally:

```sh
cd ios-app
npm run lan        # prints a localhost URL and a phone-reachable Wi-Fi URL
```

Then open the printed address. Open **Instructor setup**, enter any two times
(e.g. first half = 4 s, full street = 8 s), go to **Practice my timing** and press
**Begin**.

How the iPhone and Android apps are built:
**[`ios-app/README-IOS.md`](ios-app/README-IOS.md)**

---

## Documentation map

Start here depending on what you want:

| Document | What it covers |
|---|---|
| **[`docs/PARTICIPANT_GUIDE.md`](docs/PARTICIPANT_GUIDE.md)** | **For people trying the app.** Simple English, screen-reader friendly |
| **[`docs/INSTALL_GUIDE.md`](docs/INSTALL_GUIDE.md)** | Getting the app on an iPhone, an Android phone, or a browser |
| **[`docs/HOW_IT_WORKS.md`](docs/HOW_IT_WORKS.md)** | What each part of the app does, and why |
| **[`docs/APP_GUIDE.md`](docs/APP_GUIDE.md)** | How the app works and how to operate it — every screen, setting, and mode |
| **[`docs/TESTING.md`](docs/TESTING.md)** | How to test it: step-by-step procedures and pass/fail checklists |
| **[`docs/HAPTICS.md`](docs/HAPTICS.md)** | Vibration and haptic feedback — how it works, why iOS needs a native app, how to verify it |
| **[`docs/CHANGELOG.md`](docs/CHANGELOG.md)** | Every change made, what it fixed, and when |
| **[`ios-app/README-IOS.md`](ios-app/README-IOS.md)** | How the iPhone and Android apps are built |

### Printable versions

Every guide below is also in `docs/pdf/` as a PDF, for reading away from a code
editor or handing to someone:

- `CrossingTime-Participant-Guide.pdf` — for people trying the app
- `CrossingTime-Install-Guide.pdf` — getting the app on a phone
- `CrossingTime-How-It-Works.pdf` — what each part does, and why

The history of the project, from the first prototype to today, is in
[`docs/CHANGELOG.md`](docs/CHANGELOG.md).

---

## Repository layout

```
.
├── ios-app/                  ← THE CURRENT APP. Work here.
│   ├── www/index.html          Markup. No build step, no framework
│   ├── www/css/app.css         Styles, themes, large-text reflow
│   ├── www/js/                 store.js, engine.js, history.js, features.js, comparison.js, signal.js, app.js
│   ├── www/js/vendor/          qrcode.js (MIT, Kazuhiko Arase) for "Show to my instructor"
│   ├── www/manifest.webmanifest, www/sw.js, www/icons/
│   ├── tests/                  Playwright browser tests (`npm test`)
│   ├── ios/                    Native iOS project (Capacitor)
│   ├── android/                Native Android project (Capacitor)
│   ├── serve-lan.mjs           Dev server reachable from a phone over Wi-Fi
│   └── README-IOS.md           How the native apps are built
│
├── docs/                     Documentation (see map above)
└── PRIVACY.md                What the app stores, and what it never sends
```

**Which file is the app?** `ios-app/www/index.html`. That is the one to edit.

---

## Technical summary

- **No build step, no framework, no bundler.** The application is one HTML file,
  one stylesheet and a few plain JavaScript files. Open it and it runs.
- **No backend, no accounts, no network calls.** All state lives in the browser's
  `localStorage` under `om-*` keys, with a durable copy in the phone's own
  storage (or IndexedDB on the web) that is restored if the web storage is
  lost. Nothing is collected or transmitted.
- **Audio** is synthesized live — no sound files. In the iPhone app the app
  itself plays it, so the silent switch cannot mute it; in the browser and on
  Android it is the Web Audio API, scheduled on the `AudioContext` clock, which
  does not drift. Cues pass through a soft clipper and limiter: loud, and
  overlapping cues cannot crackle.
- **The visual replay** is driven by a `requestAnimationFrame` loop reading that
  same `AudioContext` clock, so sound and picture stay locked together.
- **Native shell:** [Capacitor](https://capacitorjs.com/), which wraps the web app
  in real iOS and Android apps. On iOS a small CrossingTime plugin drives the
  Taptic Engine and connects Siri shortcuts; both apps open `gapsense://` links
  (an instructor's setup, or an activity).
- **Accessibility** is a primary requirement, not an afterthought: four themes,
  text scaling to 300%, screen-reader announcements that pause during timing
  playback, an optional self-voicing mode, redundant shape/color/text encoding,
  and audio-only / audio+visual / visual-only output modes.

---

## Accessibility statement

The intended users are blind and low-vision. Every design decision is
constrained accordingly:

- Information is **never carried by color alone** — each stage is distinguished
  by hue *and* shape *and* border style *and* a text label.
- All interface colors were checked for a minimum **4.5:1** contrast ratio
  against the text placed on them (WCAG AA), in every theme.
- Text scales to **300%** with the layout reflowing to single columns; nothing is
  clipped and no control becomes unreachable.
- Screen-reader announcements are **suppressed during replay**, so VoiceOver does
  not talk over the timing tones the exercise depends on.
- The full-screen visual replay uses colors calibrated for low vision on a black
  field, and is deliberately excluded from theming.

---

## Known limitations

- **Not on the App Store or Play Store.** Distribution is TestFlight and a
  direct APK. Store assets and listings are separate work.
- **No device automation.** Browser tests exist (`cd ios-app && npm test`, 206
  Playwright tests in the installed Chrome) and cover the logic and the
  accessibility wiring; audio quality, haptics, VoiceOver and TalkBack still need
  a real phone. See `docs/TESTING.md`.
- **Experimental feature off by default.** The adaptive margin is unproven; the
  instructor switches it on in Instructor setup.
- **The app name is under discussion.** In published research, "gap" means the
  time between two vehicles, not a warning time.

---

## License and credits

ISC. Origins and collaborators: [`NOTICE.md`](NOTICE.md). The QR code library
in `ios-app/www/js/vendor/qrcode.js` is MIT-licensed (Kazuhiko Arase).
