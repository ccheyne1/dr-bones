# Local music tracking: sources and notices

No third-party cloud service is used for beat tracking. Runtime assets are served only from this PC; the app does not download code or weights at launch.

## Research and choice

The former detector estimated tempo from loud-attack intervals sampled during animation. A low-pass filter did not address missing beats, competing subdivisions, context or frame timing. The replacement uses learned musical beat probabilities and an online state-space tracker, independently of rendering.

- **BeatNet (ISMIR 2021)**: [paper](https://arxiv.org/abs/2108.03576), [authors' implementation](https://github.com/mjhydri/BeatNet). A causal CRNN plus particle-filter method designed for live beat/downbeat tracking. We use all three published CRNN weight sets as an equal-probability ensemble. Our application decodes the beat pulse; it does not claim bar/downbeat identification.
- **BeatNet ONNX conversion/reference assets**: [coral/beatnet-rs](https://github.com/coral/beatnet-rs), crate 0.1.0. Its exports make recurrent states explicit and include numerical references from the original PyTorch/madmom pipeline. We adapted its feature/particle logic to JavaScript, use a different seeded generator, resampler, three-model ensemble and presentation clock, and omit the downbeat cascade. `public/vendor/beatnet/manifest.json` records the original BeatNet revision, weight/export hashes and export errors. Each ONNX file was SHA-256 checked against that manifest before inclusion. The bundled license contains BeatNet's CC BY 4.0 text, author attribution and madmom's BSD notice. These projects do not endorse Dr. Boner.
- **Aubio**: [published real-time approach](https://www.music-ir.org/mirex/abstracts/2006/AME_BT_OD_TE_brossier.pdf), [API](https://aubio.org/doc/latest/tempo_8h.html). Evaluated its small local WASM build during research; it is not shipped or used by this app.
- **Beat This!**: [official implementation](https://github.com/CPJKU/beat_this). A strong file-oriented tracker, but causal BeatNet fits a live party stream without a rolling offline-window delay. The authors' supplied musical test recording was used only for local evaluation, outside this app/ZIP.
- **Essentia RhythmExtractor2013**: [official algorithm documentation](https://essentia.upf.edu/reference/std_RhythmExtractor2013.html). Considered for multi-feature rhythm extraction; its signal-oriented interface and fixed 44.1 kHz requirement add integration work for this live browser path. Not included.
- **Web Audio Beat Detector**: [maintainer's project](https://github.com/chrisguttandin/web-audio-beat-detector). Works on AudioBuffer analysis; not selected for streaming phase tracking. Not included.

## Shipped assets

- `public/vendor/beatnet/`: three 1.6 MB ONNX weight sets, filterbank, window coefficients, provenance manifest and full `LICENSE.txt`.
- `public/vendor/ort/`: ONNX Runtime Web **1.30.0**, MIT license plus third-party notices. Only the SIMD WASM backend is bundled; one inference thread runs inside the dedicated music worker. `provenance.json` records the npm integrity value used to verify the downloaded package. [Official deployment documentation](https://onnxruntime.ai/docs/tutorials/web/deploy.html).
- `tests/fixtures/`: synthetic PCM/features and PyTorch state/probability references from beatnet-rs for numerical verification. These contain no room recordings or commercial song audio. Its attribution/license is retained with the BeatNet assets.

These assets require no paid API, hosting, credits or external authentication. No library package install is necessary to start the app.
