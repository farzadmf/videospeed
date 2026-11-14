# Manual test page: multiple videos

A page with eight videos in the places that break single-video assumptions. Use it for the popup video targeting work (`openspec/changes/popup-video-targeting/`).

## Run it

```sh
cd tests/manual/multi-video
python3 -m http.server 8000
```

Open <http://localhost:8000/>.

The frames load from `127.0.0.1` on the same port, which is a different origin from `localhost`, so they are cross-origin without a second server. Opening the page on `127.0.0.1` instead flips the pair, and the frames load from `localhost`.

## What is on the page

| #   | Where                           | Label comes from                           |
| --- | ------------------------------- | ------------------------------------------ |
| 1   | the document                    | `title` attribute                          |
| 2   | the document, inside a `figure` | `figcaption`                               |
| 3   | an open shadow root             | nothing, so the popup names it by position |
| 4   | a scroll container              | `title` attribute                          |
| 5   | a cross-origin frame            | the frame's `document.title`               |
| 6   | a frame inside that frame       | `title` attribute                          |
| 7   | the document, created on click  | `title` attribute                          |
| 8   | a shadow root, created on click | `title` attribute                          |

## What each one is for

- **Video 3** checks that VSC finds a video in a shadow root and puts its controller in the same tree.
- **Video 4** checks in-view reporting: scroll inside the box and the video goes out of sight while the page does not move.
- **Video 5** checks a cross-origin frame, and **video 6** checks that reveal walks up through two frames.
- **Video 6's frame has no `allow="autoplay"`**, on purpose. That was meant to make the browser refuse `play()` there, but Chrome resolves it anyway once you have engaged with the page, so it does not reproduce the blocked case.
- **The button under video 1 forces a refusal.** It patches that video's `play` to reject with `NotAllowedError`, which is the only reliable way to test how the popup reports a blocked action.
- Videos 1 and 2 give two videos in one document, which is where `runAction`'s first-match loop applies the action to the wrong one.
- **Videos 7 and 8** exist only after you click, so the initial scan cannot find them and the mutation observer has to. Video 8 adds a shadow root on top, which is how an embedded player loads a video on demand.

## `sample.mp4`

Generated locally, so the page needs no network:

```sh
ffmpeg -y -f lavfi -i "testsrc=duration=30:size=320x180:rate=10" \
  -c:v libx264 -preset veryslow -crf 34 -pix_fmt yuv420p -movflags +faststart sample.mp4
```

30 seconds, 48 KB. The pattern carries a timer, so playback, speed, and seeking are all visible.

Every video uses `preload="auto"` so the browser reaches `readyState >= 2` and fires `loadeddata` on its own. VSC defers attaching until then, so with `preload="metadata"` no controller would appear until you pressed play on each video.
