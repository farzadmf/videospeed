import { getBaseURL } from '@/shared/helpers';

export const setupRateChangeListener = (document: Document) => {
  document.addEventListener(
    'ratechange',
    (event) => {
      const video = event.target as HTMLVideoElement;
      const src = video.currentSrc;

      if (!src) return;

      const url = getBaseURL(src);

      if (vsc.settings.forceLastSavedSpeed) {
        event.stopImmediatePropagation();

        const speed = vsc.settings.speeds[url]?.speed || 1.0;
        setSpeed(video, speed);
      }
    },
    true,
  );
};
