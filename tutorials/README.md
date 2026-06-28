# VideoSpeed Tutorials

Local-only interactive lessons that explain concepts used in the VideoSpeed
extension. This app is **not** part of the shipped extension. It has its own
`package.json` so its dependencies never mix with the extension's code.

## Run it

From the repo root (installs the first time on its own):

```bash
npm run tutorials
```

Then open the URL it prints (default: http://localhost:5174). To build instead
of serve: `npm run tutorials:build`.

You can also run it directly from this folder: `npm install && npm run dev`.

## How it works

- **Routing is file-based** (TanStack Router). Files in `src/routes/` become
  routes; the Vite plugin generates `src/routeTree.gen.ts` (git-ignored).
- **Home page** lists every tutorial. The list comes from
  `src/tutorials/registry.ts` — add an entry there and it shows up automatically.
- **Code snippets show the real code.** A small dev-server endpoint
  (`/repo-file`, defined in `vite.config.ts`) reads files from the repo at
  runtime. The `<CodeSnippet>` component fetches a file and extracts the part it
  needs, preferring a text marker (`startMatch`) over line numbers so it keeps
  working when the real code moves around. Nothing is copied by hand, so the
  snippets do not need updating when the extension code changes.
- **Demos** are normal React components under `src/demos/`.

## Add a new tutorial

1. Create `src/tutorials/<slug>.tsx` exporting a component.
2. Register it in `src/tutorials/registry.ts`.
3. Use `<CodeSnippet path="src/..." startMatch="..." />` to show real code, and
   put any interactive demo in `src/demos/`.

There is a skill for this: run `/create-tutorial` (see
`.claude/skills/create-tutorial/`).
