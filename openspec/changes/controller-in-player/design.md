# Design

## Context

`insertIntoDOM` appends the host to the video's tree root; `enableAnchorPositioning` sets `position: fixed` and the anchor styles inline; `inject_new.css` sets `z-index: 9999`. The flash ring is placed the same way. Site handlers' `getControllerPosition` only places `#vsc-spy`. Anchor names are tree-scoped: a host outside a video's shadow root cannot anchor to it.

## Goals / Non-Goals

**Goals:**

- One rule for every site, switchable back to today's placement.
- The ring stacks and clips like the pill.

**Non-Goals:**

- Changing the JS positioning mode or its site rules.
- Clipping by a non-positioned scroll container: CSS does not clip an absolute element there, and VSC does not change page styles.
- Overlays the player adds after placement.

## Decisions

### D1. Player box: walk up while about the video's size

Start at the video's parent. Move up while the ancestor contains the video's rect (2 px tolerance) and is at most 1.5 times its area. Stop at the tree root and at `<body>`. A video with no area uses its parent.

Players wrap video and overlays in a box of the video's size; that box is also what clips and goes fullscreen.

Rejected: the parent only (below YouTube's overlays); the nearest positioned ancestor (often the page layout); site rules.

### D2. Last child, `position: absolute`

As the last child, the host follows the video in tree order, so the anchor resolves. `absolute` keeps it in the page's stacking and clipping; `fixed` escapes clipping. Other anchor styles stay. The ring goes in after the host, the same way. The beacon stays in `body`.

### D3. z-index one above the box's highest

Set the host's and ring's z-index to one above the highest computed z-index inside the box (min 1, max 2147483646). A menu that beats the player's layers then beats the pill.

Rejected: `isolation: isolate` on the box, which changes page styles and can trap the player's layers.

### D4. Slots and a render probe

When the box is an open shadow host, the host copies the `slot` of the box's child on the path to the video. Before inserting, a temporary empty probe at the same place and slot must get a layout box (`getClientRects().length > 0`); otherwise that video uses today's placement. The host itself cannot be measured: `vsc-nosource` makes it `display: none`.

### D5. Re-place on view

The in-view callback re-runs placement when the host is disconnected and the video is not.

### D6. Option

`controllerInPlayer`, default `true`, read at load. It shipped off in the plan; it passed the test page, a site whose menu covered the pill, and YouTube, so it is on. Shown under **Anchor positioning**, disabled while that is off.

## Risks / Trade-offs

- [A framework re-render drops the host] → D5 puts it back on the next view.
- [The size rule picks a box with a caption] → The pill still anchors to the video; only stacking scope grows.
- [Reading z-index for every element in the box] → Tens of elements, once per video.

## Migration Plan

On by default; toggling takes effect on the next page load.
