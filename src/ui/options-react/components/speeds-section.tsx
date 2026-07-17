import { DateTime } from 'luxon';
import { useEffect, useMemo, useState } from 'react';

type SourceEntry = { speed: number; updated: number };
type Sources = Record<string, SourceEntry>;

function readSources(): Promise<Sources> {
  return new Promise<Sources>((resolve) =>
    chrome.storage.sync.get('sources', (s) => resolve((s.sources ?? {}) as Sources))
  );
}

function writeSources(sources: Sources): Promise<void> {
  return new Promise((resolve) => chrome.storage.sync.set({ sources }, () => resolve()));
}

export const SpeedsSection = () => {
  const [sources, setSources] = useState<Sources>({});
  const [filter, setFilter] = useState('');

  useEffect(() => {
    readSources().then(setSources);
  }, []);

  const persist = (next: Sources) => {
    setSources(next);
    writeSources(next);
  };

  const forget = (url: string) => {
    const rest = Object.fromEntries(Object.entries(sources).filter(([key]) => key !== url));
    persist(rest);
  };

  const cleanUp = () => {
    const kept = Object.fromEntries(Object.entries(sources).filter(([, v]) => !!v.speed));
    persist(kept);
  };

  const forgetAll = () => persist({});

  const setSpeed = (url: string, speed: number) => {
    if (isNaN(speed) || speed <= 0) {
      return;
    }
    persist({ ...sources, [url]: { ...sources[url], speed } });
  };

  const rows = useMemo(() => {
    const entries = Object.entries(sources).sort(([a], [b]) => a.localeCompare(b));
    if (!filter) {
      return entries;
    }
    return entries.filter(([url]) => url.includes(filter));
  }, [sources, filter]);

  const total = Object.keys(sources).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <button className="btn btn-error" onClick={forgetAll}>
          Forget All Speeds
        </button>
        <button className="btn btn-success" onClick={cleanUp}>
          Clean Up Speeds
        </button>
      </div>

      <h3 className="text-center text-lg font-semibold">Remembering a total of {total} website speeds</h3>

      <input
        className="input input-bordered"
        placeholder="start typing to filter …"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      <table className="table-zebra table text-base">
        <thead>
          <tr className="text-base">
            <th>#</th>
            <th>URL</th>
            <th>Speed</th>
            <th>Last updated</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([url, entry], idx) => (
            <tr key={url}>
              <td>{idx + 1}</td>
              <td className="break-all">{url}</td>
              <td>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="16"
                  className="input input-bordered w-24"
                  value={entry.speed}
                  onChange={(e) => setSpeed(url, parseFloat(e.target.value))}
                />
              </td>
              <td>{DateTime.fromMillis(entry.updated).toFormat('yyyy-MM-dd HH:mm:ss')}</td>
              <td>
                <button className="btn btn-error" onClick={() => forget(url)}>
                  Forget
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
