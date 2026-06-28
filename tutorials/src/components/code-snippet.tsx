import { Highlight, themes } from 'prism-react-renderer';
import { useEffect, useState } from 'react';

import { extractRegion, fetchRepoFile, languageFor, type RegionRequest } from '../lib/repo-source';

interface Props extends RegionRequest {
  /** Short note shown above the code, e.g. why this snippet matters. */
  caption?: string;
}

// Shows a slice of a REAL source file, fetched live. The file path and the real
// starting line number are shown so you can open the same place in your editor.
export function CodeSnippet({ caption, ...region }: Props) {
  const [code, setCode] = useState<string>('Loading real source…');
  const [firstLine, setFirstLine] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchRepoFile(region.path)
      .then((text) => {
        if (!alive) return;
        const r = extractRegion(text, region);
        setCode(r.code);
        setFirstLine(r.firstLineNumber);
      })
      .catch((e) => alive && setError(String(e.message ?? e)));
    return () => {
      alive = false;
    };
    // region is a small flat object; stringify keeps the effect stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(region)]);

  const language = languageFor(region.path);

  return (
    <figure className="snippet">
      {caption && <figcaption className="snippet__caption">{caption}</figcaption>}
      <div className="snippet__path">
        {region.path}
        <span className="snippet__live" title="Read from the real file when this page loaded">
          live from source
        </span>
      </div>
      {error ? (
        <pre className="snippet__error">{error}</pre>
      ) : (
        <Highlight theme={themes.nightOwl} code={code} language={language}>
          {({ style, tokens, getLineProps, getTokenProps }) => (
            <pre className="snippet__code" style={style}>
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })} className="snippet__line">
                  <span className="snippet__lineno">{firstLine + i}</span>
                  <span className="snippet__linecontent">
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token })} />
                    ))}
                  </span>
                </div>
              ))}
            </pre>
          )}
        </Highlight>
      )}
    </figure>
  );
}
