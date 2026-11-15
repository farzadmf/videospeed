# speed-memory Specification

## Purpose

Keeps the speed a user chose for one video on that video for the rest of the page visit, while the site still remembers the latest speed for the next visit and for videos that load later.

## Requirements

### Requirement: A video starts at the site's saved speed

When a video gets a controller and speed memory is on, the video SHALL start at the site's saved speed. This SHALL hold for a video present when the page loads and for one that loads later on the same page.

#### Scenario: Video that loads later

- **GIVEN** the site's saved speed is 2.0x
- **WHEN** the page adds a new video and VSC attaches to it
- **THEN** the new video plays at 2.0x

### Requirement: A video keeps its session speed

After a video starts, its speed SHALL change only by a speed action aimed at it. Playback interactions on the video (play, pause, seek, rewind, advance) and rate changes the site makes SHALL restore that video's own last speed, not the site's saved speed.

#### Scenario: Pause and play

- **GIVEN** video A at 2.0x and video B at 1.0x on the same page
- **WHEN** the user pauses and then plays video B
- **THEN** video B plays at 1.0x

#### Scenario: Seek

- **GIVEN** video B at 1.0x while the site's saved speed is 2.0x
- **WHEN** the user rewinds or advances video B
- **THEN** video B stays at 1.0x

#### Scenario: Site resets the rate

- **GIVEN** video B at 1.5x
- **WHEN** the page sets video B's playback rate to 1.0x
- **THEN** VSC restores video B to 1.5x

### Requirement: A speed action saves the site's speed

A speed action on one video SHALL save that speed as the site's speed when speed memory is on. It SHALL NOT change the speed of other videos already on the page.

#### Scenario: Set one video, then reload

- **GIVEN** videos A and B at 1.0x
- **WHEN** the user sets video A to 2.0x
- **THEN** video B stays at 1.0x

#### Scenario: Reload after the change

- **GIVEN** the user set video A to 2.0x on this site
- **WHEN** the user reloads the page
- **THEN** videos A and B both start at 2.0x
