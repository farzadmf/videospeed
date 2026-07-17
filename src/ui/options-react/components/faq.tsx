const ENTRIES = [
  {
    q: 'Local files / Incognito',
    a: (
      <>
        To enable playback of local media (File &gt; Open File) or Incognito mode, grant additional permissions: go to{' '}
        <code>chrome://extensions</code>, find "Video Speed Controller", click Details, and enable "Allow access to file
        URLs" and/or "Allow in Incognito".
      </>
    ),
  },
  {
    q: 'Disable on a site',
    a: (
      <>
        Add the site's domain to the blacklist in Other Settings (e.g. <code>example.com</code>). Regex is supported
        (e.g. <code>/\.edu$/i</code>).
      </>
    ),
  },
  {
    q: 'Per-site speed',
    a: 'This fork remembers speed per website when "Remember playback speed" is enabled. Speeds are stored per video source URL and restored on revisit.',
  },
  {
    q: 'Shortcut conflicts',
    a: (
      <>
        If a site captures one of your shortcut keys, try <code>Shift+&lt;key&gt;</code> — the extension listens for
        both cases. You can also remap keys in Key Bindings above.
      </>
    ),
  },
  {
    q: 'Controller not showing',
    a: "The extension only works with HTML5 video/audio. If you don't see controls, the site may use a non-standard player. Try reloading. Very small or zero-size videos hide the controller automatically.",
  },
  {
    q: 'Audio support',
    a: 'Enable "Work on audio" in Other Settings to show speed controls on <audio> elements (podcasts, music players, etc.).',
  },
];

export const Faq = () => (
  <div className="flex flex-col gap-4">
    {ENTRIES.map(({ q, a }) => (
      <div key={q}>
        <h5 className="font-semibold">{q}</h5>
        <p className="text-base-content/80">{a}</p>
      </div>
    ))}
  </div>
);
