# src — agent guide

Durable conventions and architecture for working in `src/`. Read before editing. Complements the root `AGENTS.md` (project overview, upstream-sync rules) and `docs/coding-style.md` (blank-line paragraphs, comment policy).

## Working agreements

Standing rules from the repo owner. Not optional.

- **Never commit before the user has tested.** Loop: implement one small thing → user verifies in the browser → user approves → then commit. A green build is not verification; shadow-DOM styling, cross-world messaging, and popup behavior only show on a real reload. Don't batch-commit queued work on your own.
- **Review before commit; verify before commit when behavior is in doubt.** Per unit of work: write the code, review it, fix what the review finds, review again if the fixes were substantial, then commit. When the work needs a browser check, do not commit the first attempt and then stack fixes on top of it — hold the work uncommitted until the behavior is confirmed, then make one small commit. Keep commits small and incremental either way.
- **Never dismiss an issue as "not my problem."** Any diagnostic, warning, or edge case that surfaces while you work is in scope by default. Fix it, or give the concrete reason it is safe/out of scope and let the user decide. No hand-waving ("pre-existing", "unrelated").
- **Comments explain the non-obvious why only.** Never narrate what the code plainly does; a comment earns its place by explaining a constraint, gotcha, or a why the code can't express. Don't sell or praise the code — state the constraint plainly; a comment that reads like ad copy is noise even when it's technically a why. Default to fewer. Re-read every comment you add and delete what a competent reader wouldn't need.
- **Alphabetize object fields, project-wide.** Object literals, TS type/interface members, destructured props, and JSX props sorted A→Z — including pre-existing code you touch. Exception: React's `key` may stay first. Not enforced by lint; do it manually.
- **Readability over cleverness.** Prefer `async/await` with an explicit guard over terse `.then(x => cond && f(x))`. Prefer a plain `if` the reader can scan.
- **Group commits by concern.** Split unrelated changes into separate commits (hunk-level staging when one file spans concerns). Conventional format; message states the what(s) and short why(s), never reiterating the diff.

## Build

- **One command: `npm run build`.** Runs `npm run lint` (eslint, `tsc --noEmit`, prettier), then `scripts/build.mjs` (esbuild: content + background), then `npm run build:react` (Vite: popup + options). Don't run the sub-steps or `tsc`/`eslint`/`prettier` by hand — if a check is missing from the scripts, add it there.
- Vite itself does not typecheck, which is why `lint:types` runs `tsc --noEmit` in the chain.
- Shadow-DOM CSS (`styles/shadow_new.css`, `coordination/*.css`) is inlined as a string by the `css-as-text` esbuild plugin, not shipped as a file. `styles/inject_new.css` stays a compiled entry (manifest injects it). The esbuild watcher self-restarts when `scripts/build.mjs` changes.
- Don't use heredocs in Bash — they hang this environment. For a multi-line git message, write a temp file (`/tmp/...`), `git commit -F` it, delete it. Never write into `.git/`.

## Architecture

Two build systems produce one `dist/`:

- **Vanilla JS** (esbuild) — content script + background. Entry `entries/inject-entry.js` → `content/inject.js` (bootstrap) → `content/video-speed-extension.js` (the `VideoSpeedExtension` class).
- **React** (Vite, `vite.react.config.ts`) — popup (`ui/popup-react/`) and options (`ui/options-react/`) → `dist/ui-react/`. React 19 + Tailwind 4 + daisyUI 5 + TS. (`src-react/` + `manifest-react.json` are a dead experimental tree; ignore unless told otherwise.)

Chrome MV3 worlds:

- **Service worker** — `background.js`.
- **ISOLATED** — `entries/content-bridge.js`, `content/injection-bridge.js`. Has `chrome.*`; `document_start`. Bridges to MAIN via `VSC_MESSAGE` CustomEvents on `document.documentElement`.
- **MAIN** — `content/inject.js` + `content/video-speed-extension.js`. No `chrome.*`; `document_idle`.

Keyboard control lives in the **popup** (its own document), not on the page. On-page global key capture is unreliable — another extension can register a capture listener first and Chrome has no listener-priority API — so don't build page-level keyboard capture; put key interaction in the popup.

### Popup ⇄ page messaging (`ui/popup-react/chrome-api.ts`)

- Commands via `chrome.tabs.sendMessage`; types in `shared/constants.js` (`MESSAGE_TYPES`).
- Playback toggling uses `runAction('pause')` — the `pause` action toggles (plays if paused); there is intentionally no separate PLAY/PAUSE.
- **Request/reply (STATUS probe):** `sendMessage` broadcasts to every frame (`all_frames`). Only the top frame answers (bridge checks `window === top`), reporting the coordinator's hub-wide total, not a per-frame count. The bridge `return true`s to keep the channel open for the async `VSC_STATUS_REPLY`.
- Popup probes availability on open and polls while open (it remounts each open). States: probing / unreachable / disabled / no-video / active.
- **Inventory port (per-video state):** the popup opens one port with `chrome.tabs.connect(tabId, { name: INVENTORY_PORT })` and no `frameId`. Chrome connects it to every frame, including cross-origin and nested ones, and every frame's messages arrive on the popup's one port. Each bridge forwards the start to MAIN, and `core/media-inventory.js` sends a whole snapshot of that frame's videos on connect, on change (debounced 100 ms), and every 1 s as a heartbeat. Closing the popup disconnects every frame, which stops all reporting, so nothing runs while the popup is closed.
- **Video identity:** `<frameToken>:<controllerId>`. A frame cannot read its Chrome `frameId`, so each frame generates a random token once per load.
- **Late frames:** a popup opened while a frame is loading sends its start before MAIN listens. The bridge replays the start at the settings handshake, since MAIN asks for settings only once it listens.

### Cross-frame coordinator (`coordination/`)

A registry: each frame announces its controller count to the top-frame hub (HELLO/CONTROLLERS over `window.postMessage`). Used to compute totals.

## Popup keyboard shortcuts (`ui/popup-react/`)

Uses `@tanstack/react-hotkeys` (pinned exact; treat as 0.x alpha — isolate usage). Key facts that bite:

- **Exact modifier matching**: bare `{ key: '1' }` does NOT fire while Shift is held. Bind a separate hotkey for the shifted variant.
- The TS type excludes `Shift+<number>`/`Shift+<punct>` (layout-dependent) but the runtime supports them via the object form `{ key: '1', shift: true }` — use that.
- "Shift held" for UI uses `useHeldKeys()` checked to be exactly `['Shift']`, so combos don't trigger the shifted UI.
- `shortcuts.ts` is the single source of truth for bindings (the seam for reading from settings later); `HotkeyButton` is the shared click-or-hotkey button; help labels use `formatForDisplay`.

## Tests

Upstream tests don't run here (see root `AGENTS.md`); there is no working suite. Verify by building and reloading the extension in the browser.
