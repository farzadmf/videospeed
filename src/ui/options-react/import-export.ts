import { Settings } from './use-options';

export function exportSettings(): Promise<void> {
  return new Promise((resolve) =>
    chrome.storage.sync.get(null, (settings) => {
      const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'videospeed-settings.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      resolve();
    })
  );
}

// Reads and validates a settings JSON file, then replaces stored settings.
// Returns the imported object so the caller can refresh its draft.
export async function importSettings(file: File): Promise<Settings> {
  const text = await file.text();

  let imported: unknown;
  try {
    imported = JSON.parse(text);
  } catch {
    throw new Error('File is not valid JSON');
  }

  if (!imported || typeof imported !== 'object' || !Array.isArray((imported as { keyBindings?: unknown }).keyBindings)) {
    throw new Error('File does not look like a Video Speed Controller settings file');
  }

  await new Promise<void>((resolve) => chrome.storage.sync.clear(() => resolve()));
  await new Promise<void>((resolve) => chrome.storage.sync.set(imported as Settings, () => resolve()));

  return imported as Settings;
}
