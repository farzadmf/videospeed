import { useOptions } from './use-options';

const SECTIONS = ['Key Bindings', 'Leader Mode', 'Other Settings', 'Site-specific Settings', 'Speeds', 'FAQ', 'Help & Support'];

export const App = () => {
  const { settings } = useOptions();

  if (!settings) {
    return <div className="p-8">Loading…</div>;
  }

  return (
    <div className="bg-base-100 text-base-content mx-auto max-w-4xl p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Video Speed Controller</h1>
        <p className="text-base-content/70 mt-1">Expand each section for relevant settings</p>
      </header>

      <div className="join join-vertical w-full">
        {SECTIONS.map((title) => (
          <div key={title} className="collapse-arrow join-item border-base-300 collapse border">
            <input type="checkbox" />
            <div className="collapse-title font-semibold">{title}</div>
            <div className="collapse-content text-base-content/50 text-sm">Not yet ported.</div>
          </div>
        ))}
      </div>
    </div>
  );
};
