# action-feedback Specification

## Purpose

Shows the user which video a popup action or selection reached, with a flash that is easy to see but does not get in the way of the video.

## Requirements

### Requirement: Flash on popup action

When a video receives a popup action, it SHALL flash once. Only that video SHALL flash.

#### Scenario: Speed change

- **GIVEN** two videos and the second selected
- **WHEN** the user presses `=`
- **THEN** the second video flashes and the first does not

### Requirement: Failure flash when the action does not apply

When the browser refuses an action, the video SHALL show a failure flash instead of the success flash. The two SHALL differ by shape as well as by colour, so they are told apart without relying on colour. The popup SHALL also report the failure in text.

#### Scenario: Play refused

- **GIVEN** a selected video in a frame where the browser's autoplay policy refuses playback
- **WHEN** the user presses `Space`
- **THEN** that video shows the failure flash and the popup says the browser blocked the action

#### Scenario: Told apart without colour

- **WHEN** the success flash and the failure flash are compared with colour removed
- **THEN** they still differ, because the failure flash repeats within its duration and the success flash does not

### Requirement: Failure flash when no video receives the action

When no video with the named identity answers, the popup SHALL report that the video is gone and SHALL refresh its list. No video SHALL flash, because none received the action.

#### Scenario: Video removed before the key press

- **GIVEN** a selected video that the page has just removed
- **WHEN** the user presses `=`
- **THEN** the popup says the video is gone and its list no longer shows it

### Requirement: Flash on selection

When the selection moves to a video, that video SHALL flash once.

#### Scenario: Move selection

- **WHEN** the user presses `j` and the selection moves to another video
- **THEN** the newly selected video flashes

#### Scenario: Popup opens

- **WHEN** the popup opens and selects a video
- **THEN** the selected video flashes

### Requirement: Flash after bringing a video into view

When `Enter` brings a video into view, the video SHALL flash once after the scroll ends.

#### Scenario: Reveal

- **GIVEN** an off-screen video selected
- **WHEN** the user presses `Enter`
- **THEN** the video flashes once it is in view

### Requirement: Flash appearance

The success flash SHALL be a single ring around the full video area and a single pulse on the video's controller. Both SHALL start and end at the same time and last between 400 ms and 800 ms. The flash SHALL NOT block clicks on the page or change the video's layout.

#### Scenario: Ring and pulse together

- **WHEN** a video flashes
- **THEN** the ring and the controller pulse start together and end together

#### Scenario: Click through

- **WHEN** the user clicks the video while it flashes
- **THEN** the click reaches the page as it does without the flash

### Requirement: Flash with a hidden controller

When the video's controller is hidden, the ring SHALL still show. The flash SHALL NOT make a hidden controller visible.

#### Scenario: Start hidden

- **GIVEN** the startHidden setting is on and the controller is hidden
- **WHEN** the video receives a popup action
- **THEN** the ring shows and the controller stays hidden

### Requirement: Repeated flashes restart

When a video flashes again before its current flash ends, the flash SHALL restart from the beginning.

#### Scenario: Fast key presses

- **WHEN** the user presses `=` three times quickly
- **THEN** the flash restarts on each press and ends one flash duration after the last press
