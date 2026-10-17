# Current verification — October 15, 2026

Release 1.2.2: **34 relevant animation, lighting, scheduling and server tests passed**. The full 109-test suite passed for 1.2.0; audio detection is unchanged by these visual updates. No live OpenAI requests were made. The two real Chromium audio checks documented below were performed for 1.1.0; they were not repeated for these animation updates.

## Three background dance crews

Pocket Crypt Crew, Hex Cats and Some Assembly Required join the automatic rotation, bringing it to 12 background acts. Four miniature skeletons have articulated limbs and recognisable skull/rib/spine/pelvis anatomy; four cats have alternating paws/kicks and independent swishing tails; six floating parts form a skull/hand/foot chorus. Each cast stays beside the central skeleton, follows the full musical beat, fades during silence and resumes the existing scheduled act after song gaps. No new manual controls, audio changes or AI requests were added.

Four new tests exercise cast/position limits, finite continuous motion and alternating phase, bounded drawing work with restored Canvas state, and a simulated 650-second automatic show with silence/phase preservation. Existing scheduler/lighting/cabaret/rig-clock checks and server module/access/budget checks also pass (34 total for this release). Actual Canvas stage renders of all three crews at two phases were visually inspected. No physical TV test was performed.

## Foreground pumpkin depth

Both foreground pumpkins now have a soft cast shadow directed away from their respective spotlight, a tight contact shadow and clipped gradient shading on the shell's underside/far side. Rim highlights face the purple left and orange/accent right spotlights. Existing beat pulses and quiet/off/reduced-motion behavior are retained. The shadows use small Canvas gradients, without blur filters, extra animation loops or audio changes.

The existing 24 relevant tests passed after updating the Canvas test stub for the added drawing operations. Actual Canvas close-ups of both pumpkins were visually inspected on the beat, between beats and with lighting off. No physical TV test was performed for this update.

## Automatic cabaret and guest-character update

Four new skeleton routines and four background character acts bring the automatic lineup to 18 dances and nine background acts. All art and choreography are local Canvas code; no network calls, generated scripts, added model usage or new manual cue controls are involved. New dances follow the half-speed choreography clock. Guests follow the full music beat and stay to the sides of the main character. Temporary chair, bow tie and suspenders fade with their act without changing the saved outfit.

Five new automated tests cover dense joint samples and continuity, distinct dances, bounded guest counts/paths and beat response, actual drawing functions with balanced Canvas state, complete shuffled bags without immediate repetition, and a simulated 1,000-second show including silence and minimum 12-second separation. The full existing suite also passed. Actual Canvas renders of all eight new acts at two phases were visually inspected in a contact sheet. These are offline rendering checks, not a new physical TV test.

## Confidence and dance-speed update

The default music-start agreement threshold is reduced from 55% to 20%, with a host slider from 0–90%, saved per browser and passed to the analysis worker. Three approximately regular neural beat events are still needed to start. Once active, any neural beat event can refresh music presence despite low confidence or irregular spacing; up to 12 seconds of audible uncertainty retains the estimate. Silence still idles immediately through the normal smooth activity fade, stale streams idle, and sustained silence resets model/gate history.

A separate continuous choreography clock defaults to ½× the music BPM. Selected/generated poses, elastic deformation and surprise dances use it. Lights, foreground pumpkins, background gags and musical burst triggers retain the full beat clock. Changing the rate preserves the dance phase. Manual/demo and automatic modes all respect this dance multiplier, including 80 music BPM → 40 dance BPM without the music clock's 50 BPM floor affecting choreography.

New checks exercise low-confidence admission, continuation through weak/irregular beats and missed sections, silence/staleness, exact half-time and phase-preserving rate changes, the real Stage draw's pose and elastic inputs versus full-rate light opacity, surprise dance phase, host controls and persistence/validation without AI calls. The full real-PCM neural tests still pass for 100/120/128/150 BPM music with vocals and missing kicks, as well as noise/isolated claps and silence/song transitions. Physical TV testing has not been repeated.

## Replaced audio architecture

The previous render-loop FFT/loud-peak interval detector and bass-preference shortcut have been removed. Capture is now sample-timed in an AudioWorklet, with bounded transferable buffers sent directly to a music worker. That worker resamples audio, computes the original trained BeatNet features, runs three pretrained ONNX CRNNs, averages their probabilities and updates an online particle tracker. No audio is sent to the backend or any cloud service. Fixed model/runtime assets are included locally.

The presentation clock uses accepted musical beats to refine tempo over time and smoothly align phase. It preserves a locked half/double interpretation during fills, then clears track history after a genuine silent gap. Host Half/Double correction remains automatic, is remembered per browser, and stays within the 50–200 BPM animation range. Manual/tap BPM cannot be overwritten by model output. Beat strength uses relative spectral attacks at neural beat events; volume, tempo confidence and activity are separate.

## Actual model tests

These tests process complete PCM waveforms through the real frontend, ONNX models and decoder. They replace the previous idealized analyser/onset mocks as the tempo accuracy tests.

- Odd-length FFT/log-band features match independent madmom reference fixtures within 0.000003 (measured maximum approximately 0.00000024).
- All three ONNX models match independent PyTorch probabilities and recurrent states across 200 consecutive frames, within the stated numerical tolerances. Model resets clear recurrent history.
- Original synthetic mixes include kick, bass, snare, eighth-note hats, irregular vocal harmonics and missing kicks. Settled measurements begin after 12 seconds, with a modeled 75 ms delivery delay.

| Input | Mean BPM | Settled BPM range | 95th-percentile phase error |
| --- | --- | --- | --- |
| 100 BPM | 99.97 | 99.85–100.13 | 41 ms |
| 120 BPM | 120.01 | 120.00–120.14 | 41 ms |
| 128 BPM | 128.00 | 127.79–128.11 | 39 ms |
| 150 BPM | 149.97 | 149.41–150.20 | 40 ms |

The 24-second mixes took approximately 0.77–0.92 seconds each to process locally in the measurement run. These are controlled synthetic measurements, not a general music benchmark or HDMI latency measurement.

Further checks cover 48 kHz resampling and sample-clock positions, a 120→silence→150 BPM transition, noise and isolated claps without sustained music activity, staleness/out-of-order results, bounded worklet buffers, gap recovery, and an actual model worker processing audio without a rendering loop. Silent worklet output plus a zero-gain safety sink prevents monitoring captured audio through speakers. Microphone/capture denial, load/worker failures, suspended contexts and track disconnection have tested manual/demo fallbacks.

## Real browser verification

A local synthetic-input page exercised the real browser AudioContext, capture worklet, resampling, three-model worker, messaging and presentation clock under the production Content Security Policy. It did not access the microphone or play audio aloud. Ordinary JavaScript eval remains disabled; only WebAssembly compilation is permitted.

Two nine-second 128 BPM runs passed. The final run reported **128.03 BPM**, 0.968 particle agreement, active dancing and “Rhythm locked.” The last processed block took approximately **1.6 ms** in the worker. Each run included a deliberate **500 ms main-thread stall** while audio processing continued independently. This was the Codex in-app Chromium browser, not a physical TV/audio-output capture test in the user's usual Edge/Chrome session.

## Recorded-music research checks

Outside the app/ZIP, research used the BeatNet authors' 10-second 120 BPM kick file and Beat This!'s supplied 155.7-second vocal/instrument recording. The kick run produced a 120 BPM median event spacing. The full music recording processed in approximately 5.47 seconds. The latter has no verified beat annotations in this evaluation, so it was a performance/real-music smoke test, not an accuracy claim. These recordings are not bundled.

## Honest limitations

Half/double-tempo ambiguity still occurs: a synthetic 80 BPM pattern with strong eighth notes was initially interpreted near 160; a 180 BPM pattern was interpreted near 90. Continuity now prevents a locked song flipping between those rates, and the host Half/Double control corrects the desired interpretation. Low or non-percussive music, unusual meter, reverberation and loud conversations can still need manual timing. Allow a few seconds to establish the musical pulse. Actual room/TV capture and HDMI offset should be checked on the party setup.

## Existing app behavior and budget

The full suite also covers recognizability/rig anchors, eleven selectable dances, eighteen surprise routines and nine background acts, elastic limits/idle, pumpkin/stage-light pulses, song-break pause/resume and retained timers, surprise spacing, the five-minute burst cooldown, cached/offline controls, slow/failed AI submissions with continued animation, strict scene validation, host authorization and included-plan usage guards.

No live subscription authentication or inference was retested. There is no paid API-key path, credit purchase, automatic retry or paid fallback. Credentials remain private in app/.local and are excluded from the portable ZIP. The archive is rebuilt from the current live files, including all model assets, tests, licenses and documentation, then hash-checked against them.
