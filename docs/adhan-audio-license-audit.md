# Adhan Audio License Audit (Release Gate)

This document is the release gate for bundled adhan audio.

## Gate Rule

- Release is allowed only when every bundled adhan row is marked `PASS` with verifiable commercial usage rights.
- If any row is not `PASS`, replace that file with a clearly licensed alternative before release.

## Audited Files

| File | Source URL | Uploader / Owner | License Type | Commercial Use Allowed | Attribution Required | Proof Link / File | SHA-256 | Verified On | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `assets/audio/adhan/barakatullah_salim_18sec.mp3` | `https://freesound.org/people/3bagbrew/sounds/511003/` | `3bagbrew` | `CC0 / Public Domain` | `Yes` | `No` | `https://creativecommons.org/publicdomain/zero/1.0/` | `3b5e3723754532da896defd611bfc786ff9fc01419128b4cb0efc974e32db927` | `2026-02-22` | `PASS` |
| `assets/sounds/barakatullah_salim_18sec.mp3` | `Synced copy of canonical file` | `Project mirror` | `CC0 / Public Domain` | `Yes` | `No` | `Canonical file above` | `3b5e3723754532da896defd611bfc786ff9fc01419128b4cb0efc974e32db927` | `2026-02-22` | `PASS` |
| `android/app/src/main/res/raw/barakatullah_salim_18sec.mp3` | `Synced copy of canonical file` | `Project mirror` | `CC0 / Public Domain` | `Yes` | `No` | `Canonical file above` | `3b5e3723754532da896defd611bfc786ff9fc01419128b4cb0efc974e32db927` | `2026-02-22` | `PASS` |

## Required Evidence

For each file, store one of these:

1. Public license page that explicitly permits commercial redistribution in apps.
2. Written permission from rights owner (email or signed document).
3. Contract/document proving owned or commissioned recording.

Keep evidence in a private compliance folder and link it in the table above.

## Canonical Policy

- Canonical adhan asset path: `assets/audio/adhan/barakatullah_salim_18sec.mp3`
- Any duplicate copy must match canonical hash exactly.
- If canonical file changes, update this audit table and checksum before release.

## Policy References

- Google Play Intellectual Property Policy: https://support.google.com/googleplay/android-developer/answer/9888072
- Google Play Policy Center overview: https://support.google.com/googleplay/android-developer/answer/15604226
