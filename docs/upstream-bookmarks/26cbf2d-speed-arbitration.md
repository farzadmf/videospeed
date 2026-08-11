# Upstream Speed-Arbitration Refactor — 26cbf2d (series)

Upstream Wave 0: https://github.com/igrigorik/videospeed/commit/26cbf2d
Merged upstream: https://github.com/igrigorik/videospeed/commit/87cc6d2

## Why bookmarked

Upstream replaced its speed-conflict handling with a formal state machine (`SpeedArbiter`: modes NO_OPINION / HOLDING / SURRENDERED, an intent classifier, a TLA+ spec). We skipped the whole series — our fork deliberately removed the fight-back/cooldown/surrender model it plugs into (see `handleRateChange` in `src/utils/event-manager.js`). Kept as prior art in case our passive "re-restore saved speed on external ratechange" model ever fails on an aggressive site.

## Bug fixes riding on the series

If revisited, evaluate each on its own and port the fix into our model, not the arbiter: #1537 (native speed-menu change undone on play), #1494 (lifecycle restore corrupting remembered speed), YouTube spacebar-hold 2x regression, per-site "hold for 2x" scoping.
