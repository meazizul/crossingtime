# Testing Guide — CrossingTime: Crossing Practice

Step-by-step procedures for verifying the app, with pass/fail criteria. Written
so someone who has never seen the project can work through it start to finish.

---

## Quick start (2 minutes, any computer)

```sh
cd ios-app
npm run lan
```

Open the printed `http://localhost:8000/` address.

Then:
1. On first run, press **I understand** on the O&M notice, then close the
   sound tutorial.
2. Home → **Instructor setup** → enter `4`, `8`, `0.4` → **Back**.
3. Home → **Practice my timing**. Choose mode **Start → Halfway**.
4. Press **BEGIN**, count "one-thousand-one … one-thousand-four", press **MARK**.
5. Listen to the replay.

**Pass:** you hear your two taps, then a bright chime at the 4-second mark
(because you were close). No console errors.

---

## Test environments and what each can prove

| Environment | Setup effort | Can verify | Cannot verify |
|---|---|---|---|
| **Desktop browser** | None | Layout, themes, text scaling, dialogs, logic, share links | Real audio quality, haptics, touch |
| **iPhone via Safari** | 2 min | Everything above, plus touch, real speaker, VoiceOver | Haptics (impossible on iOS web) |
| **iOS Simulator** | Xcode | Native shell, splash, layout at exact device sizes | Audio quality, haptics |
| **iPhone, native app** | ~15 min | **Everything**, including haptics and the ringer switch | — |

How the native apps are built: [`../ios-app/README-IOS.md`](../ios-app/README-IOS.md)

---

## A. Core practice flow

**Setup:** clear `4`, full `8`, margin `0.4`.

### A1 — Two-waypoint run
1. Mode: **Start → Halfway**.
2. Press **BEGIN**. → Button turns indigo, reads **MARK**, shows ●.
3. Wait ~4 seconds. Press **MARK**.
4. Replay begins automatically.

**Pass:**
- [ ] Button label goes Begin → Mark → Replay
- [ ] Banner reads "Press Mark for Halfway." after Begin
- [ ] Replay plays your taps, then a **bright chime** near the 4s mark
- [ ] App resets itself to **BEGIN** afterward

### A2 — Deliberately late (the "outside" cue)
Repeat A1 but wait ~8 seconds before pressing Mark.

**Pass:**
- [ ] Replay plays a **low, longer, buzzing pulse** instead of the chime
- [ ] It is unmistakably different from A1's chime
- [ ] Banner shows "Reference: outside tolerance for Halfway."

### A3 — Three-waypoint run
Mode **Start → Halfway → Finish**. Tap at roughly 0s, 4s, 8s.

**Pass:**
- [ ] Three taps accepted; replay only starts after the third
- [ ] Button color/shape changes at each stage (indigo → orange → green)
- [ ] Two feedback cues in the replay, one per waypoint

### A4 — Setup guard
Clear both time fields in Instructor setup, then go back.

**Pass:**
- [ ] A **"Times needed"** prompt appears on the main screen
- [ ] Pressing BEGIN does **not** start a run
- [ ] Tapping "Open Instructor setup to enter times" opens Instructor setup with
      the cursor in the first empty field

---

## B. Audio

Do **B1 outdoors**, near real traffic. It is the single most important test in
this document, and it cannot be done at a desk.

### B1 — Roadside audibility ⭐
Take a phone outside near moving traffic, at normal volume. Run a practice with
one accurate and one badly-late waypoint.

**Pass:**
- [ ] Both cues are audible over traffic
- [ ] The chime and the pulse are **clearly different from each other**
- [ ] Neither sounds distorted, buzzy-in-a-broken-way, or clipped

> Background: the outside pulse was retuned from a 240–260 Hz fundamental up to
> 294–349 Hz precisely because small phone speakers roll off below ~300 Hz — the
> old cue was partly lost inside the speaker. This test confirms that fix on real
> hardware.

### B2 — Ringer switch (native app only)
Flip the physical silent switch **on**. Run a practice.

**Pass:** sounds still play.

Also check the spoken "Get ready" in Comparison preparation, and run
**Accessibility → Play a test sound**: it should say "It plays even with the
silent switch on."

If they stop, the native player in `ios-app/ios/App/App/GapSenseAudio.swift`
is not keeping the `playback` session.

### B3 — Overlap does not clip
Set margin to `2.0` so accuracy is easy, and tap close to the reference time. Your
marker tone and the feedback cue will land nearly together.

**Pass:** the combined sound stays clean — no crackle. (This is the master
limiter doing its job.)

### B4 — Sound previews
Settings → Sound calibration → each **Play …** button, and **Hear my marker
sound**.

**Pass:** every button plays; A and B options are distinguishable.

---

## C. Haptics

Full detail in [`HAPTICS.md`](HAPTICS.md).

### C1 — Backend detection
Accessibility → read the note under **Test haptic pulse**.

**Pass:** the note matches reality — "Native haptics active" only in the native
app; "No haptics on this browser" in iOS Safari.

### C2 — Test pulse (real device, native app)
Tick **Vibrate on cue** → **Test haptic pulse**. Hold the phone loosely.

**Pass:** three *distinct* sensations — one heavy knock (marker), three heavy
knocks (within margin), one long buzz of about half a second (outside). On
Android web: 45 ms, 35-45-35-45-35 ms, 240 ms.

### C3 — Haptics during practice
Enable vibration, run A1 and A2.

**Pass:**
- [ ] A pulse on every **Mark** tap
- [ ] A different pulse at each replay feedback moment
- [ ] The "outside" pulse feels heavier than the "acceptable" one

### C4 — DeafBlind configuration ⭐
Output mode → **Visual only** (silences audio) + vibration on. Run a practice.

**Pass:** every event is still felt. This is the configuration the feature exists
for.

---

## D. Accessibility

### D1 — Text at 300% ⭐
Accessibility → Text size → **Maximum (300%)**.

**Pass:**
- [ ] No text clipped or overlapping
- [ ] Layout reflows to single columns
- [ ] Every control still reachable by scrolling
- [ ] In dialogs, the **Close** button stays visible (sticky header)

Repeat at 200% and 250%.

### D2 — All four themes ⭐
Try System, Light, Dark, Inverted — **and** set your OS to dark mode, then choose
**Light** in the app.

**Pass:** all text readable against its background in every combination. No white
text on white, no white on light teal.

> This combination is specifically called out because both failures existed
> historically: white-on-teal in dark mode failed WCAG at ~1.8:1, and forced Light
> mode under a dark OS produced invisible white-on-white buttons.

### D3 — High contrast
Enable **High contrast**.

**Pass:** pure black/white, all gradients flattened, everything still legible.

### D4 — VoiceOver ⭐ (real device)
iOS **Settings → Accessibility → VoiceOver → On**. Navigate the app by swiping.

**Pass:**
- [ ] Page announces the app heading first
- [ ] Progress markers announce as one summary, e.g. "Progress markers: Start
      complete, Halfway current"
- [ ] Radio groups announce their group name ("Acceptable (within tolerance)")
- [ ] Opening a dialog moves focus to its title; closing returns focus to the
      button that opened it
- [ ] **During replay, VoiceOver stays quiet** — it must not talk over the tones

**Also record, as a design finding rather than a bug:** with VoiceOver on,
activating a button needs a double-tap. Does that added latency degrade marking
accuracy? This is an open question about the interaction model for a
timing-measurement app, not a defect in the code.

### D5 — Visual-only mode
Output mode → **Visual only**. Run a practice.

**Pass:**
- [ ] No sound at all
- [ ] Screen goes black during replay
- [ ] Grey flash on your taps
- [ ] **Green circle** = acceptable, **orange triangle** = outside
- [ ] Shapes differ by *shape*, not only color

### D6 — Reduced motion
Enable iOS **Reduce Motion**.

**Pass:** the button flash effect is suppressed; everything still functions.

### D8 — The session code (build 19)
Fresh install (or clear the app's data). Open the app.

**Pass:**
- [ ] Home shows the Session code card; the four activity buttons are dimmed
      and do nothing; Help, Accessibility, Instructor setup and Progress open
- [ ] A Siri phrase, an Android shortcut or a `gapsense://open/practice` link
      lands on Home with the code field focused and a spoken prompt
- [ ] A wrong code is announced and the field keeps focus
- [ ] The right code unlocks: the pop-up closes, focus moves to the first
      activity
- [ ] Closing and reopening the app does not ask again; the unlock also
      survives an update to a later build
- [ ] An install updated from build 16, 17 or 18 asks once (the old code no
      longer works)
- [ ] A presentation code typed outside its session time says it works only
      during its session
- [ ] A double tap on plain text never zooms the page (iPhone and Android)
- [ ] Help, About says CrossingTime and build 19

### D7 — The replay said and shown (build 15)
VoiceOver and TalkBack **off**. Run a practice try, a Comparison preparation
try, a Comparison practice trial (answer wrong on purpose) and one vehicle At
the street.

**Pass:**
- [ ] "Replay" is spoken before every replay and no tone starts before the
      word is over
- [ ] A bar under the button (in the street pad, under the status) fills for
      the length of the replay and gains a mark at each sound; it disappears
      when the replay ends; no seconds on it unless **Show user times** is on
- [ ] After the right/wrong sound: "Correct." or "Not correct. It was …", and
      the replay starts only after the words
- [ ] After each replay, one sentence describing it ending with the usual
      prompt; never a number of seconds
- [ ] Accessibility > Speech: turning both switches off restores silence
      (word, descriptions and all); the bar still shows
- [ ] With VoiceOver or TalkBack **on**: the same words are read by the screen
      reader, not twice
- [ ] Score lines under the buttons show no "margin 0.40s" (F2); it returns
      with **Show user times** on

---

## E. Persistence and sharing

### E1 — Settings survive restart
Set times, close the app fully, reopen.

**Pass:** times, theme, text size, and sound choices are all retained.

### E2 — Setup link round trip
1. Instructor setup → fill **Instructor email** and a **Student code** → turn
   one activity off → **Share the setup link** (or **Text it to the student**).
2. Open the link on another device or browser.

**Pass:** the second device receives both crossing times, the margin, the
instructor email, the student code (upper-cased) and the activity choice,
shows "Your instructor's setup is now on this device.", and Home reads
"Crossing times set" with the activity hidden. In a browser, **Open in the Gap
Sense app** is offered and, on a phone with the app, opens the app with the
same setup.

### E2b — What the link carries
Untick **Crossing times and margin** and share again. Open the link on a
device that already has other times.

**Pass:** that device keeps its own times and takes only the other parts.
Unticking all three refuses to share.

### E3 — Corrupted link is rejected
Take a setup link and change one character in the middle of the token. Also try
a link whose student code is longer than 8 characters or whose email is not an
address (build one with `buildShareTimingLink()` after typing bad values).

**Pass:** the app reports "This setup link is invalid." and does **not**
apply any value. (The token carries a checksum, and every field is validated.)
Links made by earlier builds (versions `v1` and `v2`) still import.

---

## F. Native iOS shell

### F1 — Launch
**Pass:** splash (crossing glyph on teal gradient) → app loads within ~2s. A
brief blank moment during the transition is normal.

### F2 — App identity
**Pass:** home-screen icon shows the crossing glyph; label reads **CrossingTime**.

### F3 — Safe areas
On a notch/Dynamic Island device, in both orientations.

**Pass:** no content hidden behind the Dynamic Island or the home indicator.

### F4 — Backgrounding
Start a practice, background the app mid-run, return.

**Pass:** the app recovers to a usable state; no stuck overlay or frozen button.

---

## G. Regression checks

Three bugs were fixed in the iOS build. Confirm they stay fixed.

### G1 — Marker cue fires
Enable vibration (or watch the banner). Tap **Mark** mid-practice.

**Pass:** a cue fires on the tap itself, not only during replay.
*(Was: the `marker` cue was defined but never emitted — tapping Mark produced
nothing.)*

### G2 — Banner shows both facts
After a mid-run Mark tap, read the banner.

**Pass:** it reads e.g. **"Halfway marked. Press Mark for Finish."**
*(Was: "Marker recorded" was written and then overwritten on the next statement,
so it was never readable.)*

### G3 — Progress markers reach the screen reader
With VoiceOver on, focus the progress markers row.

**Pass:** it announces the full summary.
*(Was: the container carried `aria-hidden="true"`, so the carefully computed label
was discarded.)*

---

## H. The activities (build 7)

### H0 — First run and guidance
Delete the app's data (or use a fresh browser profile) and open it.

**Pass:**
- [ ] "Before you start" appears first: use with an O&M Specialist, not a replacement for instruction
- [ ] Escape does not close it; **I understand** does, then the sound tutorial opens
- [ ] Home shows the O&M line at the top
- [ ] With VoiceOver, one swipe per activity reads "Practice my timing, Develop an accurate sense…, button"; there is no hidden "Home" heading
- [ ] Each new screen puts VoiceOver focus on its title

### H1 — Practice logs and score line
Instructor setup 4 / 8 / 0.4. Home → **Practice my timing** → Begin, Mark after
about four seconds.

**Pass:**
- [ ] After the replay the line under the button reads "Last 1: 1 within margin · margin 0.40s"
- [ ] Progress shows the attempt and one dot in the run strip
- [ ] Settings and Accessibility are enabled again
- [ ] Begin, then **Back** mid-run: Settings and the mode radios are enabled on Home; nothing was recorded

### H2 — Comparison preparation
Home → **Comparison preparation** → **READY**.

**Pass:**
- [ ] The app says "Get ready" (no beep) and the button reads WAIT
- [ ] After a wait a steady sound starts and the button reads NOW; it keeps going until you press
- [ ] Pressing after about the crossing time stops the sound and replays: the sound, your sound where you pressed, the chime at the crossing time
- [ ] Waits vary: some under 2 seconds, some over 5
- [ ] Pressing before the sound says "Too early", resets to READY, records nothing
- [ ] Not pressing at all: the sound stops by itself; nothing is recorded
- [ ] Options → **One short beep to start** plays a beep instead of the steady sound
- [ ] Leaving the screen while the sound plays stops it

### H3 — Comparison practice
Home → **Comparison practice** → **Play a sample warning time**.

**Pass:**
- [ ] The sample is one steady sound at one loudness, no fade at either end
- [ ] A full-screen answer pad opens; swiping on it never scrolls the page; with a screen reader focus is on **About the same**
- [ ] Swipe up = longer, swipe down = shorter, tap = about the same, anywhere on the pad; a swipe never also counts as a tap
- [ ] Right after answering: the chime or the low pulse, the haptic, and with visual on, the circle or triangle
- [ ] The replay plays the sample and **your own sound** where your crossing time ends; no chime or pulse inside the replay
- [ ] Nothing starts by itself; **Play** is needed for the next sample
- [ ] **Sound loudness** and **Sound pitch** change the preview and the next sample, survive a reload, and match on Comparison preparation
- [ ] **Two beeps with silence between** changes the sample
- [ ] **Random pause** delays the sample
- [ ] **How much**: offered only after a correct longer or shorter answer; never after a wrong answer or "about the same"
- [ ] Replay (a), the default: the steady sound for the sample warning time (as long as the sample was, never the crossing time), your sound at your crossing time and again at your estimate, the chime or pulse where the sample ended
- [ ] Replay (b) (Instructor setup): the comparison replay, then your estimate against the real difference
- [ ] The "Longer does not mean long enough" note shows until **Got it, hide this note**; Help → **Show the safety notes again** brings it back
- [ ] Nowhere on the screen does the word "gap" appear

### H4 — At the street ⭐ (outdoors, real traffic, with an instructor)
Home → **At the street** → choose Hearing or Vision → **START**.

**Pass:**
- [ ] No microphone permission is ever requested
- [ ] The instructions say to position yourself as directed by your O&M Specialist and to tap when you think you detect a vehicle
- [ ] Swipe left (or **Vehicle from the left**) when a vehicle is detected from the left; swipe right for the right
- [ ] Tap (or **It passed in front of me**) when it passes; swipe down (or **It never came**) if it never comes
- [ ] After it passes, the app asks you to judge; it does not say the answer first
- [ ] Left compares with the first-half time, right with the full-street time
- [ ] Replay set to "Only after a wrong answer" replays only after a wrong answer; "Never" plays only the right or wrong sound
- [ ] **Back** (top left) closes the pad and puts focus on the screen's title; a vehicle in progress is recorded as cancelled, not scored; the tally under the button counts vehicles, correct judgments and vehicles that never came
- [ ] After a replay, **Play it again** appears under the status and replays the last vehicle without recording it; it goes when the next vehicle is detected

### H4b — Answer screens with VoiceOver and TalkBack ⭐ (build 14; needs a real phone)
Comparison practice and At the street, with VoiceOver on (iPhone) or TalkBack on (Android).

**Pass:**
- [ ] As an answer screen opens, VoiceOver reads the swipe area's label first ("Answer area. Swipe up for longer…"); the first swipe or tap already answers (no swallowed first tap)
- [ ] On the How much screen the first tap starts the timing
- [ ] After How much closes, swiping on the Home screen reaches every item down to the end-of-page sound; VoiceOver never reads "How much" on the Home or answer screens
- [ ] Back, top left of every pad, is outside the area: touch it, hear "Back", double-tap; the two-finger scrub does the same
- [ ] After every try in all four activities the cursor stays on the main button; it never jumps to Back in the header
- [ ] With "Vibrate on cue" on, every cue vibrates during tries, with sound on and off (Settings, Debug does not show it; Accessibility, Play a test sound lists how many haptics played, fell back or failed)
- [ ] The student's own sound is clean over the steady sound in every replay, at the loudest app volume and every sample pitch
- [ ] Android with TalkBack: a two-finger swipe on the pad answers; a double-tap is a tap; Settings, Debug, "Gestures the answer screens received" lists what arrived

### H5 — Instructor setup
**Pass:**
- [ ] Turning an activity off hides it on Home and renumbers the rest; a Siri shortcut or link to it lands on Home
- [ ] Turning practice modes off hides them on Practice; the last one cannot be turned off
- [ ] An option set to "Student chooses" shows a switch on the student's screen; "On" or "Off" hides it with a note
- [ ] Setting an instructor code locks the screen; a wrong code is refused; the right one unlocks; leaving locks it again; saving an empty code removes it

### H6 — Report
Progress → **Show my report to send**.

**Pass:**
- [ ] Each Progress box reads to VoiceOver as one sentence ("Comparison practice: 56 percent, 9 of 16 correct. How much longer or shorter: 0 of 5 estimates within margin."); nothing reads "em dash" or "dot"
- [ ] The report opens with the cursor at its start; the Show button disappears; only **Send with another app** says Send; **Hide report** closes it
- [ ] The report starts with "Student code: …", gives the crossing times and margin, and contains no name
- [ ] Every line gives the times in seconds with the time of day; a try with "how much" is one line; cancelled tries say "cancelled (not scored)"
- [ ] **Text to my instructor** opens Messages with the report, addressed to the number from Instructor setup when one is set
- [ ] **Show to my instructor** shows one or more QR codes that another phone's camera reads; Next and Previous move between codes
- [ ] **Email to my instructor** appears only when an instructor email is set and a mail app can open; with no mail app the note says so
- [ ] **Export for Excel (CSV file)** shares (phone) or downloads (browser) a file that opens one try per row
- [ ] **Delete all my practice history** opens a warning first (nothing is deleted on the tap); Cancel, Escape and Back delete nothing and focus returns to the button; **Delete history** empties the history, keeps settings and crossing times, and says where it was deleted from (build 15, tracker 14.2)
- [ ] After **Delete history**, force-quit the app at once and reopen: the history is still gone, with and without crossing times saved (build 15, tracker 14.4)
- [ ] Help, About shows where the backup copy is kept

### H7 — Adaptive margin (experimental)
Instructor setup → tick **Adaptive margin of error**. Do ten practice attempts on one crossing.

**Pass:**
- [ ] Nothing changes before the tenth attempt; after it, the margin for that lane (and only that lane) is 8% tighter
- [ ] Ten poor attempts in a row return it to the set margin
- [ ] It never goes below 0.10 s or above the set margin
- [ ] **Reset adaptive margins** clears every lane

### H8 — Gating
Clear both times in Instructor setup, then open Home.

**Pass:** all activities are dimmed and their buttons disabled; the "Start here"
box offers **Open Instructor setup**.

### H9 — Speech, Siri and sound check
**Pass:**
- [ ] Accessibility → **Speak directions aloud**: each screen's name and directions are spoken; speech stops while a sound is being timed
- [ ] **Play a test sound** plays a tone and a chime and says the sound engine is on
- [ ] iPhone: "Hey Siri, Practice my timing in CrossingTime" opens that activity; the four actions appear in the Shortcuts app
- [ ] Android: touching and holding the icon shows the four activities

---

## I. Automated tests

From `ios-app/`:

```sh
npm install        # once
npm test           # Playwright, in the Google Chrome installed on the Mac
```

The browser tests (168 at build 13) cover: boot with no console errors, every screen and
dialog, focus on the screen title, single-button activities, names and American
spelling, the first-run O&M notice, the demo link, vibration on by default (and
the one-time reset), self-voicing, the native shell (haptics plugin, playback
audio session, Siri and `gapsense://` links) using a simulated Capacitor,
recovery from an interrupted sound engine, Practice logging and per-lane
margins, Comparison preparation ("Get ready", sustained sound, beep style, wait
mix, false start, auto-stop, leaving), Comparison practice (steady envelope
rendered offline, full-screen pad, swipes, result shapes, replay sounds, "how
much" rules, replays (a) and (b), instructor overrides, loudness and pitch),
At the street (no microphone, gestures, the student's judgment, never came,
replay modes, judging off, hearing or vision), Instructor setup (activities,
modes, instructor code), setup links v1/v2/v3 and rejected links, the share
sheet and Messages, the report wording, deleting data, the adaptive maths, and
the visual-only / 300% / high-contrast / reduced-motion configuration.

Since build 13 the suite also holds the acceptance tests from the 17 October
2026 review of build 12 (`tests/oct17-review.spec.mjs`, one test per bug 14
to 39, written to check what the student experiences rather than how the code
is written) and two regression files beside it (`tests/oct17-fixes.spec.mjs`,
`tests/oct17-audit-fixes.spec.mjs`). Each of those tests failed on build 12
and passes from build 13. A bug from that list counts as fixed only while its
test passes. Build 14 added `tests/build14-*.spec.mjs` (pads, reports, sound
and storage) and build 15 `tests/build15-delete-privacy.spec.mjs` (the delete
warning, the durable copy after a delete, the privacy text); 212 tests at
build 15, part 1.

They cannot hear or feel anything. Still manual, on a real phone: B1 roadside
audio, B2 ringer switch, every test in C, D4 VoiceOver (and TalkBack), F, H4
outdoors, and the Siri check in H9.

---

## Reporting a problem

Please include:

1. **Which environment** — desktop browser / iPhone Safari / simulator / native app
2. **Which test** — e.g. "B1"
3. **Expected vs actual**
4. **Settings in use** — first half, full street, margin, mode, output mode
5. **Console output** if on desktop (⌥⌘J in Chrome)
6. Device and OS version for phone issues
