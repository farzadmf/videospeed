import { useEffect, useState } from 'react';

import { KeyBindings } from './components/key-bindings';
import { LeaderModeSection } from './components/leader-mode';
import { OtherSettings } from './components/other-settings';
import { Section } from './components/section';
import { SiteSettings } from './components/site-settings';
import { SpeedsSection } from './components/speeds-section';
import { Settings, useOptions } from './use-options';

export const App = () => {
  const { settings, save, restoreDefaults } = useOptions();

  const [draft, setDraft] = useState<Settings | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settings) {
      setDraft(structuredClone(settings));
    }
  }, [settings]);

  if (!draft) {
    return <div className="p-8">Loading…</div>;
  }

  const update = (patch: Partial<Settings>) => {
    setDraft({ ...draft, ...patch });
    setDirty(true);
  };

  const onSave = async () => {
    await save(draft);
    setDirty(false);
  };

  const onRestore = async () => {
    await restoreDefaults();
    setDirty(false);
  };

  return (
    <div className="bg-base-100 text-base-content mx-auto max-w-4xl p-6">
      <header className="mb-4">
        <h1 className="text-3xl font-bold">Video Speed Controller</h1>
        <p className="text-base-content/70 mt-1">Expand each section for relevant settings</p>
      </header>

      <div className="bg-base-100 sticky top-0 z-10 mb-4 flex gap-2 py-3">
        <button className={`btn ${dirty ? 'btn-success' : 'btn-outline'}`} disabled={!dirty} onClick={onSave}>
          {dirty ? 'Save Settings *' : 'Save Settings'}
        </button>
        <button className="btn btn-primary" onClick={onRestore}>
          Restore Defaults
        </button>
      </div>

      <div className="join join-vertical w-full">
        <Section title="Key Bindings">
          <KeyBindings settings={draft} update={update} />
        </Section>
        <Section title="Leader Mode">
          <LeaderModeSection settings={draft} update={update} />
        </Section>
        <Section title="Other Settings">
          <OtherSettings settings={draft} update={update} />
        </Section>
        <Section title="Site-specific Settings">
          <SiteSettings settings={draft} update={update} />
        </Section>
        <Section title="Speeds">
          <SpeedsSection />
        </Section>
      </div>
    </div>
  );
};
