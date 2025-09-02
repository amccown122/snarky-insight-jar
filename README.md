# Snarky Insight Jar

A small, single‑page app for logging “snarky insight” moments by dropping animated coins into a jar. Entries are stored locally in the browser and can be exported as CSV.

## Engineering TODOs

- Phase 1: Assets + hygiene
  - Externalize jar/tape images with safe fallbacks (done, guarded swap at runtime).
  - Prefer external mask; fallback to embedded if dims differ (done).
  - Add image decoding hints; keep layout unaffected (done).
  - Add `.gitignore` and expand README (done).
- Phase 2: Structure + quality
  - Split HTML/CSS/JS; keep plain JS, no bundler.
  - Add ESLint + Prettier; `npm run lint` / `npm run format`.
  - Add GitHub Action to lint and optionally deploy static site.
- Phase 3: Rendering perf
  - Offscreen pre‑render for static coins; overlay only animating coins.
  - Spatial grid for coin placement separation (avoid O(N) checks).
- Phase 4: Accessibility
  - Semantic dialog with focus trap, inert background, focus return.
- Phase 5: Hardening
  - Small unit tests for helpers and placement bounds.

## Notes on Image Handling

- Jar and tape images ship embedded as a safe fallback (prior changes here were brittle). On load, the app attempts to swap to cached external assets in `assets/` if they load successfully.
- The coin mask is initialized from an embedded image to guarantee alignment, then upgraded to `assets/jar-mask.png` only if its dimensions match, avoiding past alignment regressions.

## Local Development

- Open `Snarky-Insight-Jar-trimmed-padded.html` directly in a browser.
- Data persists via `localStorage` under key `snarky-jar-entries-v1`.
- Export entries as CSV via the UI.

## Assets

- `assets/jar-inside.png` — jar artwork (external preferred)
- `assets/tape-art.png` — tape overlay (external preferred)
- `assets/jar-mask.png` — alpha mask (upgraded only if dims match)
- `assets/magic_coin.mp3` — coin clink sound

## License

Proprietary — internal use only unless otherwise noted.
