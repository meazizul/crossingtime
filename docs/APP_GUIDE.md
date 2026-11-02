# App Guide — CrossingTime: Crossing Practice

How the app works and how to operate it. Written for someone picking it up for
the first time, including reviewers who are not the intended end user.

---

## 1. The idea

A traveler who is blind or has low vision needs to judge whether the warning
time of an approaching vehicle is long enough to cross. That judgment is a
*felt sense of duration*, and like any physical skill it improves with
calibrated practice and immediate feedback.

This app provides that feedback loop. It does **not** tell the student "you were
1.2 seconds late." It plays back their crossing as rhythm, so the error is felt
in the same modality it will be needed in on the street.

**Design rule that governs everything:** feedback is duration and texture, never
a number.

---

## 1b. Use with an O&M Specialist

The app is meant to be used under the guidance of an Orientation and Mobility
Specialist. It is not a replacement for instruction and does not cover all the
skills needed to cross streets. A notice says so on first run (it cannot be
skipped with Escape, and appears even from the conference link), Home carries
the same line, and Help can show it again.

## 1c. Where the crossing times come from

Every activity compares against two reference times: the **first half of the
street** (traffic from the left) and the **full street** (traffic from the
right). These are measured and set by the O&M Specialist: time at least three
crossings and use the longest, because if it took that long once it may take
that long again. The instructor enters them in **Instructor setup**, or sends
the student a link that sets them (see section 2). The app does not measure
them; a student pressing buttons while crossing a street cannot do that safely
or precisely.

Until both times exist, all four activities stay locked and the Home screen
says where to get them.

---

## 1d. The four activities

The home screen presents them in the order the skill is taught. Each is one
button whose name is its title and description, so a screen reader reads one
item per activity. The instructor can hide any of them.

| # | Activity | What you do | Why |
|---|---|---|---|
| **1** | **Practice my timing** | Tap out how long you think the crossing takes | Develop an accurate sense of your crossing times through practice and feedback |
| **2** | **Comparison preparation** | Wait for the sound, and stop it at your crossing time | Get ready to compare your time to various sample times |
| **3** | **Comparison practice** | Judge a sample warning time as longer, shorter or about the same as your crossing time; optionally, how much | Build the skills you will need to compare your crossing time with actual vehicles |
| **4** | **At the street** | Swipe when you think you detect a vehicle, tap when it passes, then judge | Get warning times of actual vehicles, and compare them with your crossing time |

### 2. Comparison preparation

Choose which crossing. Press **READY**. The app says **"Get ready"** out loud
(with two light taps on the hand), and the button reads **WAIT**. After a wait
the sound starts, like hearing a vehicle, and the button reads **NOW**. Press it
when you think you would finish crossing.

- **The sound** is either a steady sound that keeps going until you press, or
  one short beep then silence. The instructor fixes it, or the student chooses
  under **Options**.
- **Waits vary**: some quick (under 2 seconds), some medium (2 to 5), some long
  (5 to 10), mixed so the same kind never comes three times in a row.
- Pressing before the sound starts is a false start: the app says so and
  records nothing. If nobody presses, the sound stops by itself and nothing is
  recorded.

The replay uses the Practice vocabulary: the sound for as long as you let it
run, your own sound where you pressed, and the chime or the low pulse where
your real crossing time ends.

### 3. Comparison practice

Choose which crossing, then press **Play a sample warning time**. The app plays
a sound whose length stands for a vehicle's warning time: from first detecting
it until it passes in front of you. It is **one steady sound at one loudness**,
with no fade, so a student with hearing loss hears all of it. Two beeps with
silence between is the alternative.

When it ends, a **full-screen answer pad** opens. It never scrolls the page.

- **swipe up** for longer, **swipe down** for shorter, **tap** for about the
  same, anywhere on the pad;
- or the three large buttons on the pad: **Longer than my crossing**, **About
  the same**, **Shorter than my crossing**;
- on a keyboard, the up and down arrow keys.

With a screen reader running, swipes belong to the screen reader, so use the
buttons. Focus lands on **About the same**, so one flick reaches either of the
other two. The instructor can turn the swipe pad off (buttons only).

Right or wrong is given straight away on every channel: the chime or the low
pulse, the haptic pattern, and with visual feedback on, the green circle or the
orange triangle.

Then the **replay**: the sample and your crossing time start together. You hear
the sample, and your own "this is your time" sound (and flash) where your
crossing time ends. There is no right/wrong cue inside the replay. Nothing
starts by itself: press Play for the next sample.

**How much longer or shorter?** If switched on, this is offered only after a
correct "longer" or "shorter" answer. A full-screen button appears: tap to
start, tap again to end, holding the difference in mind. Then one of two
replays, chosen by the instructor:

- **(a) Combined** (the default): the steady sound for the sample warning
  time, the same as when the sample played; your own sound where your crossing
  time ends, and again at your crossing time plus your estimate (for longer) or
  minus it (for shorter), which is where you thought the warning time ended;
  and the chime or the low pulse where the warning time really ended (chime if
  your estimate was within the margin). Example: crossing 6 s, sample 8.5 s,
  estimate 3.5 s: sound from 0 to 8.5 s, your sound at 6 s and at 9.5 s, low
  pulse at 8.5 s.
- **(b) Like Practice my timing**: the comparison replay, then your sound at
  the start and where your estimate ended, and the chime or the low pulse
  where the true difference ends.

Under **Options**: the sound style, **Sound loudness** (default 100%) and
**Sound pitch** (lowest to high, shared with Comparison preparation) with a
two-second preview, **Start the sample after a random pause**, and the "how
much" switch. Options the instructor has fixed are hidden here.

A note at the top, **"Longer does not mean long enough"**, stays until the
student hides it.

### 4. At the street

The instructions: position yourself as directed by your O&M Specialist, so
you can look or listen for approaching vehicles. Mark whether you are using
**hearing** or **vision**; it is saved with each vehicle.

Press **START**. A full-screen pad opens.

1. **Swipe left or right** the moment you think you detect (see or hear) a
   vehicle, toward the side it comes from. From the left compares with your
   first-half time; from the right, with your full-street time.
2. **Tap** when it passes in front of you. **Swipe down** if it never comes.
3. Then **you judge**: longer, shorter or about the same as your crossing time,
   on the same answer pad as Comparison practice. The app does not give the
   answer first.
4. If switched on, "how much longer or shorter" follows a correct
   longer/shorter answer.

With swipes on (the default) the whole pad below its header is the swipe
area, and there are no buttons. If the instructor sets **Buttons only**, the
pad shows **Vehicle from the left**, **Vehicle from the right**, then **It
passed in front of me** and **It never came** instead. **Back**, top left,
ends the street session; a vehicle in progress is recorded as cancelled.
After a replay, **Play it again** (when the instructor allows it) replays the
last vehicle; it is never recorded.

**VoiceOver (iPhone app):** the pad's swipe area is a Direct Touch area and
the VoiceOver cursor lands on it as the pad opens, so the first swipe or tap
already counts. Turn Direct Touch on for CrossingTime once, from the rotor. Back
is outside the area: touch it, hear "Back", double-tap. VoiceOver's two-finger
scrub does the same as Back. **TalkBack (Android):** swipe with two fingers on
the pad, or double-tap to tap.

**Replay** is set to one of: after every vehicle, only after a wrong answer, or
never (then only the right or wrong sound plays, keeping the street quiet).
Judging can be switched off; the warning time is then recorded without a
verdict.

The app does not use the microphone.

### Progress

Accuracy per activity and a strip showing your recent timing attempts. At the
street, only vehicles you judged count towards the score.

Each activity's box reads as one sentence to a screen reader, for example
"Comparison practice: 56 percent, 9 of 16 correct. How much longer or shorter:
0 of 5 estimates within margin." Cancelled tries are counted apart and never
scored.

**Show my report to send** opens the full report first and puts the cursor at
its start. Nothing is sent automatically, and nothing passes through a server.
Under it, the ways to send:

- **Text to my instructor** opens Messages with the report filled in, and the
  instructor's number when the setup has one.
- **Show to my instructor** puts the report on your screen as a code (one or
  several, in turn) that the instructor scans with their own phone's camera.
  No email, no texting, no account: the report goes straight from your screen
  to their phone.
- **Email to my instructor** appears only when an instructor email is set and
  a mail app can open on this phone. If no mail app opens, the app says so and
  points to the other ways.
- **Send with another app** opens the phone's share menu (WhatsApp, AirDrop,
  Mail, anything).
- **Export for Excel (CSV file)** shares or downloads a spreadsheet file, one
  try per row, with every time in seconds.
- **Copy report** copies the text; **Hide report** closes it.

The report shows the actual times of every try (the sample or warning time,
the crossing time, the difference and the margin, in seconds, with the time of
day), so the instructor can see what was judged. During practice the app
still never shows or says a number of seconds. The report carries the student
code, never a name.

---

## 1e. The session code

Until a session code has been typed once, the app asks for it in a pop-up
at start (after the sound tutorial on a first run). Later closes the pop-up:
Help, Accessibility, Instructor setup, Progress and setup links all work, and
the same field sits in a card at the top of Home; the four practice
activities stay disabled until the code is typed, and a link, a Siri phrase
or an Android shortcut to one of them reopens the pop-up. Since build 19 the
unlock is permanent: it is kept with the app's other settings and their
durable copy, so closing the app or updating it does not ask again. The
check happens on the phone, so it works with no internet. A wrong code says
to ask Azizul Haque or the O&M specialist for the code.

There are three codes, kept in the app only as hashes (`GS_SESSION_CODES` in
`js/app.js`): a tester code that works any time, and one code for each run
of the SOMA 2026 session, which works only during that run on the phone's
own clock (Saturday 5 December: the first run 12:30 to 15:30, the repeat
15:00 to 18:30). A presentation code typed outside its window says it works
only during its session. The codes themselves are not in this repository;
the team has them. After the last presentation the lock is switched off by
setting `GS_SESSION_LOCK_ENABLED` to `false`.

## 2. Instructor setup

Open **Instructor setup** from Home, or from **Settings** (gear icon). Under
**Crossing times**:

| Field | Meaning | How to get it |
|---|---|---|
| **First half of the street, traffic from the left (seconds)** | How long this student takes to clear the first half | Instructor times at least three crossings, uses the longest |
| **Full street, traffic from the right (seconds)** | How long to cross the whole street | Same |
| **Margin of error (seconds)** | How close counts as "on time" | Chosen by the instructor. The app starts at 0.4 s; 0.5 s has historically been taught; there is no research yet on the right value. It must be more than 0 and at most 60 s |

Until both street times are entered, the activities stay locked. The app also
refuses a setup it cannot use and says why: a crossing time over 600 s, a
first-half time that is not shorter than the full-street time, or a missing or
zero margin. The same check applies to setup links.

> **Try it quickly:** first half = `4`, full street = `8`, margin = `0.4`. Or
> press **Try it now with example times** on the Home screen.

### What the student sees and can change

- **Activities the student sees**: any of the four.
- **Practice my timing**: which modes are offered (at least one stays on).
- **Comparison preparation**: the sound (steady until stopped, one beep, or
  student chooses).
- **Comparison practice**: the sample sound, how the student answers (swipe pad
  and buttons, or buttons only), random pause, "how much" (on, off, or student
  chooses), and the replay after "how much" (combined, or like Practice).
- **At the street**: hearing or vision (student marks it, or fixed), judging
  after each vehicle, "how much", and replay (every vehicle, only after a wrong
  answer, never, or student chooses).

"Student chooses" puts a switch on the student's screen. "On" or "off" hides it,
with a short note saying the instructor set it.

### Instructor and student

| Field | Purpose |
|---|---|
| **Instructor mobile number** (optional) | "Text to my instructor" on the report opens Messages addressed to it; travels in the setup link |
| **Instructor email** (optional) | "Email to my instructor" on the report, when a mail app can open; travels in the setup link |
| **Student code** (optional) | Letters and digits, up to 8. Identifies the student in links and reports **without a name**, because those travel by ordinary text or email. Use a code that cannot be linked to the person |

### Instructor code (optional)

A code of digits so the student cannot change the setup. Instructor setup then
asks for it. It locks again whenever you leave the screen. Leave it empty for no
code. It is a guard against accidental changes, not security.

### Swiping with VoiceOver on (iPhone)

The swipe areas in the iPhone app are **direct touch areas**. Turn on Direct
Touch for CrossingTime once (VoiceOver rotor, Direct Touch), and swipes and taps
there work exactly as they do with VoiceOver off: no double tap, no hunting for
a button, and the vehicle is timed from the touch. The buttons remain for
anyone who prefers them. On Android with TalkBack, use the buttons.

### Backing out of an answer screen

Every answer screen has **Back** in its top-left corner, outside the swipe
area (Escape on a keyboard, the system Back on Android, and VoiceOver's
two-finger scrub do the same). Back is the way out of a try that was
interrupted or started by mistake. It is not a way to decline a judgment: a
student who is unsure gives their best judgment. Back goes up one level. On
"longer, shorter or about the same" it cancels the try; on "how much" it keeps
the judgment and cancels the estimate; at the street it returns to the street
pad for the next vehicle, and on the street pad itself it ends the session. A
cancelled try is recorded and shown in the log and the report as "cancelled
(not scored)", so the instructor sees it, but it never counts as right or
wrong and never moves a score or an adaptive margin. (Design: Cindi Lashinsky,
October 2026.)

### Sound at the street

Under **At the street**, **Confirm a swipe or tap at the street with** can be
set to vibration only. Then nothing sounds while the student is listening for
traffic; the short confirmation sound is the default.

### Adaptive margin (experimental)

Off by default; the instructor decides, in Instructor setup. When on, each
activity, skill and street type keeps its own margin (a "lane"). Judging a
sample and tapping out "how much" are two lanes, because they are two skills.
After every block of ten attempts in that lane: accuracy of 80% or better
tightens the margin by eight per cent; below 60% it goes straight back to the
set margin; in between it holds. It never goes easier than the set margin or
tighter than 0.10 s.
**Reset adaptive margins** starts every lane again. The research on the right
pace is not settled, which is why it is marked experimental.

### Sending the setup to a student

Under **Send this setup to the student**, tick what the link carries: crossing
times and margin, instructor email and student code, and the activities and
options chosen above. Then:

If an instructor code is set, the last tick box, **Lock Instructor setup on
the student's phone with my instructor code**, puts that lock on the student's
phone too (the link carries a hash, never the code). The student cannot turn
an activity back on; the instructor unlocks with the same code.

- **Share the setup link** opens the phone's share menu;
- **Text it to the student** opens Messages with the message filled in; add the
  number and send;
- **Show the message text** has the message and a plain practice link to copy.

The student taps the link once. In a browser it applies at once, then offers
**Open in the CrossingTime app**, which hands the same setup to the installed app.
Links made inside the installed app always point at the public web address. The
link carries a version tag and a checksum, so a corrupted or truncated link is
rejected rather than silently applied. Links from earlier versions still work.

Since build 13 the link is short, about 150 characters with no periods inside
it, so a text message does not break it; the activities and options travel as
a short code. A full stop, bracket, space or line break that a messaging app
adds to the link is ignored. The message puts the link alone on its last line.

---

## 3. Practicing

### Choose a mode

| Mode | Waypoints | Use when |
|---|---|---|
| **Start → Halfway** | 2 | Teaching the first-half time |
| **Start → Finish** | 2 | Teaching the whole crossing |
| **Start → Halfway → Finish** | 3 | Full crossing with a midpoint check |

### The tap sequence

The large button is the only control needed while walking.

1. **BEGIN** — tap as you step off the curb. The button changes color, shape,
   and label, and now reads **MARK**.
2. **MARK** — tap at each waypoint as you reach it.
3. After the final tap the button reads **REPLAY** and the feedback plays
   automatically. A line under the button then shows how many of your last
   ten attempts were within the margin.

The button's appearance encodes the current stage four different ways at once —
color, corner shape, border style, and a symbol — so the stage is never
communicated by color alone:

| Stage | Color | Shape | Symbol |
|---|---|---|---|
| Start | Indigo | Square corners | ● |
| Halfway | Orange | Fully rounded | ▲ |
| Finish | Green | Sharp corners | ■ |

Leaving the screen mid-run cancels the run; nothing is recorded and nothing
stays locked.

### Reading the replay

After a short lead-in, the app plays back:

- **Your taps** — your own sound (a short, bright tone) at the moment you
  tapped, the same sound you heard when you tapped.
- **The reference** — at each correct time, either:
  - a **short, bright, high chime** → you were within the margin, or
  - a **longer, low, buzzing pulse** → you were outside it.

The two are deliberately different along three independent dimensions — pitch
register, duration (0.12s vs 0.30s), and texture (pure vs beating/rough) — so
they can never be confused, even through a phone speaker next to traffic.

**What you are listening for is the distance between your tone and the
reference tone.** If they land together, you were on time. The further apart
they sound, the further off you were. That distance is the lesson. The replays
in Comparison preparation use the same vocabulary. In the comparison replays,
your own sound marks where your crossing time ends.

**Said and shown (build 15).** Every replay is announced with the word
"Replay", and the tones wait for it. While it plays, a bar under the button
fills for its length and marks each sound where it played: your own sound,
the sample as a blue span, the chime in green, the pulse in orange. When it is
over the app says what you heard, in words and never in seconds: "That was
your taps, then the crossing time: within the margin." In the comparison
activities the right-or-wrong sound is followed by "Correct." or "Not
correct. It was longer.", and the replay starts only when the words are over.
Both can be turned off under Accessibility > Speech. With VoiceOver or
TalkBack running, the words go through the screen reader instead.

---

## 4. Accessibility options

Open with the person icon, top right.

### Output mode
- **Audio only** (default) — sounds alone.
- **Audio + Visual** — adds the full-screen visual replay.
- **Visual only** — no sound at all, for Deaf or hard-of-hearing users, or noisy
  environments.

### The visual replay
When enabled, the screen goes black during playback and shows:

| Element | Meaning |
|---|---|
| Grey flash (full screen) | Your tap, or where your crossing time ends |
| Blue bar across the middle | The sample warning time, held for its length |
| **Green circle** | Within the margin, or a right answer |
| **Orange triangle** | Outside the margin, or a wrong answer |

Circle vs triangle is a *shape* difference, not just a color one, so it works for
color-blind users. Triangle orientation (up/down) and the grey flash's brightness
are both adjustable under **Settings → Visual calibration**.

**Play a test sound** plays a steady tone and a chime, and says whether the
sound engine is running.

### Touch feedback
**Vibrate on cue** (on by default) plus a **Test haptic pulse** button. See
[`HAPTICS.md`](HAPTICS.md) — this behaves very differently on the native iOS app
than in a browser, and the note under the button always states which is active.

### Vision preferences
- **Theme** — System / Light / Dark / Inverted (yellow on black, for some
  low-vision conditions).
- **Text size** — up to **300%**, at which point the layout reflows to single
  columns so nothing is clipped. On the answer screens the question and the
  instructions are shown at your size, limited only by the height of the
  screen so the pad never scrolls; with buttons only, the buttons fit one
  screen.
- **High contrast** — all gradients flattened. With the Light theme it is black
  on white; with Dark or Inverted it stays white (or yellow) on black.
- **Pinch zoom** works in the web app and, since build 13, in the iPhone and
  Android apps too. Double-tap zoom is off so a fast tap never zooms.
- **Focus boost** — thicker focus outlines for keyboard and switch users.

### Speech
**Speak directions aloud** (self-voicing) makes the app read its own
directions and results, for students still learning VoiceOver or TalkBack. A
**Speaking rate** sets slower, normal or faster. Speech always stops while a
sound is being timed. On iPhone and Android the app speaks through the
system's own voice (the Android app only since build 15; before that the
Android web view had no speech engine and said nothing).

**Say "Replay" before each replay** and **Describe the sounds in words** (both
on by default, build 15) work for everyone, with or without self-voicing: the
word before every replay, and the result and the replay in words afterwards,
never a number of seconds. The native apps ask the system whether VoiceOver or
TalkBack is running and, if so, hand the same words to the screen reader.

### Screen reader
**Announce cues** controls spoken feedback. Prompts and results are spoken
straight away; announcements are **paused only while a replay plays**, so
VoiceOver does not talk over the timing tones. This is intentional: the tones
are the content. The word "Replay" before the tones and the description after
them are the two exceptions, and both are placed so they never overlap a tone.

### Siri and shortcuts
On iPhone, say "Practice my timing in CrossingTime", "Comparison preparation in
CrossingTime", "Comparison practice in CrossingTime" or "At the street in CrossingTime".
They work with no setup and appear in the Shortcuts app. On Android, touch and
hold the app icon. The **Siri and shortcuts** screen explains both.

---

## 5. Training examples

**Settings → Training examples** plays a *correct* crossing at the configured
times, with no marking required. This lets a student hear the target rhythm
before attempting it. There is one per mode.

---

## 6. Where the settings live

Everything persists on the device in `localStorage` under `om-*` keys, with a
durable copy in the phone's native storage (`store.js`, build 14). Both are
included in the phone's own backup (iCloud Backup, Android Backup) when it is
on. There is no app account and no server. Clearing browser data resets the web
version; deleting the app removes its data from the phone.

**Delete all my practice history** (Progress, My data; build 15, tracker 14.2
and 14.4) opens a confirmation dialog first: Cancel comes before Delete
history, the heading is focused for VoiceOver, and the text says where the
history is deleted from (this phone now, the phone's backup at its next
backup; the browser on the web). Only Delete history deletes, and only the
history: settings, crossing times and instructor setup stay. The emptied
history is written to the durable copy at once (`gsStore.clearHistoryNow`),
so it cannot be restored on the next start.

---

## 7. Tuning the sounds

The sound design is data-driven and documented inline for non-programmers. In
`ios-app/www/js/engine.js`, search for:

- **`const TEST_TUNING`** — lead-in delays, end padding, and the four volume
  controls.
- **`const SOUND_PRESET_LIBRARY`** — the named tone families (duration plus the
  frequency/gain layers that shape timbre), including the two-blip
  `reference_tick` used as the start signal.

The sample warning time's pitch steps, partials and steady envelope live in
`ios-app/www/js/comparison.js` (`GS_SAMPLE_PITCHES`, `gsSamplePartials`,
`gsPlaySample`).

**One rule when editing:** keep the sum of a preset's partial gains at or below
about **0.80**. Above that you are only feeding the master limiter — the output
gets squashed, not louder. Values above `1` in `TEST_TUNING` do the same thing.

---

## 8. Architecture, briefly

- **No build step, no framework.** `ios-app/www/index.html` is the markup,
  `css/app.css` the styles, and six plain scripts share one global scope:
  `js/engine.js` (practice, replay, audio, haptics, speech, setup link,
  settings), `js/history.js` (attempt log, adaptive margin, report),
  `js/features.js` (Instructor setup choices), `js/comparison.js` (Comparison
  practice and At the street), `js/signal.js` (Comparison preparation), and
  `js/app.js` (screens, Home, Progress, sending, Siri page, demo mode).
- **Native shell** (Capacitor). On iOS, `GapSenseNative.swift` adds a haptics
  plugin with one long-lived Core Haptics engine, the Siri App Shortcuts, and
  `gapsense://` link handling. Android declares the same link scheme and four
  launcher shortcuts, and (build 15) `GSAndroidPlugin` gives the window the
  page's background colour, so the edge-to-edge strips above and below the
  page on Android 15 and 16 match the theme. The iPhone app ships a privacy
  manifest (`PrivacyInfo.xcprivacy`: no tracking, no data collected, the
  UserDefaults and file-timestamp APIs declared).
- **Audio** is synthesized on demand. In the iPhone app the native player
  (`GapSenseAudio.swift`) plays it, so the silent switch cannot mute it. In
  the browser and on Android it is the Web Audio API, scheduled on the
  `AudioContext` clock, which does not drift the way `setTimeout` does. The
  context is created at load and warmed on the first touch so the first tone is
  on time. Either way every cue passes through a soft clipper that makes it
  louder without crackling.
- **A master limiter** (`DynamicsCompressorNode`) sits between every tone and the
  output, so a user marker and a feedback cue landing at the same instant — which
  is exactly what happens when the student is *accurate* — cannot clip.
- **The visual replay** runs a `requestAnimationFrame` loop that reads the same
  `AudioContext` clock, keeping picture locked to sound.
- **Classification** (within margin vs outside) happens in one function,
  `classifyMark()`, which feeds audio, visuals, cues, haptics and the attempt
  log from a single decision, so they can never disagree.
- **Every activity can be cancelled.** Changing screen calls each module's
  cancel routine, which clears its timers and haptics, un-suppresses speech,
  unlocks Settings and closes any open gesture pad.
- **Browser tests** live in `ios-app/tests/` and run with `npm test` (Playwright
  in the installed Google Chrome).

**Known architectural caveat:** audio is on the AudioContext clock, but UI stage
changes and haptics still use `setTimeout`. Close enough in practice; on a heavily
loaded device the visuals and haptics can drift slightly from the sound. Driving
everything from the replay timeline is the proper fix and is a larger refactor.
