// Fetches REAL extension source files from the dev server (see vite.config.ts)
// and pulls out just the part a snippet wants. Nothing here is copied by hand,
// so when the real code changes, the tutorial shows the new code automatically.

const cache = new Map<string, Promise<string>>();

/** Download a repo file as plain text (cached per session). */
export function fetchRepoFile(repoPath: string): Promise<string> {
  if (!cache.has(repoPath)) {
    cache.set(
      repoPath,
      fetch(`/repo-file?path=${encodeURIComponent(repoPath)}`).then((res) => {
        if (!res.ok) {
          throw new Error(`Could not read ${repoPath} (is the dev server running from tutorials/?)`);
        }
        return res.text();
      })
    );
  }
  return cache.get(repoPath)!;
}

export interface RegionRequest {
  /** Repo-relative path, e.g. "src/ui/shadow-dom-manager.js" */
  path: string;
  /** First line to show (1-based). */
  startLine?: number;
  /** Last line to show (1-based, inclusive). */
  endLine?: number;
  /**
   * Show the function/block whose signature contains this text. The region runs
   * from the matching line to the line where indentation returns to the opener's
   * level (a closing brace at the same column). Survives line-number drift.
   */
  startMatch?: string;
}

export interface Region {
  code: string;
  /** The real line number where the shown region starts (for display). */
  firstLineNumber: number;
}

/** Number of leading spaces on a line (tabs count as one space here). */
function indentOf(line: string): number {
  const m = line.match(/^[ \t]*/);
  return m ? m[0].length : 0;
}

/**
 * Extract a region from full file text. Prefers startMatch (robust); falls back
 * to explicit line numbers. Returns trimmed-to-region code plus its real start
 * line so the snippet can label lines with their true position in the file.
 */
export function extractRegion(fullText: string, req: RegionRequest): Region {
  const lines = fullText.split('\n');

  if (req.startMatch) {
    const startIdx = lines.findIndex((l) => l.includes(req.startMatch!));
    if (startIdx === -1) {
      return {
        code: `// Could not find "${req.startMatch}" in ${req.path}.\n// The marker may have changed; update the tutorial's startMatch.`,
        firstLineNumber: 1,
      };
    }

    const baseIndent = indentOf(lines[startIdx]);
    let endIdx = startIdx;
    // Walk forward to the closing line at the same indentation (a lone } or }).
    for (let i = startIdx + 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (line.trim() === '') continue;
      if (indentOf(line) === baseIndent && /^[ \t]*[)}\]];?$/.test(line)) {
        endIdx = i;
        break;
      }
      endIdx = i;
    }

    return {
      code: lines.slice(startIdx, endIdx + 1).join('\n'),
      firstLineNumber: startIdx + 1,
    };
  }

  const start = (req.startLine ?? 1) - 1;
  const end = req.endLine ?? lines.length;
  return {
    code: lines.slice(start, end).join('\n'),
    firstLineNumber: start + 1,
  };
}

/** GitHub-style language id from file extension, for syntax highlighting. */
export function languageFor(repoPath: string): string {
  if (repoPath.endsWith('.css')) return 'css';
  if (repoPath.endsWith('.json')) return 'json';
  if (repoPath.endsWith('.html')) return 'markup';
  if (repoPath.endsWith('.md')) return 'markdown';
  return 'jsx';
}
