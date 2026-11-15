# media-inventory Specification

## Purpose

Lets the popup know which videos the page controls, what state each one is in, and whether the user can see it, so popup actions can reach one chosen video.

## Requirements

### Requirement: Report every controlled video

While the popup is open, the page SHALL report one entry for each video that has a controller, wherever the video lives: the main document, a shadow root, or a same-origin or cross-origin frame at any depth. Videos without a controller SHALL NOT appear.

#### Scenario: Videos in different locations

- **GIVEN** a page with one controlled video in the main document, one in a shadow root, and one in a cross-origin frame
- **WHEN** the popup opens
- **THEN** the popup receives three entries

#### Scenario: Ignored video

- **GIVEN** a page with a video that VSC ignores (for example, a gif-like video)
- **WHEN** the popup opens
- **THEN** that video has no entry

### Requirement: Stable video identity

Each entry SHALL have an identity that stays the same for the life of its controller and is unique across all frames of the tab. A command that names this identity SHALL reach only that video.

#### Scenario: Same identity across updates

- **GIVEN** the popup is open and shows a video
- **WHEN** that video's speed or in-view state changes
- **THEN** its entry keeps the same identity

#### Scenario: Two frames, same local id

- **GIVEN** two frames that each contain one controlled video
- **WHEN** the popup receives both entries
- **THEN** the two identities are different

### Requirement: Entry contents

Each entry SHALL carry a human-readable label, whether the video is playing, its current speed, whether it is in view, and how much of it is visible. When no label can be derived from the page, the label SHALL fall back to a positional name such as "Video 2".

#### Scenario: Label fallback

- **GIVEN** a video with no title or other label the page provides
- **WHEN** the popup shows its entry
- **THEN** the entry shows a positional name

### Requirement: In view means visible in the top-level viewport

A video SHALL count as in view only when at least 10% of it is visible in the top-level viewport, after clipping by every ancestor scroll container and frame. Being visible inside its own document alone SHALL NOT count.

#### Scenario: Video in a frame scrolled off the page

- **GIVEN** a frame whose own viewport shows its video fully
- **WHEN** the page scrolls so that the frame is out of the top-level viewport
- **THEN** the video's entry reports not in view

#### Scenario: Video clipped by a scroll container

- **GIVEN** a video inside a scroll container on the main document
- **WHEN** the container scrolls so that the video is hidden
- **THEN** the video's entry reports not in view

### Requirement: Live updates while the popup is open

While the popup is open, the page SHALL send an updated report within one second when a video gains or loses a controller, or when a video's playing state, speed, or in-view state changes.

#### Scenario: A video appears

- **GIVEN** the popup is open and shows two videos
- **WHEN** the page adds a third controlled video
- **THEN** the popup shows three videos within one second

#### Scenario: A video goes away

- **GIVEN** the popup is open and shows three videos
- **WHEN** the page removes one of them
- **THEN** the popup shows two videos within one second

### Requirement: No reporting while the popup is closed

The page SHALL NOT send inventory reports while no popup is open.

#### Scenario: Popup closes

- **GIVEN** the popup is open and receiving reports
- **WHEN** the user closes the popup
- **THEN** the page stops sending reports
