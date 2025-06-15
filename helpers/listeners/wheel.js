function wheelListener(event) {
  event.preventDefault();
  const delta = Math.sign(event.deltaY);
  const step = 0.1;

  let speed = this.video.playbackRate + (delta < 0 ? step : -step);
  speed = Math.min(Math.max(speed, 0.1), 16);

  setSpeed(this.video, speed);
}
