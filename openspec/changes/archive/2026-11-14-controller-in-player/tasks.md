# Tasks

## 1. Option

- [x] 1.1 Add `controllerInPlayer` (default `true`) to defaults and config (D6). Verify: the build passes.
- [x] 1.2 Add the checkbox under "Anchor positioning", disabled while that is off. Verify: it saves and greys out.

## 2. Placement

- [x] 2.1 Add the player-box, slot, and probe module under `src/ui/` (D1, D4). Verify: the debug log names a box for each test-page video; video 3's is inside its shadow root.
- [x] 2.2 With the option on, insert the host per D2–D4, with the fallback. Verify: pills sit as before on the test page; option off changes nothing.
- [x] 2.3 Place the ring the same way (D2). Verify: it covers the video and follows scroll.
- [x] 2.4 Give the test page's `.scroller` `position: relative`, and note why in its README. Verify: with the option on, video 4's pill clips with the box.

## 3. Page changes

- [x] 3.1 Re-place on view when the host is gone (D5). Verify: remove `vsc-controller` in the console, scroll away and back, and the pill returns.

## 4. Real pages

- [x] 4.1 The page whose menu covered the pill: the menu covers it now, and the pill's buttons work.
- [x] 4.2 YouTube watch and Shorts: the pill shows above the controls, takes clicks, autohides, and shows in fullscreen.
- [x] 4.3 A custom-element player (such as `media-chrome`): the pill shows. If none is at hand, record the slot path as untested. Untested: no custom-element player was at hand.

## Workflow follow-up

- Archive after section 4 passes.
