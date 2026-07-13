import { useEffect, useRef, useState } from 'react';

import { Faq } from './components/faq';
import { KeyBindings } from './components/key-bindings';
import { LeaderModeSection } from './components/leader-mode';
import { OtherSettings } from './components/other-settings';
import { Section } from './components/section';
import { SiteSettings } from './components/site-settings';
import { SpeedsSection } from './components/speeds-section';
import { exportSettings, importSettings } from './import-export';
import { serialize, validateBlacklist } from './serialize';
import { Settings, useOptions } from './use-options';

export const App = () => {
  const { settings, save, restoreDefaults } = useOptions();

  const [draft, setDraft] = useState<Settings | null>(null);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings) {
      setDraft(structuredClone(settings));
    }
  }, [settings]);

  if (!draft) {
    return <div className="p-8 text-lg">Loading…</div>;
  }

  const flash = (msg: string, ms = 2000) => {
    setStatus(msg);
    setTimeout(() => setStatus(''), ms);
  };

  const update = (patch: Partial<Settings>) => {
    setDraft({ ...draft, ...patch });
    setDirty(true);
  };

  const onSave = async () => {
    const error = validateBlacklist(draft.blacklist);
    if (error) {
      flash(`Error: ${error}`, 4000);
      return;
    }

    await save(serialize(draft));
    setDirty(false);
    flash('Settings saved');
  };

  const onRestore = async () => {
    await restoreDefaults();
    setDirty(false);
    flash('Default options restored');
  };

  const onImport = async (file: File) => {
    try {
      const imported = await importSettings(file);
      setDraft(structuredClone(imported));
      setDirty(false);
      flash('Settings imported successfully');
    } catch (e) {
      flash(`Import failed: ${(e as Error).message}`, 4000);
    }
  };

  return (
    <div className="bg-base-100 text-base-content mx-auto max-w-4xl p-6">
      <header className="mb-4">
        <h1 className="text-3xl font-bold">Video Speed Controller</h1>
        <p className="text-base-content/70 mt-1">Expand each section for relevant settings</p>
      </header>

      <div className="bg-base-100 sticky top-0 z-10 mb-4 flex flex-wrap items-center gap-2 py-3">
        <button className={`btn ${dirty ? 'btn-success' : 'btn-outline'}`} disabled={!dirty} onClick={onSave}>
          {dirty ? 'Save Settings *' : 'Save Settings'}
        </button>
        <button className="btn btn-primary" onClick={onRestore}>
          Restore Defaults
        </button>
        <button className="btn btn-outline" onClick={() => exportSettings()}>
          Export
        </button>
        <button className="btn btn-outline" onClick={() => fileInput.current?.click()}>
          Import
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) {
              onImport(file);
            }
          }}
        />
        {status && <span className="text-base-content/80 ml-2">{status}</span>}
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
        <Section title="FAQ">
          <Faq />
        </Section>
        <Section title="Help & Support">
          <div className="flex flex-col gap-2">
            <button className="btn btn-error" onClick={() => window.open('https://github.com/farzadmf/videospeed')}>
              About Video Speed Controller
            </button>
            <button className="btn btn-success" onClick={() => window.open('https://github.com/farzadmf/videospeed/issues')}>
              Send Feedback
            </button>
          </div>
        </Section>
      </div>
    </div>
  );
};
