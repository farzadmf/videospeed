# Design

## Context

See `proposal.md` for the motivation and the `specs/` files for the required behavior. `mock/targeting-mock.html` shows the agreed interaction.

Current state that shapes the approach:

- The popup (React, its own document) owns the keyboard. It sends commands with `chrome.tabs.sendMessage(tabId, msg)` and no `frameId`, so every frame receives them (`ui/popup-react/chrome-api.ts`).
- Each frame runs the ISOLATED bridge (`entries/content-bridge.js`, which has `chrome.*`) and the MAIN script (`content/inject.js`, which does not). They talk through `VSC_MESSAGE` CustomEvents on `document.documentElement`. Only `STATUS` has a reply path today: the top frame answers through `VSC_STATUS_REPLY`.
- `runAction` (`core/action-handler.js`) loops over the frame's controlled videos with `.some()` and stops at the first video that handles the action.
- Every controlled video has a `VideoController` with a `controllerId` and an `anchor-name` (`--vsc-anchor-N`). The controller host shares the video's tree scope (shadow root or document body).
- The manifest has only the `storage` permission.
- `action-handler.js` has two feedback calls that read `video.vsc.div`, which does not exist (the property is `wrapperDiv`), so they never run.

## Goals / Non-Goals

**Goals:**

- One channel between the popup and every frame of the tab, open only while the popup is open.
- Each frame reports its own videos. The popup merges the reports and owns the selection.
- Targeted commands reach one video in one frame.
- The flash is independent of the controller's visibility.

**Non-Goals:**

- Changing `STATUS` or the availability states (probing, unreachable, disabled, no-video, active).
- The leader settings (`leaderKey`, `leaderExit`, `leaderTimeout`) and their options UI. That is Phase 3 of `docs/leader-to-popup.md` and stays separate.
- Changing how `runAction` serves the controller's own buttons.
- Matching the visual page order of videos across frames (see Risks).

## Decisions

### D1. Transport: one broadcast port from the popup to all frames

The popup opens a port with `chrome.tabs.connect(tabId, { name: 'vsc-inventory' })` and no `frameId`. Chrome then connects that port to every frame in the tab. Each frame's bridge receives it in `chrome.runtime.onConnect`. Messages a frame posts arrive on the popup's single port, and a message the popup posts reaches every frame.

```
popup --- tabs.connect(tabId) ---> bridge (frame A) <-- CustomEvents --> MAIN (frame A)
      |                       +--> bridge (frame B) <-- CustomEvents --> MAIN (frame B)
      |                       +--> bridge (frame C) <-- CustomEvents --> MAIN (frame C)
      v
 inventory snapshots up, targeted commands down (each frame ignores other frames' targets)
```

- When the popup closes, each frame's port end disconnects. That is the signal to stop reporting (spec: no reporting while closed).
- No permission is added, and the background service worker is not involved.
- A frame cannot know its Chrome `frameId`, so each frame generates a random frame token once. A video's identity is `<frameToken>:<controllerId>`.

Measured by the task 1.2 spike on `tests/manual/multi-video`, with a top frame, a cross-origin child, and a cross-origin frame inside that child:

- One `tabs.connect` with no `frameId` reaches all three frames, and all three receive a single `port.postMessage` from the popup.
- All three frames' messages arrive on the popup's one port.
- Closing the popup fires `onDisconnect` in every frame.
- A token generated once per frame load stays the same across popup open and close cycles.

So D1 holds and the coordinator relay is not needed.

Alternatives considered:

- **Background aggregator**: frames send reports to the service worker (`sender.frameId`), and the popup reads them. This needs per-tab state that survives service worker suspension (`chrome.storage.session`), and reports run even while the popup is closed. Rejected: more moving parts and constant work.
- **Popup addresses frames by `frameId`**: needs `chrome.webNavigation.getAllFrames`, which adds the `webNavigation` permission and its install warning. Rejected.
- **Relay through the top-frame coordinator** (`coordination/frame-coordinator.js`, over `postMessage`): no permission, and the coordinator already keeps a registry of frames. Kept as the fallback if D1 fails its verification task, because it routes every command through an extra hop and each frame level.

### D2. Snapshots, not deltas

Each frame sends a full snapshot of its own videos: `{ frameToken, isTop, entries: [...] }`. It sends one when the port connects, again (debounced to about 100 ms) when any entry changes, and every 1 s as a heartbeat. The popup keeps the latest snapshot per frame and drops a frame that is silent for more than 5 s.

The timeout is 5 s rather than a tight multiple of the heartbeat so that a late heartbeat cannot drop a live frame. Removing a live frame's videos from the list is worse than showing a dead frame's videos for a few seconds longer.

The task 1.3 spike measured a 1 s timer in cross-origin frames scrolled out of the top-level viewport, in a visible tab: gaps ran 999 ms to 1593 ms. Chrome did not throttle them, so 5 s has a wide margin. A hidden tab is throttled harder, but the popup only ever talks to the active tab.

- A frame has few videos, so a full snapshot is small. It also removes ordering and lost-message problems.
- The heartbeat handles frames that the page removes. A removed frame cannot always send a final empty snapshot, and the shared port gives the popup no per-frame disconnect event.

### D3. In-view tracking with an IntersectionObserver against the implicit root

While the port is open, each frame observes its controlled videos with an IntersectionObserver with `root: null` and thresholds such as `[0, 0.1, 0.25, 0.5, 0.75, 1]`. With the implicit root, the browser computes the intersection with the top-level viewport and applies the clipping of ancestor scroll containers and frames, cross-origin ones too. That is the spec's definition of in view.

The task 1.3 spike confirmed this from inside a cross-origin frame, and from one nested inside another: scrolling the top page flipped each frame's own `isIntersecting` as expected. A frame therefore learns its top-level visibility without help from its ancestors.

- In view means `intersectionRatio >= 0.1`. The visible area is `intersectionRect.width * intersectionRect.height`.
- The observer is separate from the existing one in `VideoController` (threshold 0.1, which drives positioning listeners), so the two cannot interfere. It exists only while the popup is open.

### D4. Labels

A frame derives each label in this order: the video's `title` or `aria-label`, then a `figcaption` of an enclosing `figure`, then the frame's `document.title` when the frame is not the top frame and has exactly one video. The popup assigns the positional fallback ("Video N") from the merged list, because only the popup knows a video's position across frames.

### D5. Order

Rows follow page order across frames. Each frame learns its place from the parent chain (`coordination/frame-place.js`), the same way reveal walks it (D8): a frame asks its parent, the parent finds the asking `<iframe>` by `contentWindow === event.source`, adds the count of its own videos before that `<iframe>` minus 0.5, which sits between the indexes of the videos around it, and passes the request up. The top frame sends the path back down. A video's sort key is its frame's place plus its index in the frame, compared number by number, so a frame after the top frame's fourth video lists between the fourth and the fifth.

The frame sends its place in each snapshot and asks again on each heartbeat, since a video added above it moves it. Within a frame, entries follow document order across shadow roots (flat-tree order).

A frame whose parent chain does not answer has no place. Its rows go last, sorted by frame URL, then by index. The sort key is never arrival order: the task 1.2 spike saw the top frame answer last of three, so arrival order varies per popup open and would move the `j` and `k` positions between opens.

A same-origin frame that the top frame scans holds no controllers of its own, so a cross-origin frame inside it gets the count 0 at that level. Its rows still sort after the videos before the same-origin frame.

### D6. Selection lives in the popup

The popup waits a short settle time after connecting (about 150 ms) so that the first snapshots arrive, then applies the selection-on-open rule once. After that, the selection changes only by `j`/`k`, `Down`/`Up`, a row click, or the selected video going away. With one video, the list has one row and the selection is that video.

### D7. Targeted commands

The popup posts `{ type: 'command', target, action }` or `{ type: 'flash', target }` on the port. Reveal is a command with the action `reveal`, so it gets the same outcome and no-answer timeout as the other actions. Every bridge forwards it to its MAIN script, and MAIN ignores any `target` whose frame token is not its own.

On a match, MAIN resolves the video by `controllerId` through the state manager and calls a new single-video entry point on `ActionHandler`. It parses the action the same way `runAction` does, then calls `executeAction` for that one video only. `runAction` and its `.some()` loop stay unchanged for the controller's own buttons.

### D8. Reveal walks the parent chain

Each frame reveals only what it can reach: its own element, and the `<iframe>` element of the child frame that asked.

```
video frame:   scrollIntoView(video) in its own document
      |        postMessage('reveal-me') to window.parent
      v
parent frame:  find the <iframe> whose contentWindow === event.source
      |        scrollIntoView(thatIframe)
      |        postMessage('reveal-me') to its own parent
      v
...             repeat until the top frame, which has no parent
```

This works at any depth and across origins, because `contentWindow === event.source` identifies the child frame element without reading into it. The message rides the existing coordinator transport (`coordination/messages.js`), with a new type, so it reuses the tag and parsing.

When the in-view observer reports the video in view (or after 1 s), the video's frame flashes it.

Alternatives considered:

- **`scrollIntoView` alone in the video's frame**: the simplest option, and it may already scroll ancestor frames. Rejected as the primary path because it is not guaranteed across origins, and the popup keypress is not a user gesture in that frame. Task 1.2 measures it; if it works everywhere we test, the parent chain still stays, since it costs one message per level and removes the doubt.
- **The top-frame coordinator scrolls the frames**: the coordinator is a flat star, so the top frame knows every frame but not the parent of each. Only a direct parent can resolve a child's `<iframe>` element. Rejected.

### D9. Flash

- **Ring:** a separate custom element per video (for example `vsc-flash`), inserted in the same tree as the video, the same way the controller host is. It is anchored to the video's existing anchor name with `position: fixed`, `position-anchor`, and all four insets set to `anchor(...)`. That sizes it to the video and makes it follow scrolling with no JS. It has its own shadow root with `:host { all: initial }`, `pointer-events: none`, and `position-visibility: anchors-visible`.
- **Pulse:** an animation on the controller's pill inside the controller's shadow root.
- **Timing:** both use the Web Animations API (`element.animate`) with one shared duration constant (600 ms). Starting a new animation cancels the previous one, which gives the spec's restart behavior and keeps the two in step. The success flash fades once over that duration; the failure flash (D11) blips twice within the same duration.
- The ring element is separate from the controller host, so a hidden controller (startHidden) keeps the ring visible and the controller hidden.

Alternatives considered:

- **A ring inside the controller's shadow root, anchored to the video:** it is not certain that a name defined in the outer tree resolves from inside our shadow tree. The separate host uses a pattern the controller already proves.
- **`outline` on the video element:** it changes a page element's styles, which page frameworks observe, and a scroll container can clip it.

### D10. Delete the broadcast command path

Once the popup sends targeted commands, nothing needs `SET_SPEED`, `ADJUST_SPEED`, `RESET_SPEED`, or `RUN_ACTION`. Their only other senders are dead:

- `src/ui/popup/` is the pre-React popup. `scripts/build.mjs` still builds it, but the manifest's `default_popup` is the React popup, so it never opens.
- `debug-helper.js`'s `testPopupMessageBridge()` is a console test that is already broken: it dispatches `VSC_MESSAGE` on `window`, while `inject.js` listens on `document.documentElement`.

So this change deletes the old popup and its three build entries, that debug method, the four message types, and their `inject.js` handlers. One command path is left, which is what the popup's single round-trip model needs. Keeping them would leave a second, untargeted way to change speed that no caller uses.

`TOGGLE_DISPLAY` goes too: it had a handler but no sender, and the `display` key binding runs the same action. `TEARDOWN` stays: the bridge sends it when the site is disabled.

### D11. Report a refused action on the page and in the popup

`executeAction` cannot assume success: `play()` returns a promise the autoplay policy can reject. The targeted entry point returns an outcome (`applied`, `refused`, or `unknown-target`), and MAIN posts it back on the port.

The task 1.3 spike could not provoke a rejection: `play()` resolved in every frame, including a cross-origin frame with no `allow="autoplay"`, because Chrome is permissive for a page the user has engaged with. A rejection still happens in the wild, and `unknown-target` happens whenever a video goes away between the key press and the command, so the outcome is still needed. To keep the refused path testable, `tests/manual/multi-video` has a button that patches one video's `play` to reject with `NotAllowedError`.

Feedback follows the outcome, and a failure is never silent:

| Outcome | On the page | In the popup |
| --- | --- | --- |
| `applied` | success flash: one smooth ring fade plus the controller pulse, in the accent colour | nothing |
| `refused` | failure flash: two short ring blips in a warning colour | "The browser blocked <action> for <label>" |
| `unknown-target` | nothing, since no video received it | "<label> is gone", and the list refreshes |

The two flashes differ by repeat count, not only colour, so they are distinguishable in greyscale and for a colour-blind user. They share the same duration constant, so the page never shows two feedback lengths.

Alternatives considered:

- **No flash on failure, popup text only**: the user may be looking at the video, not the popup, so the action would appear to do nothing. Rejected.
- **Same flash for both, popup text carries the difference**: a flash would stop meaning "it worked". Rejected.

### D12. Remove the dead `.div` feedback

The two `video.vsc.div` calls in `action-handler.js` (show the controller on speed change, and blink it) never run. Fixing them would make hidden controllers visible on every speed change, which the action-feedback spec forbids for popup actions. The flash (D9) replaces them, so this change deletes them.

### D13. Per-video session speed

VSC saves one speed per website (`getBaseURL()` returns `location.hostname`, because CDN video URLs are unstable). Two paths write that saved speed back onto a video that is already playing:

- The `play` and `seeked` handlers in `VideoController` call `getTargetSpeed()`, which reads the site's speed.
- A rate change the site makes goes through `adjustSpeed` with `source: 'external'`, which also takes the site's speed.

With one video per page that was harmless. With several, setting one video to 2.0x then pausing another snaps the second to 2.0x as well.

Each `VideoController` gets a `sessionSpeed`: the speed it started at, then the last speed a speed action set on it. Both paths restore `sessionSpeed` when it is set and fall back to the site's speed when it is not. Starting a video still reads the site's speed, so a reload and a video that loads later both pick up the latest saved value, and a speed action still saves to the site through `config.syncSpeedValue`.

The fight-back stays, because sites do reset the rate (that is why it exists); it now defends the video's own speed.

The YouTube press-and-hold check (`isTemporaryNativeBoost` in `event-manager.js`) accepts a rate above the site's speed during a gesture. It must compare with the video's session speed instead. Otherwise a video at 1.0x on a site saved at 2.0x has YouTube's 2.0x hold rejected (2.0 is not above 2.0), and the fight-back snaps it back to 1.0x.

Alternatives considered:

- **Stop saving popup speeds on multi-video pages**: keeps today's restore paths, but a reload forgets the speed the user just chose. Rejected by the user in favor of this.
- **Save per video**: needs a stable per-video key, and the per-site key exists because video URLs are not stable. Rejected.

## Risks / Trade-offs

- [A broadcast `tabs.connect` might not reach every frame, or might not deliver every frame's messages to the popup] -> The first task verifies D1 on a page with a cross-origin frame. If it fails, use the coordinator relay (D1 alternative).
- [Chrome throttles off-screen and hidden frames, so heartbeats and the in-view observer in them run late] -> The 5 s timeout (D2) absorbs it. Task 1.2 measures the real heartbeat interval in a scrolled-away cross-origin frame and tunes the timeout. An off-screen frame is also the least urgent to report.
- [The browser refuses `play()` in a frame, because the popup keypress is not a gesture in that frame] -> D11 reports the outcome and the popup says the action was blocked. The user can press `Enter` and click the video, which is the only way the browser accepts.
- [Order across frames may not match the visual page order] -> D5 keeps the order stable, which the spec requires. Visual order needs frame offsets from the coordinator and can come later.
- [A removed frame stays in the list for up to 5 s] -> The removal of a video inside a live frame still reports at once. Only whole-frame removal waits for the heartbeat timeout. A command sent in that window gets "Video is no longer on the page". If this becomes a problem, each frame can open its own `chrome.runtime.connect` port back to the popup on INVENTORY_START. The popup then gets `onDisconnect` for that frame when it unloads, and `port.sender.frameId` lets commands go to one frame. Not done: the case is rare and the cost is about 1 hour.
- [Deleting the broadcast types removes the only speed path the old popup had] -> That popup is unreachable (D10), so nothing regresses. The React popup is the only popup the manifest opens.
- [Heartbeats every 1 s from every frame while the popup is open] -> They stop when the popup closes, and the snapshots are small.
- [The popup moves off the broadcast path, so a frame with no controlled video ignores popup actions] -> This is the intended **BREAKING** change in the proposal.

## Migration Plan

No data migration. The change ships in one extension update. Rollback is reverting the change: the broadcast handlers stay in place, so a reverted popup works with no other change.

## Open Questions

- The exact flash duration within the spec's 400 ms to 800 ms range. Start at 600 ms and tune in the browser.
