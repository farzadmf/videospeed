# Proposal

## Why

When a page has more than one video, a popup action does not reach a predictable video. The popup sends each command to every frame, and in each document `runAction` applies it only to the first controlled video. The user cannot see which videos exist, cannot choose one, and gets no sign that an action landed. The popup already owns the keyboard (see `docs/leader-to-popup.md`), so it is the right place to choose the target.

## What Changes

- The page reports its videos to the popup while the popup is open: one entry per controlled video, wherever the video lives (the main document, shadow DOM, or a same-origin or cross-origin frame at any depth). Each entry carries a label, playback state, speed, and whether the user can see it in the top-level viewport. The list updates when videos appear, go away, or move in or out of view.
- The popup shows the list whenever the page has a video, one or more, so it looks the same on every page. When the popup opens, it selects one video by a fixed rule: a playing video in view, else the most visible video in view, else the first video on the page. The selection does not follow scrolling while the popup is open.
- The user moves the selection with `j`/`k` and `Down`/`Up`, or by clicking a row. All videos are selectable, including off-screen ones.
- Every popup action (speed keys, slower/faster, play/pause, rewind/advance) goes to the selected video only. Actions on off-screen videos apply directly.
- `Enter` scrolls the selected video into view.
- A video shows a short visual flash when it receives a popup action, when it becomes selected, and when `Enter` brings it into view. The flash is a ring around the video plus a pulse on the controller, on one shared timeline. An action the browser refuses shows a different flash, which repeats within the same duration so it is told apart without relying on colour, and the popup says it was blocked.
- Each video keeps its own speed for the rest of the page visit. Play, pause, seek, rewind, advance, and a rate change the site makes all restore that video's own last speed instead of the site's saved speed. A speed action still saves the site's speed, which a reload and any video that loads later start at.
- **BREAKING**: popup actions no longer reach every frame. They go to one video.
- **BREAKING**: the broadcast command types (`SET_SPEED`, `ADJUST_SPEED`, `RESET_SPEED`, `RUN_ACTION`) are removed, with the pre-React popup (`src/ui/popup/`) and the broken `testPopupMessageBridge()` debug method that were their only other senders. The manifest opens the React popup, so the old one is unreachable today.

## Capabilities

### New Capabilities

- `media-inventory`: what the page reports about its controlled videos (identity, label, state, in-view status) and how it keeps that report current while the popup is open.
- `popup-media-control`: how the popup presents the videos, picks and moves the selection, routes actions to the selected video, and brings a video into view.
- `action-feedback`: the visual flash a video shows when a popup action or selection reaches it.
- `speed-memory`: which speed a video starts at and keeps during a page visit, and what a speed action saves for the site.

### Modified Capabilities

None. The project has no existing specs.

## Impact

- **Popup** (`src/ui/popup-react/`): new video list, selection state, new keys in `shortcuts.ts` and the help overlay, and targeted command calls in `chrome-api.ts`.
- **Messaging** (`src/entries/content-bridge.js`, `src/content/inject.js`, `src/shared/constants.js`): a channel from the popup to every frame that carries the inventory up and targeted commands down. `STATUS` stays for the availability states, and so do `TOGGLE_DISPLAY` and `TEARDOWN`.
- **Page side** (`src/core/`, `src/ui/`): per-video in-view tracking against the top-level viewport, a label for each video, a targeted action entry point that bypasses `runAction`'s first-match loop and reports its outcome, and the flash overlay and pulse.
- **Speed memory** (`src/core/video-controller.js`, `src/core/action-handler.js`, `src/utils/event-manager.js`): a per-video session speed, which the play and seek handlers and the site rate-change restore use in place of the site's saved speed. This affects every page, not only popup use.
- **Cross-frame** (`src/coordination/`): a message that walks the parent chain so each frame scrolls the next one into view, which is how a video in a nested or cross-origin frame is revealed.
- **Removals**: `src/ui/popup/` and its three `scripts/build.mjs` entries, `testPopupMessageBridge()` in `src/utils/debug-helper.js`, the four broadcast message types, and the two dead `video.vsc.div` feedback calls in `src/core/action-handler.js`.
- **Docs**: `docs/leader-to-popup.md` describes the unbuilt command protocol this change supersedes. Delete it when the change is archived.
- **Permissions**: none added.
- **Mock**: `mock/targeting-mock.html` in this change shows the agreed interaction.
