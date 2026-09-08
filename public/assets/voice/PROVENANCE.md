# Scrubssitel generic announcement fallbacks

Generated 2026-09-08 using eSpeak NG built-in formant voices `de` and `en-us`, at 150 words per minute, pitch 48, amplitude 90. The npm distribution is `espeak-ng@1.0.2`; its engine reports `1.52-dev`. The generator was installed and run locally in `/tmp/scrubssitel-espeak-fallbacks`, with npm lifecycle scripts disabled. Nothing was installed globally. No Apple speech voices, MBROLA voices, external voice models, cloud service, or human voice recordings were used.

The 12 `.m4a` files contain the original short game announcement texts listed verbatim in `provenance.json`. They total 347,742 bytes, use mono AAC at a target of 64 kbit/s and 22,050 Hz, and last 2.13–3.64 seconds each. `afconvert` was used only to encode and verify existing PCM samples. All files decoded successfully and passed duration/non-silence checks. No loudspeaker playback was performed.

## Tool license and output assessment

[eSpeak NG](https://github.com/espeak-ng/espeak-ng#license-information) and the [Emscripten distribution](https://github.com/ianmarmour/espeak-ng.js) use GPL-3.0-or-later. A copy of the distribution's GPL text is retained as `TOOL-LICENSE-GPL-3.0.txt` for provenance. Neither the engine nor its WASM code needs to be shipped in the game: only these generated audio files are used at runtime.

The [upstream description](https://github.com/espeak-ng/espeak-ng#espeak-ng-text-to-speech) documents eSpeak's formant synthesis. [GPL v3 section 2](https://www.gnu.org/licenses/gpl-3.0.en.html#section2) and the [GNU output FAQ](https://www.gnu.org/licenses/gpl-faq.en.html#GPLOutput) distinguish a tool's license from its output. The [FAQ on output exceptions](https://www.gnu.org/licenses/gpl-faq.en.html#WhatCaseIsOutputGPL) explains that copied program artwork or audio can retain its original license. Here the inputs are original announcement sentences, rendered with built-in formant synthesis, without a third-party voice recording or separately licensed voice model. The assessment that these generated audio assets are not automatically subject to the tool's GPL is an inference from these primary sources and the chosen synthesis method, not a separately issued eSpeak output license. No new license is imposed here on the game's original asset content.

## Reproduction parameters

The exact npm distribution version/integrity, eSpeak arguments, phrases, AAC conversion options, source WAV hashes and decoded signal checks are recorded in `provenance.json`. Synthesis used the `-w` option to write WAV instead of playing through a speaker. Only the generated AAC files, provenance and the synthesis tool's license notice are included here; the engine and temporary build environment are not distributed with the game.
