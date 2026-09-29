# Upstream Speed-Arbitration Refactor — 26cbf2d (series)

Upstream Wave 0: https://github.com/igrigorik/videospeed/commit/26cbf2d Merged upstream: https://github.com/igrigorik/videospeed/commit/87cc6d2

## Why bookmarked

Upstream replaced its speed-conflict handling with a formal state machine (`SpeedArbiter`: modes NO_OPINION / HOLDING / SURRENDERED, an intent classifier, a TLA+ spec). We skipped the whole series — our fork deliberately removed the fight-back/cooldown/surrender model it plugs into (see `handleRateChange` in `src/utils/event-manager.js`). Kept as prior art in case our passive "re-restore saved speed on external ratechange" model ever fails on an aggressive site.

## Bug fixes riding on the series

YouTube press-and-hold 2x (b530cf4, d86b7b4) is ported into our model (`isTemporaryNativeBoost` in `event-manager.js`). Not ported, because they need adopting external speed changes: #1537 (native speed-menu change undone on play), native "Normal" menu choice (39f6b33).

## Known risk: endless revert

We restore the saved speed on every external ratechange, with no limit. A player that snaps VSC's rate to its own steps (upstream #1606, fixed in 6786db8) would snap again after each restore, looping forever: stutter and CPU use. Upstream bounds this with a fight budget and surrender (the code commented out in `handleRateChange`). If a site stutters, start there: a per-video revert limit.
