import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';

// The repo root is one level up from this tutorials/ folder.
const REPO_ROOT = path.resolve(__dirname, '..');

/**
 * Serves real extension source files to the browser at runtime.
 *
 * The tutorials show snippets of the ACTUAL code (src/...). Instead of copying
 * code into the tutorial (which would go stale), the <CodeSnippet> component
 * fetches the file through this endpoint and extracts the part it needs.
 *
 * Read-only, dev-only, and locked to text files under the repo so a tutorial
 * page can never reach outside the project or write anything.
 */
function serveRepoSource(): Plugin {
  const ALLOWED = /\.(js|ts|tsx|css|json|md|html)$/;

  return {
    name: 'serve-repo-source',
    configureServer(server) {
      server.middlewares.use('/repo-file', (req, res) => {
        const url = new URL(req.url ?? '', 'http://localhost');
        const rel = url.searchParams.get('path') ?? '';

        const abs = path.resolve(REPO_ROOT, rel);
        const insideRepo = abs.startsWith(REPO_ROOT + path.sep);

        if (!insideRepo || !ALLOWED.test(abs) || !fs.existsSync(abs)) {
          res.statusCode = 404;
          res.end('not found');
          return;
        }

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(fs.readFileSync(abs, 'utf8'));
      });
    },
  };
}

export default defineConfig({
  plugins: [
    // Must come before the React plugin. Generates src/routeTree.gen.ts from
    // the files in src/routes/.
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    serveRepoSource(),
  ],
  server: {
    port: 5174,
    strictPort: true,
  },
});
