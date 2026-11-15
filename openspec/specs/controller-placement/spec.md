# controller-placement Specification

## Purpose

Places the controller so it stacks, clips, and goes fullscreen with its video, not above the whole page.

## Requirements

### Requirement: Placement option

A "Controller inside the player" option, on by default, SHALL turn this placement on. It SHALL apply only with anchor positioning on, from the next page load. The requirements below apply while it is on.

#### Scenario: Option off

- **GIVEN** the option is off, or anchor positioning is off
- **WHEN** a page loads
- **THEN** the controller is placed as before this change

### Requirement: Stacks with its video

Page content that covers the video SHALL cover the controller.

#### Scenario: Page menu

- **WHEN** a page menu opens over the video
- **THEN** it covers the controller too

### Requirement: Above the player's own layers

The controller SHALL show above layers the player draws over its video, and its buttons SHALL take clicks.

#### Scenario: Click layer

- **GIVEN** a player with a transparent layer over its video
- **WHEN** the user clicks a controller button
- **THEN** the controller acts

### Requirement: Clipped with its player

A container that clips the player SHALL clip the controller.

#### Scenario: Scroll container

- **WHEN** the user scrolls a positioned scroll container until the top of the video is hidden
- **THEN** the controller is hidden with it

### Requirement: Fullscreen with its player

The controller SHALL show when an element containing the player goes fullscreen.

#### Scenario: Player fullscreen

- **WHEN** the user enters the player's fullscreen
- **THEN** the controller shows over the video

### Requirement: One rule for every site

Placement SHALL depend only on the page structure around the video, not on the site.

#### Scenario: Unknown site

- **WHEN** a site with no site-specific handling loads a video
- **THEN** the controller is placed by the same rule

### Requirement: Shadow DOM and custom elements

A video in a shadow root or slotted into a custom element SHALL get a visible controller. Where the chosen place would not render it, the controller SHALL use the option-off placement.

#### Scenario: Shadow root

- **WHEN** a video inside an open shadow root loads
- **THEN** the controller shows on it

#### Scenario: Slotted video

- **WHEN** a video slotted into a custom element loads
- **THEN** the controller shows on it

#### Scenario: Place does not render

- **GIVEN** an element that does not render added children around the video
- **WHEN** the video loads
- **THEN** the controller shows on it, placed as with the option off

### Requirement: Survives page changes

When the page removes the controller but keeps the video, the controller SHALL come back by the next time the video comes into view.

#### Scenario: Player rebuilt

- **WHEN** the page rebuilds the player markup and drops the controller
- **THEN** the controller returns when the video next comes into view
