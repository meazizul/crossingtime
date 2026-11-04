# Changelog — CrossingTime (Gap Sense until build 15)

What changed, why, and when. Newest first.

The original project was not under version control (it arrived as a ZIP export),
so dates before this file existed were reconstructed from file timestamps rather
than commit history. They are accurate to the day.

---

## 2026-11-04 (build 22) — Cindi's decisions on tracker items 20.5 and 20.13

From Cindi Lashinsky's email of 4 November 2026, 7:57 AM.

- **Accessibility settings follow the student (20.5).** With several students
  on one phone, choosing a student brings back that student's accessibility
  settings (feedback mode, vibration, voice, verbosity, text size and the
  rest), as Cindi asked: some students want help setting them, others not. A
  new student starts with the settings in use when they are added, so the
  screen does not change under the instructor. Students saved by builds 20
  and 21 are given the phone's current settings once, so nobody loses theirs.
  The instructor code, number and email stay with the phone.
- **Traffic that drives on the left (20.13).** A new Instructor setup option,
  "Vehicles drive on the": right side of the road (the default, as before) or
  left side. On the left, a vehicle from the right is compared with the first
  half of the street and one from the left with the full street, in At the
  street; the labels in Instructor setup, both comparison activities and Help
  say the right side. It travels in the setup link (added at the end of the
  link's option code, so older links still read the same). No setting for
  one-way streets (Cindi).

---

## 2026-11-04 (build 21) — the build 20 review in Cindi's bug tracker

From the review of build 20 that Cindi Lashinsky shared on 4 November 2026
(tracker items 20.1 to 20.17).

- **Several students (20.1, 20.3, 20.4, 20.15).** Adding, switching and
  removing a student either happens completely or not at all: if the phone's
  storage for the app is full, nothing changes and the instructor is told.
  Delete history and Remove student name the student and say where the data
  goes, the phone's backup included. The Student code field refuses another
  student's code, and a setup link goes to the student it was made for
  (switching to them, or adding them). Remove student's "Export the report
  first" waits for the export and says what really happened.
- **Low verbosity (20.2).** With "Announce results and describe the sounds"
  off, the result is still shown and read in its short form ("Correct.", "Not
  correct.", "Within the margin."), as Settings and this guide said; only the
  description of the sounds is left out.
- **The touch counts, not the lift (20.9).** The Begin and Mark button, the
  Comparison preparation stop, How much and the street buttons are timed from
  the moment the finger comes down, as the swipe areas already were. A
  screen reader's double-tap and the keyboard are timed when they act.
- **Practice replay timing (20.10).** The try is saved after the whole replay
  is scheduled, so a long history no longer makes the crossing-time sound late.
- **Interruptions (20.11).** Siri, a call banner, an alarm, or headphones or
  hearing aids connecting during a sample or Comparison preparation's timing
  cancel the try, unrecorded, with a message, as hiding the app does.
- **Screen awake (20.12).** The screen stays on from the start of a try until
  its replay ends, in all four activities, so a long crossing time no longer
  runs into the auto-lock.
- **CSV (20.14, 20.6).** Dates as 2026-11-04 and times on a 24-hour clock on
  every phone. The file is named `crossingtime-report-…csv`.
- **Delete history (20.8)** resets the adaptive margins but leaves the
  instructor's adaptive switch on, and the checkbox shows it.
- **Shortcuts and links (20.16)** to an activity get the same setup check as
  Home's buttons; with no usable crossing times they go to Home.
- **Web version offline copy (20.17).** A new version is installed only when
  every file downloaded; otherwise the previous copy stays. Only pages fall
  back to the home page. On a weak signal the saved copy is used after 3
  seconds.
- **Session code (20.7).** The short 32-bit fallback check is gone; the code is
  checked with SHA-256 only.
- **README (20.6).** The origin sentence says the app was called Gap Sense
  from August to October 2026; the install section no longer names a build.
  The unused QR code package is removed.

## 2026-11-03 — the web address is crossingtime.app

- The landing page and the web app moved to https://crossingtime.app (the
  domain Cindi Lashinsky bought for the project). The old address,
  azizulhaque.me/crossingtime, forwards to it, so links already shared keep
  working. Links the app makes (the setup link, the practice link) use the
  new address in the web app now and in the phone apps from their next build.

## 2026-11-03 (build 20) — verbosity levels, several students on one phone, no QR codes

All from Cindi Lashinsky's notes of 1 November 2026.

- **How much the app says (verbosity).** Accessibility, Speech, has High,
  Medium and Low, as screen readers do. Medium is what builds 15 to 19 did and
  stays the default. High also says what is on each screen when it opens (its
  sections and buttons, read from the screen itself). Low says only the basics:
  a screen's name, no "Replay" before replays and no words after the sounds;
  the result still shows and is read in its short form. "Say Replay before
  each replay" and "Announce results and describe the sounds" are switches of
  their own under it: a level sets both, and each can then be changed alone.
  The levels apply to the app's own voice and to VoiceOver or TalkBack.
- **No separate visual replay switch.** The on-screen replay follows the
  feedback mode (Audio + Visual or Visual only), as it already did when the
  mode changed; an old "off" from an earlier build no longer hides it.
- **Several students on one phone.** Instructor setup starts with Students on
  this phone. Add a student takes a code (never a name) and the date started
  (today on the phone's clock, editable); the practice already on the phone
  stays with the first student. Choosing a student starts the app again with
  that student's crossing times, settings and history; Home names the student
  and the report gives the code and the date started. Remove student offers to
  export the report first and asks to confirm. Accessibility settings and the
  instructor's own details stay with the phone. Each student is in the durable
  copy and the phone's backup.
- **No QR codes.** "Show to my instructor" is gone, with its library: a long
  report needed many codes and nothing joined them again. Text, email, the
  share menu and the CSV file stay.
- **Privacy policy:** no longer calls the app a research tool; says that with
  backup off or iCloud and Google not available nothing changes in the app;
  covers several students; no QR code. The backup itself was already the
  phone's own iCloud or Google backup.

## 2026-11-02 (build 19) — the session code is entered once; one code per presentation

- **Entered once, then the phone stays unlocked.** Build 18 asked on every
  start; the team (Cindi Lashinsky, 1 November) asked for a permanent unlock
  instead. Until a code has been typed the pop-up still opens at start, and
  Later still leaves Help, Accessibility and Instructor setup open. The
  unlock is kept with the app's other settings and their durable copy, so
  closing the app or updating it does not ask again.
- **New codes, one per presentation.** The earlier code is retired; every
  phone, including ones that had already typed it, enters a new code once.
  There is a tester code for the team and invited O&M testers, and one code
  for each run of the SOMA 2026 session. A presentation code works only
  during its own run, read from the phone's clock, so a code passed on after
  the session no longer opens the activities; outside its time it says it
  works only during its session. The codes are kept in the app only as
  hashes, and they are not in this repository: the tests read them from a
  private file and skip without it.
- After the last presentation the lock can be switched off with one setting
  (`GS_SESSION_LOCK_ENABLED`).

## 2026-10-30 (build 18) — the code on every start, a pop-up, no double-tap zoom, Google Play first

- **The session code is asked on every start of the app**, for everyone,
  including installs updated from earlier builds (the team's request after
  build 17). A pop-up opens at start (after the sound tutorial on a first
  run) with the field focused for VoiceOver and TalkBack; **Later** closes
  it and Home, Help, Accessibility and Instructor setup work as before, with
  the same field in a card on Home. The unlock lasts until the app is
  closed; switching apps keeps it. A wrong code now says: "That code did
  not match. Ask Azizul Haque or your O&M specialist for the session code."
  The permanent flag from builds 16 and 17 no longer counts and is cleared.
- **No double-tap zoom anywhere.** `touch-action` is not inherited, so a
  double tap on plain text still zoomed the native apps; every element now
  opts out, and the swipe pads keep their own setting. Pinch zoom stays.
- **Google Play first.** The landing page's Android button opens the Google
  Play test (Play Store install, no "unknown sources" step) for accounts on
  the tester list, with the direct download kept as the fallback. The
  install guide says the same.

## 2026-10-30 (build 17) — CrossingTime, the session code, one permanent link

**The app is CrossingTime** (team decision, 28 October 2026). The name
Gap Sense, used from August to October 2026, had the problem that "gap" means
the time between vehicles, which is not what the app measures. The display
name, the Home header, Help, Siri phrases, the store listings, the web
address and every guide now say CrossingTime. The bundle identifier, the
Android package and the `gapsense://` link scheme are unchanged, so updating
keeps every setting and every record. Siri still accepts "Gap Sense" as an
alternative name. The public repository is now `meazizul/crossingtime` and
the web app is served from <https://azizulhaque.me/crossingtime/app/>.

**The session code (SOMA/SWOMA 2026)**

- A fresh install shows a Session code card on Home. Help, Accessibility,
  Instructor setup, Progress and the setup links all work; the four practice
  activities stay disabled until the code is entered, and a link, a Siri
  phrase or an Android shortcut to an activity lands on the card instead.
  The code is checked on the phone (nothing is sent anywhere), kept in the
  app as a hash, and once entered the phone stays unlocked; the flag is part
  of the durable copy like every other setting.
- Installs that already had crossing times or practice history before this
  build are unlocked on their first start, so people already testing are not
  shut out.
- The field is one large numeric box with its own label, so VoiceOver and
  TalkBack users can find and type it; wrong codes are announced.

**One link for participants**

- <https://azizulhaque.me/crossingtime/> is a plain page with one button each
  for iPhone, Android and the browser, two steps under each, and the note
  about the session code. The page stays at that address; what is behind the
  buttons is kept current. The Android button always downloads the newest
  release (`CrossingTime-android.apk`).

## 2026-10-28 (build 15, part 2; built and tested, not yet released) — the replay said and shown, the result in words, the margin in words

Jonggi Hong tested build 14 on an Android phone without TalkBack (25 October
2026) and heard nothing at the start of a replay, saw the replay only as the
button's label, and asked for the sounds to be explained in words as they
happen. This part of build 15 answers all of that, for everyone, in every
activity.

**"Replay" is said before every replay**

- Practice my timing, Comparison preparation, Comparison practice and At the
  street all say the word "Replay" first, and the tones wait one second for
  it. Until now the word went only to the screen-reader live region, and the
  app's own speech stayed blocked until the replay was over, so without
  VoiceOver or TalkBack there was nothing to hear. With a screen reader
  running the live region still gets it, in the student's own voice.

**The result and the replay in words, never a number**

- After the right-or-wrong sound the app says "Correct." or "Not correct. It
  was longer." (or shorter, or about the same). After each replay it says
  what the sounds were: "That was your taps, then the crossing time: within
  the margin." in Practice my timing; "That was the sample, your stop, and
  your crossing time: outside the margin." in Comparison preparation; "That
  was the sample warning time, then your own sound where your crossing time
  ends." in Comparison practice and At the street; and for "how much", where
  the student thought the sample ended and where it really ended, with the
  verdict. Never a number of seconds (Cindi's rule).
- Words were taken out of Comparison practice in October (tracker 12.29)
  because they repeated the cue and the replay cut them off. The replay now
  waits for the words to end, so nothing is cut off, and the prompt that
  follows ("Press Play for another.") is part of the same utterance.
- Two new switches under Accessibility > Speech, both on: "Say "Replay"
  before each replay" and "Describe the sounds in words". With VoiceOver or
  TalkBack on, both go through the screen reader instead of the app's own
  voice; the iPhone and Android apps ask the system (`accessibilityStatus`
  in both native plugins).

**The Android app can speak at all now**

- Android's web view has no web speech engine, so nothing the Android app
  "said" since build 1, from "Get ready" to Speak directions aloud, was ever
  heard; the app silently fell back each time. The Android plugin now speaks
  through Android's own text-to-speech (`speak`, `stopSpeaking`,
  `speechStatus`), the same way the iPhone app has since build 9, so "Get
  ready", the replay word, the descriptions and self-voicing all work on
  Android. Checked on the Android 16 emulator: engine ready, "Replay" then
  the description spoken on a practice try, the verdict spoken before the
  comparison replay, silence with the switches off, no crashes.

**The replay on screen**

- A replay bar under the main button, and in the street pad, fills for the
  length of every replay; each sound leaves a mark where it played: the
  student's own sound, the sample as a blue span, the chime in green or the
  pulse in orange. It shows in every output mode; the full-screen flashes
  remain the option they were. The time in seconds appears on the bar only
  with "Show user times" on. Screen readers skip the bar; they get the words.
  So marking stays on the button and the replay has its own place, as
  Jonggi asked, without changing how a try is made.

**The margin in words on the practice screens (tracker F2)**

- The score line under each main button no longer shows "margin 0.40s" while
  the student practises; it reads "Last 5: 4 within margin", with "adaptive
  margin" when that is on. The number of seconds returns with "Show user
  times" on, for the instructor. Cindi's question on F2 was whether that
  number should be there at all during practice; now it is not.

**Tests**

- Playwright: new `build15-replay-words.spec.mjs` (10 tests: the switches,
  the word before the tones, the words after each replay in all four
  activities, the replay waiting for the words, the screen-reader path, the
  bar, the margin words); seven older tests updated to the new words and
  timings, and the 12.29 test rewritten for the revised rule. The simulator
  self-test gains eight checks.

## 2026-10-27 (build 15, part 1; built and tested, not yet released) — the delete warning, the durable copy after a delete, where the data really is, the privacy manifest, Android 16

The first part of build 15 takes the items from Cindi Lashinsky's tracker
that needed no team decision. The rest of build 15 (her feature requests and
the replay changes from the team) waits for the 28 October meeting.

**Delete all my practice history asks first (tracker 14.2)**

- One tap, or one VoiceOver double-tap, no longer deletes anything. It opens
  a warning dialog built like the app's other dialogs: the heading "Delete all
  your practice history?" is focused and read first, Cancel comes before
  Delete history, and Delete history is marked by colour and by its word.
  Escape, the Android Back button and closing the dialog delete nothing, and
  focus returns to the button.
- The text says exactly where the history goes from: on a phone, "this phone
  now, and your phone's backup at its next backup"; on the web, "this
  browser". It also says what stays (settings, crossing times, instructor
  setup) and suggests sending or exporting a report first.
- After the delete, the message names the same places. Design: Cindi, 24
  October 2026.

**Deleted history cannot come back (tracker 14.4)**

- Build 14's durable copy was rewritten 400 ms after a change, and never by
  an empty app, so a delete with no crossing times saved, or a delete followed
  by closing the app at once, left the old history in the copy and the next
  start restored it. The delete now tells the copy it is intentional and
  writes the emptied history at once (`gsStore.clearHistoryNow`). Settings,
  crossing times and instructor setup stay in the copy.

**Where the data really is (tracker 14.1)**

- The privacy policy, the Progress screen and the guides said the data stays
  only on the phone. The phone's own backup (iCloud Backup, Backup by Google
  One) already includes it, as it does for every app. The text now says the
  app collects no data, and describes where the data is kept: on the phone,
  in the phone's own backup if it is on, and only in the browser on the web.
  The policy gains a "Deleting your data" section that says what Delete
  removes at once and what goes at the phone's next backup. Wording: Cindi
  and her reviewer, 24 October 2026. The opening paragraph of the policy
  (how the app describes itself) is unchanged, pending the team's decision.

**iPhone privacy manifest (tracker 14.3)**

- `PrivacyInfo.xcprivacy` is added to the App target: no tracking, no
  tracking domains, no collected data, and the two required-reason APIs the
  app and its plugins touch, UserDefaults (CA92.1; the app's own settings and
  the Preferences plugin) and file timestamps (C617.1; the Filesystem plugin
  reads a file's dates). None of the Capacitor pods in use ships its own
  manifest, so the app's manifest covers them. Verified in the built bundle.

**Android 16 (tracker 14.5)**

- The Android app targets and compiles against Android 16 (API 36), which
  Google Play now requires; the Android Gradle plugin moves from 8.7.2 to
  8.9.1. Capacitor's edge-to-edge margin adjustment is set to `auto` so the
  header is not drawn under the status bar on Android 15 and 16.
- The strips above and below the page that this leaves show the window
  background, white by default, so on the dark theme the strip above the
  header stayed white and the light status bar icons on it could not be
  seen. A small Android plugin (`GSAndroidPlugin.setWindowBackground`) now
  gives the window the page's own background colour whenever the theme is
  applied, and the window starts in the system's light or dark colour.
  Checked on an Android 16 emulator in every combination of system and app
  theme (see the test notes).

**Housekeeping**

- Version 15 everywhere (web About line, Android versionCode, iOS build
  number); the offline cache name moves to v16 so browsers pick up the new
  files.
- Tests: `tests/build15-delete-privacy.spec.mjs` (six tests for 14.1, 14.2
  and 14.4); the three older delete tests now confirm the warning; the
  simulator self-test gains eight delete checks. Playwright 212/212.

---

## 2026-10-22 (build 14, built and tested; not yet released) — Cindi's VoiceOver tests of builds 12 and 13, and her feature requests

Cindi Lashinsky tested builds 12 and 13 on her iPhone with VoiceOver and kept a
tracker of what she found (numbered by the build the bug was found in). Build
14 answers every open item in it: 21 bugs and 5 feature requests, plus the
GitHub issue below. The design decisions in this entry are hers unless noted;
two open points were decided by Azizul Haque on 22 October (what Back does
mid-vehicle; the student's sound).

**Answer screens (12.27, 12.28, 12.31, 13.2, 13.3, 13.6, 13.7)**

- **Back, top left on every pad, replaces Skip and Done.** It is outside the
  swipe area, goes up one level and records the cancelled part as cancelled,
  never scored: the try on the answer screen; only the estimate on How much;
  at the street, back to the street pad; on the street pad, the end of the
  session (a vehicle in progress is recorded as cancelled). Escape, Android's
  Back and VoiceOver's two-finger scrub do the same. The way out is for a try
  that was interrupted or started by mistake; a student who is unsure gives
  their best judgment. "Skipped" reads "cancelled" everywhere, old records
  included.
- **The whole pad is the swipe area.** With swipes on (the default) there are
  no answer buttons; the question and the instructions are shown in the area
  at the student's text size, up to the height of the screen. The instructor
  can set buttons only, on every pad.
- **iPhone with VoiceOver:** the cursor is moved onto the Direct Touch area as
  a pad opens, so VoiceOver reads the area's label first and the first tap or
  swipe already counts (the first How much tap used to be lost). The area is
  taken out of the view tree when a pad closes, so no invisible area stays
  over the next screen. VoiceOver is told of every change.
- **Focus never drops to Back in the header.** The main buttons are busy
  (aria-disabled), never disabled, while a try plays, and a pad hands focus on
  before it hides. After every try the cursor is where it was.
- **TalkBack (Android):** the swipe area is a labelled element; a two-finger
  swipe passes through as a swipe and a double-tap is a tap. A gesture log
  under Settings, Debug shows what arrived, for checks on real phones (13.4).

**Replays and sounds (12.29, 12.34, 12.35, GitHub issue 11)**

- Each of the three comparison pages explains its replay up front; after an
  answer nothing is said or shown except the right or wrong cue and the
  replay, then only what to do next.
- The student's own sound is a bright tone at 1047 Hz, above every sample
  pitch and the chimes, and the steady sound dips to 30% under any short cue,
  in the web mix and in the iPhone's mixer, so the two never merge.
- The student's taps (Practice my timing, How much) play the student's sound,
  the same sound that replays them. The chime is the student's choice in
  Settings.
- The Combined replay after How much plays the steady sound for the warning
  time, with the student's sound at the crossing time and at the estimate
  (issue 11; placement proposed to Cindi on the issue).

**Pages (12.32, 12.33, 12.41, 13.5, F6)**

- Headings and named sections on the activity pages; the Options arrow is
  drawn, not a character. Comparison practice's Play is the same big button
  as Practice my timing, on screen when the page opens.
- Progress: one heading per activity that reads as one sentence.
- First half is listed first and selected by default on both comparison
  screens.
- The statement that a student is "never made to guess" is removed from the
  code and the guides; it was never the design (13.5).

**Reports and sending (12.36, 12.37, 12.38, 12.39, F2, F3, F4)**

- One try, one record: the How much estimate is stored with its judgment and
  reported on the same line; two-record tries from builds 10 to 13 are paired
  on reading. Scores are unchanged.
- Every report line gives the times in seconds with the time of day; a header
  gives the crossing times and margin.
- Show my report to send opens the report with the cursor at its start and
  hides itself. Text to my instructor opens Messages with the report and the
  instructor's number from the setup; Show to my instructor renders the
  report as QR codes to scan; Email appears only when a mail app can open;
  Export for Excel gives a CSV file; the share menu stays.
- Instructor mobile number in Instructor setup and the setup link.

**Durability and haptics (12.40, 12.30)**

- A durable copy of settings and history: the phone's native preferences and
  a file in the apps, IndexedDB with persistent storage on the web; restored
  when the web view's storage is lost. History cap 5000 with warnings; a
  failed save is reported. Help, About shows where the copy is.
- The Core Haptics engine is kept running and rebuilt when stopped, with the
  UIKit fallback at once; counts of cues played, fallen back and failed are
  reported with the sound status for phone checks. Whether this cures the
  missing vibration during tries needs a real iPhone.

**Play it again (F1)**

- After a replay in the three comparison activities the student can hear it
  again, as often as they like; an instructor option (on, off, student
  chooses), never recorded or scored.

Tests: 205 browser tests (tests/build14-*.spec.mjs are new), the simulator
self-test, and the Android emulator. Needs a real phone: the VoiceOver cursor
behaviour, vibration during tries, the sound mix by ear, TalkBack.

## Earlier in build 14 — The "how much" Combined replay plays the warning time (GitHub issue 11)

Cindi Lashinsky reported (GitHub issue 11) that in build 13 the Combined replay
after a "how much longer or shorter" estimate played the steady sound for the
student's crossing time. The student had just heard that same sound play for
the warning time as the sample, so the one sound changed meaning within a
single trial. The rule is that the steady sound always stands for the warning
time: in the sample, in the longer/shorter replay, and now in this replay too.

- **The steady sound is the sample warning time** in the Combined replay, in
  Comparison practice and At the street (which share the replay). The
  student's own sound lands where their crossing time ends, as in the
  longer/shorter replay, and again at the crossing time plus or minus their
  estimate, which is where they thought the warning time ended. The chime or
  low pulse stays where the warning time really ended. Example: crossing 6 s,
  sample 8.5 s, estimate 3.5 s: sound 0 to 8.5 s, student's sound at 6 s and
  9.5 s, low pulse at 8.5 s.
- The status line, the Instructor setup note and the guides describe the new
  order. Tests: `tests/issue11-how-much-replay.spec.mjs` (fails on build 13).

## 2026-10-18 (build 13: iOS, Android, web) — The 26 bugs from the 17 October review (bugs 14 to 39)

A second review of build 12, from Cindi Lashinsky's side and done in browser
emulation rather than on a phone, found 26 more bugs. Every one
was confirmed in the build 12 code before it was fixed here. The acceptance
tests from that review are now part of the test suite (`tests/oct17-review.spec.mjs`
and the two regression files beside it), so each fix has a test that failed on
build 12 and passes now.

- **Pads fit the screen at every text size and in landscape (bug 24, 25).**
  At 200 to 300 percent text, and in landscape at normal text, the answer
  buttons and Skip were below the bottom of the screen and the pad could not
  scroll. The pads now cap their text at about twice the normal size, the
  arrows go at large text, and in landscape the swipe area sits beside the
  controls. Skip keeps its word on one line. Checked across 75 phone-size,
  text-size and phase combinations: every control reachable (was 61 of 75
  unreachable).
- **Shorter setup link (bug 14).** The texted link was about 650 characters
  with periods inside, and Messages could break it. The new link (format 4)
  is about 150 characters with no periods; the features travel as a short
  code. The app also ignores a full stop, bracket, space or line break added
  by a messaging app, and refuses a damaged link rather than half applying
  it. Links from builds 9 to 12 still open. The message text puts the link
  alone on its last line.
- **Every way out stops the sound (bug 31).** Changing the crossing during a
  replay, pressing Done at the street, Ready in Comparison preparation, or
  hiding the app during a Practice replay now silences scheduled sounds, as
  Back already did.
- **Latency is subtracted only when the cue is a sound (bug 29).** With
  visual-only feedback nothing is subtracted; the channel is saved with each
  attempt. **Headphone delay is re-read on every Ready (bug 19)**, and the
  iPhone app also re-reads it when the audio route changes.
- **Replay B keeps both halves on screen (bug 30).** The second visual
  replay joins the first timeline instead of erasing it.
- **Only the top pad can be reached (bug 28).** With the answer pad over the
  street pad, the street pad is inert and hidden from screen readers; focus
  returns to it when the answer pad closes.
- **Progress and days practiced count every record (bugs 15, 23).** Skipped
  answers, skipped estimates and unjudged vehicles show as "N skipped" and
  "N not scored"; "Nothing recorded yet" appears only when the log is empty.
  Skipped estimates are counted apart from skipped answers.
- **Honest messages (bugs 16, 17, 21, 36).** Hidden during "how much" or a
  replay, the app says the answer was saved. The Skip buttons say "Noted as
  skipped, not scored." Sharing with the lock ticked but no instructor code
  says the link locks nothing. A failed copy says "Could not copy" and shows
  the text to select, instead of claiming success.
- **One check for the setup (bugs 32, 33).** A margin of 0 or an empty
  margin, a crossing time over 600 s, or a first-half time not shorter than
  the full-street time is refused with a reason, on the form, on Home, and
  in setup links alike. Nothing is silently replaced with 0.4 s.
- **Arrival vibrates once (bug 18)**, like the detection swipe.
- **Android Back (bug 20).** The Back button and gesture now close a dialog,
  skip an open pad, leave the street pad, go Home, and from Home put the app
  in the background. Before, Back did nothing.
- **Stay-awake request answered late (bug 22).** A screen lock granted after
  the pad closed is released at once (web and Android).
- **High contrast keeps a dark theme dark (bug 26).** Dark or Inverted with
  High contrast is white or yellow on black, and the iPhone status bar text
  stays readable. **Input borders at 3:1 (bug 34)** on every theme. **Forced
  colors (bug 27)** no longer blank the visual replay on Windows.
- **Deleting history clears the report preview (bug 35)**, so a deleted
  attempt can no longer be sent.
- **Pinch zoom is on in the phone apps (bug 37).** Double-tap zoom stays off
  through the stylesheet. The Direct Touch area follows the zoom and the
  screen position.
- **The Direct Touch area follows the street pad (bug 38)** when its text
  changes after a vehicle is detected, and on rotation or scrolling.
- **Halfway-and-finish shows a score for both marks (bug 39).**

## 2026-10-16 (build 12: iOS, Android, web) — Swipes work the same with VoiceOver on (iPhone)

Cindi Lashinsky's design: swipes and taps must work the same whether a screen
reader is on or off. At a curb, one-handed, with a cane or a dog, hunting for
a button is not workable. A web page cannot receive raw swipes under
VoiceOver, so until now screen reader users had buttons instead.

- **A native direct-touch area.** Whenever a pad is open, the iPhone app lays
  a transparent native view marked for direct interaction over the pad's
  gesture surface: the street surface, the answer surface, and the "how much"
  button. With VoiceOver on, touches inside it reach the app unchanged. A
  swipe left is a vehicle from the left, a tap is "it passed", swipe up is
  "longer", and so on, the same as without VoiceOver. The native side
  measures how long the finger was down, so the vehicle is still timed from
  the touch, not the lift.
- **One-time setup.** VoiceOver users turn on Direct Touch for CrossingTime once
  (VoiceOver rotor, Direct Touch). Help says so. The buttons are still there.
- Android with TalkBack is unchanged: the gesture route there is still
  unresolved.
- No change on the web, which has no screen-reader-safe swipe path.

## 2026-10-16 (build 11: iOS, Android, web) — A skipped answer is recorded as skipped

Cindi Lashinsky's rule: every answer screen has a way out, and leaving is
recorded. Build 10 added Skip but recorded nothing. Build 11 records the skip.

- **Skip is noted, never scored.** A skipped longer/shorter/same answer, or a
  skipped "how much" estimate, goes into the log marked skipped. It appears in
  the report's recent list ("skipped the answer (not scored)", with the
  warning time at the street) and as a count per activity ("At the street: 2
  skipped"), and on the Progress cards. It is left out of every score, the
  last-ten windows, the street tally and the adaptive lanes.
- Skipping "how much" keeps the judgment already given, as before.

## 2026-10-16 (build 10: iOS, Android, web) — Scoring, timing and street fixes from Cindi Lashinsky's review of build 9

Cindi Lashinsky reviewed build 9 in detail: how the app records and scores
practice, and eleven bugs found by running it. Build 10 fixes all of them
that are code. The first group is about scoring and reporting; the second is
about timing, sound and the street.

**Timing, sound and the street**

- **The warning time starts when the finger touches the screen**, not when
  it lifts at the end of the swipe. A 0.3 s swipe used to make the warning
  time 0.3 s shorter, so a right answer near the margin could be marked
  wrong. The arrival tap is measured the same way.
- **Headphone delay is taken off the measured time** in Comparison
  preparation instead of widening the margin on both sides. With Bluetooth
  (about 0.2 s), a student who stopped 0.6 s early was told "within the
  margin"; now the screen, the record and the replay all agree.
- **Back silences the sound.** Leaving a screen during a replay used to let
  its sounds play on into the next screen for up to the length of the replay.
  Every scheduled sound and the steady sample stop at once, in the iPhone
  app's player too.
- **The screen stays awake while a pad is open.** At the street a student may
  wait minutes for a vehicle; the phone no longer locks in that time. If the
  app is hidden anyway (a call, another app), the vehicle or sample being
  timed is dropped unrecorded rather than timed on in the background.
- **Skip on the answer pads.** "Was it longer, shorter or about the same?" and
  "How much?" have a Skip button, and Escape does the same. (Corrected 22 Oct
  2026: this entry used to say a student is "never made to guess" and that
  nothing is recorded. Neither was the design: the way out is for an
  interrupted try, a student who is unsure gives their best judgment, and a
  skipped try is recorded and never scored, as build 11 itself did. In build
  14 Skip became Back; see the build 14 entry.)
- **Quiet confirmation at the street.** The instructor can set swipe and tap
  confirmation to vibration only, so nothing sounds while the student is
  listening for traffic. The default keeps the short sound.
- **A setup link can lock the student's Instructor setup.** When the
  instructor has set a code, the link carries it (as a hash, never the code)
  and the student's phone asks for it before any setting can be changed. A
  tick box under "Send this setup to the student" controls this.
- **"Days practiced" uses the phone's own date.** An evening's practice
  counted as two days east of the date line in UTC terms.
- **Section headings are real headings.** Instructor setup, Help, Progress
  and the Settings and Accessibility dialogs use h2/h3 for their sections, and
  each box is a labelled group, so VoiceOver's headings rotor can jump between
  them. The look is unchanged.

**Scoring and reporting**

Nothing changes in how an activity is played; what changes is what the
scores, the adaptive margin and the report are built from.

- **Judging and "how much" are scored as two skills.** Judging a sample as
  longer, shorter or about the same, and tapping out how much longer or
  shorter, were recorded under one activity and counted together. Now each
  score, each adaptive lane and each report line keeps them apart. The
  Comparison practice score reads, for example, "Last 10: 70% correct · how
  much: 2 of 5 within margin".
- **One vehicle is one attempt.** A "how much" estimate after a correct answer
  is the same vehicle or sample judged a second way. It no longer adds to the
  total or the accuracy. The report shows it on its own line: "At the street:
  7/10 correct" and "At the street, how much: 4/7 within margin".
- **The last ten means the last ten judgments.** The Comparison practice score
  used to cut the last ten entries first and then drop the "how much" ones, so
  it could show fewer than ten even when ten judgments existed.
- **The replay repeats the verdict.** In Comparison preparation the app allows
  a small timing tolerance (0.02 s, or the measured sound latency) when it
  decides within or outside the margin. The replay recomputed the verdict
  without that tolerance, so an attempt just past the margin could get the
  chime and then the buzz. The replay now repeats the verdict already given.
- **"How much" has its own adaptive lane** ("Comparison practice, how much,
  full street"), starting from the set margin. Existing lanes keep their
  values. Adaptive mode is still experimental and off by default.
- **Old street records** from builds before 7 are now reported as "longer than
  the crossing", "about the same as the crossing" or "shorter than the
  crossing", with no verdict on whether the warning was enough. The app never
  makes that call.
- A report is produced whenever anything is in the log, including vehicles
  that never came or warning times recorded with judging off.

## 2026-10-16 (build 9: iOS, Android, web) — Louder sound, stronger vibration, sound with the silent switch on

From testing build 8 on an iPhone: the sound was too quiet and the vibration
too faint. Cindi had also felt the cues but heard nothing.

- **Sound on iPhone is played by the app itself**, not the web view. WebKit
  could put Web Audio in the audio session that the ring/silent switch mutes.
  The app's own player uses the `playback` session, which the switch never
  mutes, restores it if anything changes it, and restarts after calls, Siri
  and headphone changes. "Get ready" and self-voicing are spoken by the app
  for the same reason.
- **Louder.** Every cue passes through a soft clipper: the steady sample is
  about 7 dB louder and the chimes about 5 dB, with no crackling. The sample
  itself is also set higher.
- **Phone volume note.** The app cannot raise the phone's volume. When it is
  below half, Home asks the student to press volume up; the note goes away as
  soon as they do. **Play a test sound** now reports whether sound is on, that
  the silent switch does not affect it, and the phone volume.
- **Stronger vibration.** Each iPhone knock is a sharp tap plus a short
  full-strength rumble; the "wrong" buzz is 600 ms. Android vibrates for set
  lengths (60–550 ms) instead of a short click. Same rhythms as before.

## 2026-10-16 (build 8: iOS, Android, web) — Polish after device testing

Build 7 was run end to end inside the app on twelve simulated iPhones (iPhone
14 Pro Max, 15, 16, 17, 17e, 18 Pro, 18 Pro Max, Air, SE and 16e, on iOS
26.0, 26.4 and 27). Every check passed. Build 8 carries the small fixes found
while looking at the screenshots:

- At 300% text the header filled the whole first screen. It is now one
  compact row (title 24 px, buttons 52 px); the content keeps the chosen size.
- No focus box drawn around titles that take focus for screen readers.
- "Student code" wording on the Progress screen, to match Instructor setup.
- The native app can run a scripted self-check when launched with a
  developer-only argument; normal use never triggers it.

## 2026-10-16 (build 7: iOS, Android, web) — Second round of O&M feedback

A second detailed review by Cindi Lashinsky (O&M Specialist), with input from
Dona Sauerburger on the at-the-street procedure. Every point is addressed below.
The same code runs on all three: iOS build 7, Android versionCode 7, and the web
page.

**Names and wording**

- "Practise my timing" is now **Practice my timing**. "Time it from a signal"
  is now **Comparison preparation**: to an O&M Specialist, "signal" means a
  traffic signal, and this app is about uncontrolled crossings. "Compare
  practice" is now **Comparison practice**.
- American English throughout (practice, curb, traveler, judgment).
- New task descriptions on Home, written by Cindi.
- The app name ("CrossingTime") is kept for now. It is under discussion, because
  "gap" means the time between vehicles in published work. The name is held in
  one place in the code so a rename is a small change.

**Use with an O&M Specialist**

- A first-run notice: the app is for use under the guidance of an Orientation
  and Mobility Specialist, is not a replacement for instruction, and does not
  cover all the skills needed to cross streets. It cannot be skipped with
  Escape and is shown on first run even from the conference link. Home carries
  the same line permanently. Help can show it again.
- On Comparison practice and At the street: **"Longer does not mean long
  enough."** A longer warning time is not, by itself, enough to cross. Shown
  until the student hides it; Help brings it back.

**Instructor setup (new screen)**

- Crossing times, margin, instructor email and student code moved here from
  Settings.
- The instructor chooses which activities the student sees, which Practice
  modes are offered, and for each option: on, off, or student chooses. Options
  the instructor fixes are hidden from the student, with a short note.
- Optional instructor code (digits) so a student cannot change the setup. It
  locks again on leaving the screen.

**Setup link and report**

- The setup link (version 3) can carry any of: crossing times and margin,
  instructor email and student code, and the activities and options chosen.
  The instructor ticks what to include. Version 1 and 2 links still work.
- **Share the setup link** opens the phone's share sheet. **Text it to the
  student** opens Messages with the message filled in; the instructor adds
  the number.
- Links made inside the installed app point at the public web address, never
  at the app's internal address.
- After a browser applies a setup, it offers **Open in the CrossingTime app**,
  which hands the same setup to the installed app through a `gapsense://` link.
- **Send my progress to my instructor**: the student sees the report, presses
  **Send it**, and chooses Messages, Mail or any app. No copy and paste, no
  Mail setup needed, and no server.

**Comparison preparation**

- Pressing Ready says **"Get ready"** out loud (and two light taps), instead of
  a beep that sounded like the other cues.
- The sound can be the same steady sound used in Comparison practice, playing
  until the student stops it, like hearing a vehicle and deciding "now I would
  finish crossing". Or one short beep, then silence. Instructor or student
  chooses.
- Wait times mix quick (0.7–2 s), medium (2–5 s) and long (5–10 s), never the
  same band three times in a row.
- If nobody presses, the sound stops by itself and nothing is recorded.

**Comparison practice**

- The sample is **one steady sound at one loudness**, with no fade in or out,
  so a student with any hearing loss hears all of it. Loudness defaults to
  100%. A **pitch** control (lowest to high) is shared with Comparison
  preparation.
- Answers open a **full-screen swipe pad** that never scrolls the page: swipe up
  for longer, down for shorter, tap for about the same. Three large buttons sit
  on the pad for VoiceOver and TalkBack users, with focus on the middle one.
  The instructor can choose buttons only.
- Right or wrong is given at once on every channel: the chime or the low pulse,
  the haptic pattern, and, with visual on, the circle or the triangle.
- The replay no longer plays a right/wrong cue at the crossing time. It plays
  the sample, and the student's own "this is your time" sound and flash where
  their crossing time ends.
- **How much longer or shorter** is offered only after a correct "longer" or
  "shorter" answer.
- Two replays after "how much", chosen by the instructor: (a) combined, Cindi's
  design: a steady sound for the crossing time, the right or wrong sound where
  the sample ended, and the student's sound at the crossing time plus or minus
  their estimate; or (b) like Practice my timing.
- The sample on screen is a held bar, distinct from the student's own flash.

**At the street (reworked with Cindi and Dona)**

- The background-noise check is gone, and with it all microphone use and the
  microphone permission on iOS and Android. Accuracy depended on how the phone
  was held, and judging conditions is taught by the instructor.
- New wording: position yourself as directed by your O&M Specialist; tap when
  you *think* you detect (see or hear) a vehicle.
- The student marks **hearing or vision**; it is saved with each vehicle.
- A full-screen pad: **swipe left or right** toward the side the vehicle comes
  from (left compares with the first half of the street, right with the full
  street), **tap** when it passes in front of you, **swipe down** if it never
  came. Buttons do the same for screen reader users.
- After arrival the **student judges** longer, shorter or about the same. The
  app does not give the answer first. "How much" follows a correct
  longer/shorter answer if switched on.
- Replays: after every vehicle, only after a wrong answer, or never (then only
  the right or wrong sound).
- Reports show direction, hearing or vision, the judgment, and vehicles that
  never came. Only judged vehicles count towards a score.

**Accessibility**

- **Self-voicing**: the app can speak its own directions and results, with a
  speaking rate, for students still learning VoiceOver or TalkBack. Speech
  stops whenever a sound is being timed.
- Home activities are single buttons whose name is the title and the
  description, so VoiceOver reads one item per activity. The hidden "Home"
  heading is gone; focus moves to the visible screen title on every screen.
- **Siri**: "Practice my timing in CrossingTime", "Comparison preparation in Gap
  Sense", "Comparison practice in CrossingTime", "At the street in CrossingTime" work
  with no setup, and appear in the Shortcuts app. A **Siri and shortcuts**
  screen explains them. On Android, touch and hold the app icon for the same
  four shortcuts.

**Haptics and sound on iPhone**

- A small CrossingTime plugin now plays every haptic cue through one long-lived
  Core Haptics engine that plays haptics only and never touches audio. The
  stock plugin built a new engine for every long buzz, freed it at once, and
  shared the audio session with the web view.
- Vibration is switched back on, once, for anyone upgrading with an old "off"
  stored from an early build. Turning it off again from build 7 is respected.
- The sound engine now resumes after iOS interrupts it (a call, Siri, another
  app). Before, one interruption could leave the app silent until relaunch.
- The installed app tells WebKit it is a playback app, so the ringer switch
  does not mute it. The silent-audio workaround now runs only on iOS 16.
- Accessibility has a **Play a test sound** button that also reports the state
  of the sound engine.

**Tests**

- The browser test suite grew from 42 to 74 tests, covering every change above.
  The iOS build was launched in the iOS 27 simulator on an iPhone 14 Pro Max
  with a built-in self-check (plugins present, sound running in playback mode,
  speech available, Siri path opening the right screen). The Android build was
  launched on an Android 15 emulator, with a `gapsense://` link and the four
  launcher shortcuts checked.

## 2026-10-14 (iOS build 6) — Hardened for every iPhone and iPad a participant might bring

After the iOS 27 crash, the native shell was audited for anything else that
could stop the app opening on a participant's phone.

- **Minimum iOS pinned to 16.0.** It was left to Xcode, which silently chose
  iOS 17, so anyone on iOS 16 (iPhone 8, 8 Plus, X) could not install it. The
  web code was checked against iOS 16 WebKit: everything it uses is supported
  from iOS 15.4, and the one newer CSS feature already had a fallback.
- **Device requirement corrected** from `armv7` (a 32-bit leftover in the
  template) to `arm64`.
- **Launch tested in the simulator** on 11 models on iOS 27 (iPhone SE 2nd
  and 3rd generation, 11, 13 mini, 14 Pro Max, 16e, 17 Pro Max, Air, iPad
  A16, iPad mini, iPad Pro 13-inch) and 7 models each on iOS 26.0 and 26.4:
  first launch, a second cold launch, and background then foreground, with
  no crash reports and the home screen rendered.
- Checked that the app package contains every web file and Capacitor's
  bridge scripts, whose absence is the only other way Capacitor aborts at
  launch.

Apple does not provide iOS 16, 17 or 18 simulators for the current Xcode, so
those versions are covered by the build settings and the web-feature check
rather than a simulated launch.

## 2026-10-14 (iOS build 5) — Launch crash on iOS 27 fixed

A tester on an iPhone 14 Pro Max running iOS 27.0.1 reported "crashes as soon
as I try to open it". The TestFlight crash log shows an `EXC_BREAKPOINT` on
the main thread inside UIKit's `EvaluateRuntimeIssueForNoSceneLifecycleAdoption`
during scene creation. On iOS 27, an app built with the current SDK that has
not adopted the UIScene lifecycle is terminated at launch. The Capacitor shell
still used the app-delegate-only lifecycle, so every launch on iOS 27 died
before the web view existed. Devices on iOS 26 were unaffected, which is why
it passed device checks here. Reproduced in the iOS 27.0 simulator, where the
same frame appeared within a second of launch.

Fix: `Info.plist` declares a `UIApplicationSceneManifest` (single scene, the
existing `Main` storyboard), and `AppDelegate.swift` gains the scene
configuration hook and a `SceneDelegate` that forwards URL opens and user
activities to Capacitor. No web code changed; Android is unaffected.

## 2026-10-10 (build 4) — Vibration on by default, no zoom trap, visible build number

Found while testing build 3, within minutes of it going live.

- **Vibration is on from the first launch.** It was off until someone found the
  switch under Accessibility. For a DeafBlind user it is the whole interface,
  so the default is now on; an explicit opt-out is still remembered.
- **Double-tap no longer zooms the iPhone app.** A double tap anywhere zoomed
  the web view and there was no way back except relaunching. The native shell
  now locks the viewport (WKWebView honors `user-scalable=no`; Safari does
  not, so the web build is untouched and still pinch-zooms), and
  `touch-action: manipulation` on the page removes double-tap zoom everywhere
  while keeping pinch. Capacitor's `zoomEnabled` is set to false as well.
- **Help → About shows the version and build**, read from the app bundle in
  the native apps ("CrossingTime version 1.0, build 4 (iPhone app)"), so a tester
  can confirm which build they are running. TestFlight itself only shows
  "1.0" prominently.
- iOS build 4, Android versionCode 4, service-worker cache v6. 41 browser tests.

---

## 2026-10-10 — Cindi's review: measuring removed, a signal activity, overlapped replays, privacy in the share link

Cindi reviewed the four activities in detail. Everything below
follows from that review and from a code review the same week. All three bugs
she reported were real.

### Measure my crossing is gone

She was clear: determining the crossing time is the instructor's job. They time
at least three crossings and use the **longest** ("if it took that long once, it
may take that long another time"), and the start, halfway and finish points are
chosen precisely, not by a student pressing buttons while crossing. The step,
its screen and `measure.js` were removed. Settings now says who sets the times
and how; the Home screen points a new user to Settings or to the instructor's
link. Home has four steps again: Practise, Time it from a signal, Compare, At
the street.

### New: Time it from a signal

The first step of her proposed comparison structure: judging time when you do
*not* control the start, the way she teaches at the kerb ("you hear a car
coming… wait… now"). Press **Ready**; after a random wait (1.5–4 s, or 3–8 s
with "Longer waits") the signal comes — two quick blips, a pulse, a flash — and
the student presses when their crossing time is up. Then an overlapped replay,
exactly as in Practice. A press before the signal is a false start and records
nothing. Logged as its own activity with its own progress and margin lane.

### Practice: three bugs fixed

Practice never wrote to the attempt log, so nothing reached the Progress page,
there was no score line, and the adaptive margin could not apply to it. It now
logs every mark (Halfway → first-half lane, Finish → full-street lane), shows
"Last N: X within margin · margin …" under the button, and classifies against
the per-lane margin. The first tone could also land late on the very first
press: the audio engine was created suspended and the first tap waited for it to
resume. It is now created at load and warmed on the first touch.

### Compare practice, rebuilt around "sample warning time"

- **Words.** A gap is the interval between vehicles. What the app plays is a
  **sample warning time**: from first hearing a vehicle until it passes. The
  button is **Play a sample warning time**; "gap" is gone from the interface.
- **Nothing auto-advances.** A new trial used to start by itself 1.4 s after a
  correct answer. The student now presses Play for each one.
- **Overlapped replay, after every answer.** The old replay played the sample
  and then the crossing time back to back, and marked the crossing with the
  within-margin chime at both ends — so a wrong answer ended with two "you were
  close" sounds, the confusing "duplicated sounds" she heard. Now the sample and
  the real crossing time start together, as in Practice: a marker at the start,
  the sample, a marker where it ends, and the feedback cue where the crossing
  time ends (chime if within the margin, low pulse if not). The order of the
  last two sounds is the direction; the distance between them is the magnitude.
  Sight and touch follow the same timeline.
- **The sound of a vehicle.** The continuous sample now grows from quiet to
  loud and stops dead, instead of a steady tone that faded ("the opposite of
  vehicles"). A **Sample loudness** slider with a two-second preview sets where
  the quiet start becomes audible. Two taps with silence between remain an
  option.
- **Answering quickly.** Besides the three buttons, an answer pad takes a swipe
  up for longer, a swipe down for shorter, a tap for about the same (arrow keys
  on a keyboard). Under VoiceOver or TalkBack a web page cannot receive raw
  swipes, so focus lands on **About the same** when answers open; one flick
  reaches either other answer.
- **Random pause** before the sample (optional), and the **how much** step now
  runs before the replay, as she sketched: tap out the difference, hear the
  comparison replay, then your estimate against the real difference.
- Replays now hold a flash for the whole sample and show the acceptable or
  outside shape at the crossing time, so Deaf users see the comparison too.

### At the street

Direction labels now read "Approaching from the left — compared with the first
half of the street" and "from the right — compared with the full street"; the
mapping was right, the words were not. The verdict is followed by the overlapped
replay. The **background-noise check is experimental and off by default**: she
doubts it survives real phones, pockets and hands. The microphone is opened only
while the check is on and the screen is showing, and is released on leaving —
previously it could stay open if the user left before the permission prompt
resolved.

### Adaptive margin: experimental, per task, slower, never pinned

Her longest note: no research supports the window, the step or the stopping
rule; the first version "pinned the learner down" and tightened too fast. The
feature is now marked experimental and off by default, with a margin **per
activity and street type**. It tightens by × 0.92 once per **block of ten**
attempts at ≥ 80% (the old code re-evaluated after every attempt once ten
existed, which is why it felt fast), holds between 60 and 80%, and on a block
below 60% goes **straight back to the instructor's margin**. The learner floor
is gone; **Reset adaptive margins** in Progress starts every lane again.

### Share link and report: a code, never a name

The link travels by plain email or text. The student name field is gone. Settings
has **Instructor email** and a **Client code** (letters and digits, up to 8);
both ride in the version-2 link and the code heads the report. Old version-1
links still import. Progress gained **Email it to my instructor**, which opens
the phone's mail app with the report filled in; the student still presses Send.
Live vehicles in the report are described as verdicts (enough / not enough
warning), not as "incorrect" answers.

### Smaller fixes

- Screen-reader announcements are spoken immediately. The old announcer waited
  20 ms and re-checked a suppression flag, so any message followed by a replay —
  including the correct answer in Compare — was never spoken.
- Leaving a screen mid-activity now cancels it: Settings no longer stays
  disabled after backing out of Practice, no timers keep running, speech is
  un-suppressed, the microphone closes.
- Home shows "Crossing times set" rather than the numbers; the numbers live in
  Settings, so a student is not invited to count.
- Dark theme: the completed marker glyph was white on light green (~1.9:1); it
  uses dark ink now. The action-button hint is at full opacity. Copy buttons are
  44 px.
- The silent-switch keep-alive runs only in the installed app, where it belongs;
  in Safari it would have silenced the user's own music.
- Settings copy: "Measured and set by the O&M instructor…"; margin: "Chosen and
  set by the instructor. 0.50 s has historically been taught; there is no
  research yet on the right value." Default stays 0.40 s.
- Tutorial gained "A sample warning time" and "The start signal".

### Engineering

- **Browser tests.** `cd ios-app && npm test` runs 38 Playwright tests in the
  installed Google Chrome: every screen and dialog, the demo link, Practice
  logging and margins, leaving mid-run, announcements, Compare (no auto-advance,
  replay, swipe and keys, how much, random pause, cancel), the signal activity,
  At the street (verdicts, microphone closed, noise check on/off, the permission
  race), share link v2 and rejection of bad links, the report, deleting data,
  the adaptive maths, and the visual-only / 300% / high-contrast / reduced-motion
  configuration. Not covered: real audio, haptics, VoiceOver.
- `npm run sync` syncs iOS and Android. Service-worker cache `gapsense-v5`.
  iOS build 3, Android versionCode 3. `signal.js` added, `measure.js` removed.

---

## 2026-10-09 — App-bar header, build 2

The header became a sticky app bar with a back button, the screen title and the
Settings and Accessibility icons. iOS build number 2; Android released as
`v1.0-build2`.

---

## 2026-10-05 — Edge to edge on iOS, stronger haptics, silent switch

White bands above and below the web view are gone (edge-to-edge web view, dark
first paint). Haptics strengthened: heavy knock for a tap, three heavy knocks
within the margin, a 450 ms Core Haptics buzz outside it. A looping silent clip
moves WebKit to a playback audio session so tones play with the silent switch
on. `ENABLE_USER_SCRIPT_SANDBOXING=NO` so the CocoaPods embed script runs under
Xcode 27.

---

## 2026-09-28 — Replay haptics for DeafBlind users; Android project

During replay the app vibrated at the reference moment but not at the student's
own tap, so someone relying on touch alone felt one pulse with nothing to compare
it against. Both now pulse. The native Android project was added under
`ios-app/android/`.

---

## 2026-09-27 — The rest of the training sequence

Until now the app covered one activity: practising your crossing time. The
feature proposal describes four, and a meeting with Cindi confirmed a step was
missing *before* the one that existed. All four now ship.

### The missing first step: Measure my crossing

The app used to *begin* from two numbers an instructor measured with a stopwatch
and typed into Settings — the one place the whole method still depended on
counting seconds, and the reason a student could never set themselves up at a new
street alone. There is now a mode that walks the crossing: tap at each point,
repeat, and the app averages the walks, warns if they are inconsistent, plays the
duration back so the felt sense starts immediately, and saves it as the reference.

### Practice Comparison Task

The app plays a gap representing a vehicle's warning time; the student judges it
longer, shorter, or about the same as their crossing. Categories are drawn evenly
so no base rate can be learned, and magnitudes scale with the crossing time.
A wrong answer replays the gap and the crossing time back to back so the error is
felt. An optional follow-up asks the student to tap out *how much* longer or
shorter. The gap can be one continuous sound or two taps with silence between,
because which reads better is genuinely unresolved.

### Actual Comparison Task — at the street

Direction set first (left compares to half street, right to full), then one large
button: tap on detection, tap again as the vehicle passes. Cancel discards a
vehicle that turned off. **Ambient noise sampling** records a 3-second median
baseline of "quiet"; any measurement started more than 6 dB above it is flagged,
because a warning time heard over a running engine is not one to rely on. Audio is
analysed on-device, never recorded or transmitted.

### Adaptive margin of error

Cindi asked for help with the mathematics. Implemented as behavioural shaping over
a rolling window of 10 attempts: **× 0.85 per step** when accuracy is ≥ 80%, hold
between 60–80%, step back to the last successful margin below 60%. Geometric so
each tightening is proportionally the same challenge; from 0.40 s it takes about
nine successful windows to reach the 0.10 s floor. Two successive failures pin a
learner floor at the last margin they held, which an instructor can clear.

### Progress and instructor reporting

Every attempt is logged on the device. A Progress screen shows accuracy per
activity and a strip of recent attempts. A plain-text report can be generated and
copied for the instructor — shown in full to the student first, never sent
automatically, with a one-tap delete for all history.

### Help and first-run tutorial

Separate guidance for clients and instructors, plus a tutorial that runs on first
launch and plays each sound with an explanation of what it means.

### Refactor

The single 3,137-line `index.html` was split into `index.html` (markup),
`css/app.css`, and five JavaScript modules. Still no build step. This was
necessary — the new work would have pushed one file past 5,000 lines.

### Environment

Xcode's update raised the minimum iOS deployment target from 14.0 to 15.0,
breaking the build. Fixed in the Podfile, the Xcode project, and with a
`post_install` hook that forces every Capacitor pod to the same minimum. This
build was verified by compiling against the device SDK and by full functional
testing in the browser.

---

## 2026-08-15 — Native iOS app, redesigned interface, project rename

### Renamed to "CrossingTime"

The project previously carried three different names at once: the page title said
"O&M Timing Practice Prototype", social metadata said "Street Timing Practice",
the repository was "Streets", and the on-screen heading said "Uncontrolled
Crossings". Settled on one name across the whole project.

| Context | Value |
|---|---|
| Full name | CrossingTime |
| Home-screen label / heading | CrossingTime (iOS truncates long labels) |
| Page subtitle | Crossing Practice |
| iOS bundle identifier | `com.gapsense.crossingpractice` |
| npm package | `gap-sense-crossing-practice` |

The earlier internal audit and fix-pass reports were left under the old
working titles as dated records. (They are no longer kept in this repository.)

### New: native iOS application (`ios-app/`)

Wrapped the app in a [Capacitor](https://capacitorjs.com/) shell, giving a real
iOS application that installs on a phone. Verified: `** BUILD SUCCEEDED **`,
installed and launched on an iPhone 17 simulator running iOS 26.5.

**Why native rather than a web app:** `navigator.vibrate()` does not exist in
Safari on iOS and never has. For a DeafBlind user, vibration is the only feedback
channel available — so a web-only build cannot serve them at all. See
[`HAPTICS.md`](HAPTICS.md).

Added:
- **Real Taptic Engine haptics** via `@capacitor/haptics`, with automatic
  fallback to the Web Vibration API on Android and silent degradation elsewhere.
  A **Test haptic pulse** button and a live backend-detection note were added to
  the Accessibility panel.
- **Audio that survives the ringer switch.** Configured `AVAudioSession` to the
  `.playback` category in `AppDelegate.swift`. By default a WKWebView uses the
  `ambient` session, which the hardware silent switch mutes — a student at a
  corner with the switch flipped would have heard nothing and had no way to know
  why. `.mixWithOthers` keeps VoiceOver speech working alongside.
- **PWA support** — web manifest, service worker for offline use, generated app
  icons and a launch image.
- **`serve-lan.mjs`** — a dev server that prints a phone-reachable Wi-Fi address,
  so the app can be tested on a real iPhone without Xcode.

### Redesigned interface

Rebuilt the presentation layer. The timing engine, the AudioContext-clock replay
synchronization, the tuned sound presets, and the feedback-as-duration behavior
were carried over **unchanged**.

- Header with brand mark, card-based sections, segmented mode picker, progress
  chips, and a large gradient action button.
- **Stage identity is encoded four independent ways** — color, corner radius,
  border style, and symbol — so it is never carried by color alone.
- Every accent color verified at **≥4.5:1** contrast against the text on it, in
  all four themes. Gradients run dark→mid rather than dark→bright so white text
  stays legible across the whole sweep.
- High-contrast and inverted themes flatten every gradient.
- Large-text mode reflows the header, mode picker, and marker row to single
  columns at 130% and above.

### Three bugs fixed

1. **The marker cue banner was unreadable.** `emitCue("marker", …)` set the
   banner text, then `updateNextPrompt()` overwrote it on the very next
   statement. Both facts now live in one message: *"Halfway marked. Press Mark for
   Finish."*

2. **The progress-marker summary never reached screen readers.**
   `updateMarkersSummary()` carefully computed an `aria-label` such as "Progress
   markers: Start complete, Halfway current" — and set it on an element carrying
   `aria-hidden="true"`, which discarded it. Now `role="img"` plus `aria-label`,
   making the row one announceable unit.

3. **Feedback classification was computed twice.** `beginReplay()` calculated the
   margin/latency/epsilon comparison once for the audio schedule and again for the
   visual event list. If either copy were tuned, sound and visuals would silently
   disagree about what counted as acceptable. Now a single `classifyMark()` drives
   audio, visuals, cues, and haptics.

Also removed two functions (`showUserVisualPulse`, `showReferenceVisualPulse`)
that were defined but never called, and consolidated the duplicated
`getReferenceTimes` / `getReferenceTimesForMode` pair.

### Documentation

Added `docs/APP_GUIDE.md`, `docs/TESTING.md`, `docs/HAPTICS.md`, this changelog,
and `ios-app/README-IOS.md`. Rewrote the root `README.md` as a reviewer entry
point.

---

## 2026-07-08 — Fix pass

Summary:

- **Audio clarity.** `TEST_TUNING` had shipped with all four volume multipliers
  at the debug maximum of `2`, so feedback tones ran at gain 4× and the "outside"
  pulse peaked around 4.3× full scale — hard-clipped into distortion, which is
  why it sounded quieter and mushier rather than louder. Volumes reset to 1
  (0.8 for the button chime), every preset renormalized to a partial-gain sum
  ≤0.80, and a `DynamicsCompressorNode` master limiter added.
  The outside pulses were rebuilt: **240–260 Hz → 294–349 Hz** (small phone
  speakers roll off below ~300 Hz, so the old cue was partly lost inside the
  speaker), duration **0.12s → 0.30s**, and built from two closely spaced
  frequencies that beat against each other for a rough texture.
- **Dead marker cue.** `emitCue()` defined a `marker` cue with a vibration
  pattern that no call site ever fired — so with vibration enabled, tapping Mark
  did nothing. Fixed.
- **Dark-mode contrast** (issue `uc-3qz`). White on the dark theme's `#64d3bf`
  accent measured ~1.8:1, a hard WCAG failure. Added a per-theme `--on-accent`
  variable.
- **Forced-light invisible text.** Choosing Light while the OS was in dark mode
  rendered several buttons as white-on-white. Fixed with explicit `color-scheme`
  per theme.
- **Accessibility.** Added the first `<h1>` the page ever had; converted five
  unlabelled radio clusters to `<fieldset>`/`<legend>`.
- **Dead code removed.** A mute flag with no UI, the entire SFXR sound path
  (dead at both ends — no engine file, no data), a permanently hidden status
  element, and an unused npm dependency. 3,367 → 3,271 lines.
- **Documentation honesty.** The README had described a Next.js directory
  structure that does not exist in this repository. Rewritten.

---

## 2026-06-10 — Repository audit

No code changed. A full audit of the original single-file prototype covered correctness, accessibility readiness, PWA-versus-native tradeoffs, and a
prioritized improvement list. Most of the 2026-07-08 and 2026-08-15 work comes
directly from its recommendations.

---

## Before 2026-06-10

Original prototype development. Not under version control; no history available.
Preserved unmodified at `../index.html` apart from the rename.

---

## Outstanding

Known and deliberately not done yet:

- **No VoiceOver/TalkBack device pass**, including the open question of whether
  VoiceOver's double-tap-to-activate latency degrades marking accuracy, and
  whether focus-on-the-middle-answer is quick enough in Compare.
- **No roadside sound check.** The cues and the rising sample have only been
  heard through laptop and phone speakers indoors.
- **Two timing systems coexist.** Audio runs on the drift-free `AudioContext`
  clock; UI stage changes and haptics use `setTimeout`. On a loaded device they
  can drift apart slightly. The fix is to drive everything from the replay
  timeline.
- **Core Haptics** for intensity-shaped patterns, where buzz length would encode
  error size.
- **Cindi's fourth comparison step** is not yet specified.
- **Not on the App Store or Play Store.**
