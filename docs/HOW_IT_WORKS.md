# How CrossingTime Works, and Why Each Part Exists

A plain explanation of the whole app in one story, then each function on its
own: what it is for, why it was built, how it works, and when to use it.

---

## The one problem the app solves

A blind person stands at a street with no traffic light. A car is coming. The
only question that matters is:

**Do I have enough time to cross before it reaches me?**

To answer it, two durations have to be compared in the head:

1. How long **my** crossing takes.
2. How long until **that car** arrives, judged from its sound or its sight.
   Instructors call this the **warning time**: from first detecting a vehicle
   until it passes in front of you.

Sighted people learn this by watching thousands of crossings. A blind traveler
has to learn both durations by feel, and nobody teaches it systematically.
Orientation and mobility instructors often say "count to eight". But at a real
curb nobody counts, and counting under stress is unreliable.

**The design rule behind everything:** the app never gives a number of seconds.
It plays durations back as sound and vibration, because that is the form the
judgment will take on the street. You learn a duration in the same channel you
will use it in.

**Use it with an O&M Specialist.** The app is meant to be used under the
guidance of an Orientation and Mobility Specialist. It does not replace
instruction, and it does not cover all the skills needed to cross streets. It
says so on first run and on the Home screen.

The four parts of the app are the four steps of teaching that skill, in order.
All of them compare against the person's own crossing times, which is why they
stay locked until those times are set.

| # | Part | Teaches | Where |
|---|---|---|---|
| — | Your crossing times | Set by the instructor | At the real street |
| 1 | Practice my timing | How my crossing time **feels** | Anywhere |
| 2 | Comparison preparation | The same feeling when I do not choose the start | Anywhere |
| 3 | Comparison practice | Comparing a warning time with my crossing | Anywhere, no traffic |
| 4 | At the street | The same comparison with real vehicles | Where the instructor places you |

---

## Before you start: your crossing times

### What they are

Two numbers: how long this person takes to cross the **first half** of the
street (the lanes with traffic from the left), and how long to cross the
**full street** (traffic from the right). Everything else is compared against
them.

### Why the instructor sets them

The measurement has to be **theirs**: a tall, fast walker and a slower person
using a cane can differ by several seconds on the same street. And it has to
be done properly. An O&M Specialist times at least three crossings and uses
the **longest**, because if it took that long once, it may take that long
again. The start, the halfway point and the finish are chosen precisely. A
student pressing buttons on a phone while crossing cannot do that safely or
accurately, so an earlier version of the app that tried to measure the
crossing itself was removed.

### How they get into the app

The instructor types them in **Instructor setup**, or sends the student a link
that sets them in one tap. The student never has to type a number.

### For a demonstration

Nobody times a crossing in an office. On the home screen, **Try it now with
example times** loads example values instead, and the app says plainly that
these are examples rather than the user's own.

---

## Part 1. Practice my timing: the heart of the app

### What it is for

Developing an accurate sense of your crossing times through practice and
feedback, so that at a curb you know in your body how long you need.

### Why it exists

This is the skill itself. Knowing "my crossing is 8 seconds" as a fact is
useless at a curb. Knowing it as a feeling, the way a musician knows a tempo,
is what lets someone judge a warning time instantly, without counting.

### How it works

Sitting anywhere, the person:

1. Taps the big button. It reads **BEGIN**. This means "I am stepping off."
2. Waits as long as they believe the crossing takes, imagining the walk.
3. Taps again. The button reads **MARK**. This means "I have arrived."

The app says "Replay" and then replays two things close together:

- **Their tap**, as their own sound, at the moment they actually tapped.
- **The reference**, a feedback tone at the moment they *should* have tapped.

A bar under the button fills for the length of the replay and marks each
sound where it played. When the replay is over the app says what it was, in
words and never in seconds: "That was your taps, then the crossing time:
within the margin."

If the two sounds land together, they were right. The further apart the sounds,
the further off they were. The feedback tone also says which way:

- **Short, bright, high chime**: within the margin. Close enough.
- **Long, low, buzzing pulse**: outside the margin. Too far off.

The two are different in pitch, length and texture at the same time, so they
can never be confused, even through a phone speaker next to traffic. With
vibration on (the default), the same signals arrive by touch: one knock for the
tap, three knocks for within the margin, one long buzz for outside it.

**The lesson is the distance between the two sounds.** Not a number. After
enough repetitions the chime comes more and more often. That means the duration
has moved into the body. A line under the button keeps count of how many of the
last ten attempts were within the margin.

### When to use it

Often, and briefly. Five minutes a day is better than one long hour.

---

## Part 2. Comparison preparation

### What it is for

Getting ready to compare your time to various sample times. The same felt
duration, but starting from a moment the person did not choose.

### Why it exists

In Part 1 the person starts the clock themselves, which gives them a rhythm:
tap now… and now. At a curb nobody hands you the start. You hear a vehicle
coming, you wait, and at some moment you must judge: *now* is when I would
finish crossing. Cindi Lashinsky teaches exactly this at the curb ("you hear a
car coming… wait… now"). The student shows here that they can find "this is my
time", and in Part 3 they use it to compare.

It was called "Time it from a signal" until build 7. To an O&M Specialist,
"signal" means a traffic signal, and this app is about uncontrolled crossings.

### How it works

1. Choose which crossing. Press **READY**.
2. The app says **"Get ready"** out loud, with two light taps on the hand. It
   is spoken, not a beep, so it cannot be mistaken for the start or for any
   other sound.
3. The app waits. Waits are mixed: some quick, some medium, some long.
4. The sound starts, like hearing a vehicle. By default it is the same steady
   sound used in Part 3, and it keeps going until the person stops it. The
   other choice is one short beep, then silence.
5. The person presses when they think they would finish crossing.
6. The replay uses Part 1's sounds: the sound for as long as they let it run,
   their own sound where they pressed, and the chime or pulse where their real
   crossing time ends.

Pressing before the sound is a false start. The app says so and records
nothing. If nobody presses, the sound stops by itself.

### When to use it

Once Part 1 feels comfortable. Anywhere.

---

## Part 3. Comparison practice

### What it is for

Is the sample warning time longer, shorter, or about the same as your crossing
time? How much longer or shorter? Building the skills needed to compare your
crossing time with actual vehicles, without any traffic at all.

### Why it exists

Parts 1 and 2 teach one duration. Crossing safely means **comparing two**.
This part trains the comparison in a safe room. No instructor can otherwise do
this, because you cannot schedule cars to arrive at useful intervals.

### How it works

1. The person presses **Play a sample warning time**. The app plays one steady
   sound, at one loudness from start to end, whose length stands for a
   vehicle's warning time. There is no fade: a student with any hearing loss
   needs to hear the whole thing to judge it. Loudness starts at 100% and the
   pitch can be lowered for people who hear low sounds better. Two beeps with
   silence between is the alternative.
2. A full-screen pad opens: the whole screen below its header is the swipe
   area, with the question and the instructions at the person's text size.
   **Swipe up** for longer, **swipe down** for shorter,
   **tap** for about the same, anywhere on it. It never scrolls the page. The
   instructor can set buttons only instead; then three large buttons answer,
   and focus lands on the middle one so one flick reaches either of the
   others.
3. Right or wrong comes at once: the chime or the pulse, the matching
   vibration, and with visual feedback on, the green circle or orange triangle.
4. **The replay.** The sample and the person's crossing time start together.
   The sample plays for its length; the person's own "this is your time" sound
   lands where their crossing time ends. Which comes first says the direction;
   the distance between them says how much. There is no right/wrong sound
   inside the replay, because the answer has already been given.
5. Nothing starts by itself. The person presses Play for the next sample.

**How much longer or shorter?** Only after a correct "longer" or "shorter"
answer: if you could not tell the direction, you cannot judge the size. The
person taps the difference out on a full-screen button. The instructor chooses
the replay that follows:

- **Combined** (default): the steady sound for the sample warning time (the
  steady sound always means the warning time), the person's sound where their
  crossing time ends and again at the crossing time plus or minus their
  estimate (where they thought the warning time ended), and the chime or pulse
  where the warning time really ended (chime if the estimate was close).
- **Like Practice my timing**: their estimate against the true difference.

A random pause before the sample is an option, so the start is not
predictable.

A note on screen says **longer does not mean long enough**. A longer warning
time is not, by itself, enough to cross. The instructor teaches how many
vehicles to sample and how to judge if a warning time is long enough.

### When to use it

After parts 1 and 2 feel solid. Anywhere, any time, no street needed.

---

## Part 4. At the street

### What it is for

Getting warning times of actual vehicles, and comparing them with your
crossing time.

### Why it exists

Simulated warning times are clean. Real vehicles have engine notes, wind,
echoes off buildings, and background noise. This part carries the skill over
into reality. The comparison task is the same as Part 3; what changes is the
direction the vehicle comes from, and that the sound is a real vehicle.

### How it works

1. The person stands where their O&M Specialist directs, so they can look or
   listen for approaching vehicles.
2. They mark whether they are using **hearing** or **vision**. Some use one,
   some the other, some choose by conditions. It is saved with each vehicle.
3. **START** opens a full-screen pad.
4. The moment they **think** they detect a vehicle, they swipe toward the side
   it comes from: left or right. (Tapping when you think you detect it, rather
   than when you are certain, gives the longest warning times.) From the left
   is compared with the first-half time; from the right, with the full street.
5. They **tap** when it passes in front of them, or **swipe down** if it never
   comes.
6. Then **they judge**: longer, shorter or about the same. The app does not
   give the answer first. "How much" can follow, as in Part 3.
7. Replay is set by the instructor: after every vehicle, only after a wrong
   answer, or never. "Never" plays just the right or wrong sound, which keeps
   the street quiet when replays are not needed.

With swipes on there are no buttons; the instructor can set buttons only. On
the iPhone app the swipe area is a VoiceOver Direct Touch area and the cursor
lands on it as the pad opens; the web area is a labelled element for TalkBack
and other screen readers. **Back**, top left of every pad and outside the
swipe area, is the way out of a try that was interrupted or started by
mistake: it goes up one level and records the cancelled part as cancelled,
never scored. After a replay in the three comparison activities, **Play it
again** replays the last try, as often as the person likes, unrecorded.

An earlier version listened to background noise through the microphone. It
was removed: its accuracy depended on how the phone was held, and judging the
conditions is something the instructor teaches.

### When to use it

Last, with the instructor, from where they place you. Never in the road.

---

## The supporting parts

### Instructor setup

The instructor enters the crossing times and margin, then chooses what the
student sees: which activities, which practice modes, and for each option
whether it is on, off, or the student's choice. An optional code stops the
student changing the setup. Everything can go to the student's phone as one
link, through the share menu or a text message.

### Progress

Accuracy for each part and a strip of recent attempts. At the street, only
vehicles the person judged count towards a score. One vehicle or sample is one
attempt: a "how much" estimate that follows a correct answer is shown on its
own ("how much: 4 of 7 within margin") and never added to the count, because
telling longer from shorter and tapping out the difference are two skills.

**Show my report to send** shows the report in full first; nothing is sent
until the person chooses how. Many students, especially older adults, have no
email, so the first way needs none: **Text to my instructor** opens
Messages with the report (and the instructor's number from the setup). Email
is offered only when a mail app can open. The share menu and a CSV file for
Excel are there too. (Builds 14 to 19 could also show the report as QR codes
to scan; a long report needed many codes and nothing joined them again, so
build 20 removed it.) The report lists the actual
times of every try, in seconds, which the app never shows during practice. It
names the person by a short student code, never a name.

The experimental **adaptive margin** lives in Instructor setup. When on, each
activity, skill and street type keeps its own margin, which tightens slowly while the
person keeps succeeding and goes straight back to the instructor's margin when
they do not. It is off by default: the research on the right pace does not
exist yet, and the instructor decides.

### Accessibility

Output mode (sound, visual, or both), vibration (on by default), text size up
to three times, color schemes including yellow on black, high contrast, and
screen-reader announcements. The app quietens the screen reader during playback
on purpose, so it does not talk over the sounds.

**The session code.** For conference sessions the app can be installed at
home while the four practice activities stay closed until a short code,
given out in the room, is typed once. It keeps people from practising alone
before the session and needs no internet.

**Self-voicing** reads the app's directions and results aloud, for people still
learning VoiceOver or TalkBack. Separately, and for everyone, the app says
"Replay" before every replay and describes the result and each replay in words
afterwards; with a screen reader running those words go through the screen
reader instead. **Siri**: "Practice my timing in CrossingTime" and
the other three open an activity directly; on Android, touch and hold the icon.

Vibration is the reason this is a native app at all. Safari on iPhone cannot
vibrate, and for a DeafBlind user vibration is the entire interface.

### Privacy

No account, no sign-in, no server; the app collects no data. Everything is kept
on the phone, and in the phone's own backup if it is on. The app does not use
the microphone. The person can delete all their history at any time from
Progress, after a confirmation that says where it is deleted from.

---

## The whole app in one paragraph

The app teaches a blind traveler to feel two durations, their own crossing and
a vehicle's approach, and to compare them, alongside an O&M Specialist. The
instructor sets the crossing times and chooses what the student sees. Part 1
turns that duration into a feeling. Part 2 asks for the same feeling when the
start is not the person's own. Part 3 practices comparing it with a sample
warning time, safely indoors. Part 4 does the same with real vehicles. It never
shows a number, because at the curb nobody is counting.
