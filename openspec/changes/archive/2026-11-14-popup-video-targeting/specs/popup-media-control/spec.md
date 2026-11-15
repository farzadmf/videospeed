# Spec Delta

## Purpose

Lets the user see the page's videos in the popup, choose one, and send popup actions to that video only, including videos the user cannot currently see.

## ADDED Requirements

### Requirement: Video list

When the page has one or more controlled videos, the popup SHALL show one row per video in a stable order, with the label, playing state, speed, and an in-view or off-screen tag. Rows SHALL follow page order, across frames too: a frame's videos list where the frame sits among the page's videos. A single video SHALL get the list too, so the popup looks the same on every page.

#### Scenario: Three videos

- **GIVEN** a page with three controlled videos, two of them in view
- **WHEN** the popup opens
- **THEN** it shows three rows, two tagged in view and one tagged off-screen

#### Scenario: Frame between videos

- **GIVEN** a page with a video, then a frame with a video, then another video
- **WHEN** the popup opens
- **THEN** the frame's video is the second row

#### Scenario: One video

- **GIVEN** a page with one controlled video
- **WHEN** the popup opens
- **THEN** it shows a list with that one video, selected, and its actions reach that video

### Requirement: Selection on open

Each time the popup opens, it SHALL select one video: a playing video in view, else the video in view with the largest visible area, else the first video in the list. When several playing videos are in view, the one with the largest visible area SHALL win.

#### Scenario: Playing video in view

- **GIVEN** two videos in view and only the second is playing
- **WHEN** the popup opens
- **THEN** the second video is selected

#### Scenario: Nothing playing

- **GIVEN** two videos in view, none playing, and the first more visible
- **WHEN** the popup opens
- **THEN** the first video is selected

#### Scenario: Nothing in view

- **GIVEN** three videos, none in view
- **WHEN** the popup opens
- **THEN** the first video in the list is selected

### Requirement: Selection is stable while open

While the popup is open, the selection SHALL change only by user action. Scrolling, playback changes, and in-view changes SHALL NOT move it. If the selected video goes away, the popup SHALL select a video again by the selection-on-open rule.

#### Scenario: Page scrolls

- **GIVEN** the popup is open with a video selected
- **WHEN** the selected video scrolls out of view
- **THEN** the selection does not change

#### Scenario: Selected video removed

- **GIVEN** the popup is open with a video selected
- **WHEN** the page removes that video
- **THEN** the popup selects another video by the selection-on-open rule

### Requirement: Move the selection

The user SHALL be able to move the selection to the next video with `j` or `Down` and to the previous video with `k` or `Up`, wrapping at both ends, and to any video by clicking its row. Off-screen videos SHALL be selectable.

#### Scenario: Next wraps

- **GIVEN** three videos and the last one selected
- **WHEN** the user presses `j`
- **THEN** the first video is selected

#### Scenario: Select an off-screen video

- **GIVEN** an off-screen video in the list
- **WHEN** the user clicks its row
- **THEN** that video is selected

### Requirement: Actions reach the selected video only

Every popup action (set speed, slower, faster, play/pause, rewind, advance) SHALL apply to the selected video only, whether or not it is in view. No other video SHALL change.

#### Scenario: Set speed with two videos

- **GIVEN** two videos at 1.0x and the second selected
- **WHEN** the user presses `2`
- **THEN** the second video plays at 2.0x and the first stays at 1.0x

#### Scenario: Action on an off-screen video

- **GIVEN** an off-screen video selected
- **WHEN** the user presses `Space`
- **THEN** that video toggles play/pause and the page does not scroll

### Requirement: Bring the selected video into view

When the user presses `Enter`, the page SHALL scroll so that the selected video is in view, wherever it lives. The selection SHALL NOT change.

#### Scenario: Reveal an off-screen video

- **GIVEN** an off-screen video selected
- **WHEN** the user presses `Enter`
- **THEN** the page scrolls until that video is in view

#### Scenario: Reveal a video in a frame

- **GIVEN** a selected video inside a frame that is off-screen
- **WHEN** the user presses `Enter`
- **THEN** the page scrolls until that video is in the top-level viewport

#### Scenario: Reveal a video in a nested frame

- **GIVEN** a selected video inside a cross-origin frame that is itself inside another off-screen frame
- **WHEN** the user presses `Enter`
- **THEN** every frame between the video and the top page scrolls until the video is in the top-level viewport

### Requirement: Report an action the browser refuses

When the browser refuses an action, the popup SHALL say so and name the video. The video SHALL NOT report the action as applied.

#### Scenario: Play refused in a frame

- **GIVEN** a selected video in a frame where the browser's autoplay policy refuses playback
- **WHEN** the user presses `Space`
- **THEN** the popup says the browser blocked the action for that video

### Requirement: Help lists the selection keys

The popup help overlay SHALL list the selection keys (`j`/`k`, `Down`/`Up`) and `Enter`.

#### Scenario: Open help

- **WHEN** the user opens the popup help
- **THEN** it lists `j`/`k`, `Down`/`Up`, and `Enter` with what they do
