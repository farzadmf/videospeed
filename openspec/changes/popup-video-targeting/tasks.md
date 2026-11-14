# Tasks

Each task ends with `npm run build` passing, then a browser check by the user (reload the extension, then the page). Do not commit a task before the user confirms it in the browser.

## 1. Test pages and transport check

- [x] 1.1 Add `tests/manual/multi-video/` with `index.html` (two videos in the document, one video in an open shadow root, one video inside a scroll container, and an iframe that loads `frame.html` from the other origin), `frame.html` (one video plus a nested iframe), and `nested.html` (one video), all using a sample video generated locally with ffmpeg so the page needs no network, plus two videos created on click (one in the document, one in a shadow root) and a `README.md` that says how to serve it with `npm run serve:multi-video` and open `http://localhost:8000/`, with the iframes pointing at `http://127.0.0.1:8000/` so they are cross-origin. Verify: the page loads and VSC attaches a controller to all eight videos, one of them two frames deep.
- [x] 1.2 Spike D1 with temporary code: the popup opens a broadcast `tabs.connect` port, and each bridge posts a test message with a random token. Verify on the test page: the popup receives messages from the top frame, the cross-origin frame, and the nested frame, and all three receive a message the popup posts. Record the result in `design.md` (keep D1, or switch to the coordinator relay), then remove the spike code.
- [x] 1.3 Measure the throttling and autoplay limits with temporary code: log the real heartbeat interval in a frame scrolled out of view, and call `play()` in a cross-origin frame from a popup command. Verify: the measured interval supports the 5 s frame timeout (tune D2 if not), and the result says whether `play()` resolves or rejects there. Record both in `design.md`, then remove the code.

## 2. Inventory channel

- [x] 2.1 Add the port name and the port message types to `src/shared/constants.js`, and handle the inventory port in `src/entries/content-bridge.js`: forward popup messages to MAIN through `VSC_MESSAGE`, post MAIN's inventory events back on the port, and tell MAIN when the port disconnects. Verify: the build passes and the bridge logs connect and disconnect when the popup opens and closes.
- [x] 2.2 Add an inventory module in MAIN with a per-frame random token. On connect it sends a snapshot of the frame's controlled videos (identity, playing state, speed). It sends again, debounced to about 100 ms, when a controller registers or unregisters or a video's rate or play state changes, and every 1 s as a heartbeat. It stops everything on disconnect. Verify: the popup console shows one snapshot per frame on the test page, and no snapshots after the popup closes.
- [x] 2.3 Update the "Popup ⇄ page messaging" section of `src/AGENTS.md` to describe the inventory port, the frame token, and snapshots. Verify: the section matches the code and `npm run lint` passes.

## 3. In view, labels, and order

- [x] 3.1 Track in view and visible area with an IntersectionObserver against the implicit root (D3), created on connect and removed on disconnect, and include both values in each entry. Verify on the test page: hiding the scroll-container video reports not in view, and scrolling the iframe off the page reports its video not in view.
- [x] 3.2 Derive labels in the D4 order (title or aria-label, then figcaption, then the frame title for a single-video non-top frame). Verify on the test page: each video shows the label its markup provides, and an unlabeled video sends an empty label.
- [x] 3.3 Sort each snapshot in flat-tree document order. Verify on the test page: the shadow-root video appears between the videos around it.

## 4. Popup list and selection

- [x] 4.1 Add an inventory hook in the popup that opens the port, merges snapshots per frame (top frame first, then by first arrival), drops a frame silent for more than 5 s, and fills empty labels with "Video N". Verify: the popup shows eight entries on the test page, and deleting a video in DevTools removes its entry within 1 s.
- [x] 4.2 Show the video list when there are two or more videos, with label, playing state, speed, and an in-view or off-screen tag. With one video, show no list. Verify on the test page and on a single-video page.
- [x] 4.3 Apply the selection-on-open rule once after a 150 ms settle. Keep the selection while the popup is open, and re-run the rule when the selected video goes away. Verify each scenario of "Selection on open" and "Selection is stable while open" on the test page.
- [x] 4.4 Add `j`/`Down` and `k`/`Up` (wrapping) and row clicks to move the selection, and add the keys to `shortcuts.ts` and the help overlay. Verify: the keys move the selection through all eight videos, including off-screen ones, and the help lists them.

- [x] 4.5 Show the video list for a single video too, so the popup looks the same on every page. Verify: YouTube shows a one-row list with that video selected.

## 5. Targeted actions and reveal

- [x] 5.0 Give each `VideoController` a `sessionSpeed` (D13): the speed it starts at, then the last speed a speed action set on it. Make the `play` and `seeked` handlers and the site rate-change restore use it before the site's saved speed, and make `isTemporaryNativeBoost` compare against it. Verify on the test page: with video 1 at 2.0x and video 2 at 1.0x, pausing, playing, rewinding, and advancing video 2 keeps it at 1.0x; a lazy video loaded afterwards starts at 2.0x; after a reload every video starts at 2.0x.

- [x] 5.1 Add a single-video entry point to `ActionHandler` that parses an action the same way `runAction` does, calls `executeAction` for one video, and returns an outcome of `applied`, `refused`, or `unknown-target`, awaiting the `play()` promise so a refusal is reported (D11). Verify: the build passes and the controller's own buttons still work.
- [x] 5.2 Handle targeted commands in MAIN (match the frame token, resolve the video by `controllerId`, call the entry point, post the outcome back), and make the popup send every action as a targeted command instead of a broadcast. Verify on the test page: with the second video selected, `2` sets only that video to 2.0x, and `Space` on an off-screen video toggles it without scrolling.
- [x] 5.3 Show a short message in the popup for any outcome other than `applied`, naming the video, and refresh the list on `unknown-target` (D11). Verify: with video 1 patched to refuse play by the test page button, `Space` on it shows the blocked message, and acting on video 5 after the test page button removes its frame says it is gone and drops it from the list.
- [x] 5.4 Add the reveal message to `src/coordination/` and walk the parent chain (D8), and add `Enter` to `shortcuts.ts` and the help overlay: the video's frame scrolls the video and asks its parent, and each parent resolves the asking child's `<iframe>` by `contentWindow === event.source`, scrolls it, and asks its own parent. Verify on the test page: `Enter` brings an off-screen document video, the cross-origin frame's video, and the two-frames-deep video into view, and the selection does not change.
- [x] 5.5 List videos in page order across frames (D5): each frame gets its place from the parent chain and sends it in its snapshot, and the popup sorts by place plus index. Verify on the test page: after loading the lazy videos, the list reads videos 1 to 4, Child frame video, Nested frame video, then the two lazy videos.

## 6. Flash

- [ ] 6.1 Add the ring element (D9): one per controller, in the video's tree, anchored to the video's anchor name, with its own shadow root and no pointer events, removed with the controller. Verify: the ring covers the video exactly, follows it on scroll, and clicks pass through to the video.
- [ ] 6.2 Add the controller pulse, and run the ring and the pulse with the Web Animations API on one shared 600 ms constant. Show the success flash on an `applied` outcome, when the selection moves, when the popup opens, and once the revealed video is in view (or after 1 s). Verify each action-feedback scenario on the test page, including fast repeated presses and startHidden (ring shows, controller stays hidden).
- [ ] 6.3 Add the failure flash: two ring blips in a warning colour within the same 600 ms (D11), shown on a `refused` outcome. Verify on the test page: press the "Make this video refuse play()" button under video 1, then `Space` on it shows the failure flash, and a screenshot with colour removed still tells it apart from the success flash by its repeat.
- [ ] 6.4 Delete the two dead `video.vsc.div` feedback calls in `src/core/action-handler.js` (D12). Verify: `grep -n "vsc?\.div\|vsc\.div" src/` returns nothing and the build passes.

## 7. Remove the broadcast command path

- [ ] 7.1 Delete `src/ui/popup/` and its three entries in `scripts/build.mjs`, and `testPopupMessageBridge()` in `src/utils/debug-helper.js` (D10). Verify: `npm run build` passes, `dist/ui/popup/` is gone, and the popup still opens from the toolbar.
- [ ] 7.2 Remove `SET_SPEED`, `ADJUST_SPEED`, `RESET_SPEED`, and `RUN_ACTION` from `src/shared/constants.js`, their `inject.js` handlers, and the unused helpers in `chrome-api.ts`, keeping `STATUS`, `TOGGLE_DISPLAY`, and `TEARDOWN`. Verify: `grep -rn "SET_SPEED\|ADJUST_SPEED\|RESET_SPEED\|RUN_ACTION" src/` matches only `src/utils/constants.js` (kept for posterity) and `src/core/action-handler.js`'s own action names, and every popup control still works on the test page.
- [ ] 7.3 Update the "Popup ⇄ page messaging" section of `src/AGENTS.md` to drop the removed types and describe the targeted command path. Verify: the section matches the code and `npm run lint` passes.

## 8. Integration check

- [ ] 8.1 Run the full flow on the test page, on one real page with several videos, and on YouTube (one video). Verify: every spec scenario holds, YouTube shows a one-row list and its popup actions still work, and no inventory traffic runs while the popup is closed.

## Workflow follow-up

- Archive the change after the user confirms 8.1.
- After archiving, delete `docs/leader-to-popup.md`, because the archived specs and design replace it.
