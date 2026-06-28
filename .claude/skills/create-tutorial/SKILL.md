---
name: create-tutorial
description: Create a new interactive tutorial in the tutorials/ app that explains a concept used in the VideoSpeed extension. Use when the user wants to learn or document how some part of VSC works (a CSS feature, a DOM pattern, a piece of the architecture), or asks to "add a tutorial" / "explain this with a tutorial". Produces a React page with live demos and code snippets pulled from the REAL source files.
---

# Create a VideoSpeed tutorial

The `tutorials/` folder is a local-only Vite + React app that teaches concepts
used in this extension. This skill adds a new tutorial to it.

## Hard rules

1. **Scope to VSC.** Every tutorial explains how a concept is used *in this
   extension*, with the extension's real files — never generic, standalone
   explanations.
2. **Code snippets must read the real source at runtime.** Use the
   `<CodeSnippet>` component, which fetches files through the dev server's
   `/repo-file` endpoint. NEVER paste source code into the tutorial by hand — it
   would go stale. Prefer `startMatch` (a text marker) over line numbers so
   snippets survive edits to the real code.
3. **Tone: plain and calm.** Write for a 10-year-old with limited English
   vocabulary. Short sentences. Common words. No hype, no jokes, no "magic",
   no "amazing", no exclamation marks for excitement, no talking up the work.
   Just explain clearly. Define every term the first time it appears.
4. **Dependencies stay in `tutorials/package.json` only.** Never add tutorial
   deps to the root `package.json`. The app is isolated from the extension.
5. **Demos are real.** When a concept can be shown, build a small interactive
   demo in `tutorials/src/demos/` that uses the same technique the real code
   uses (e.g. a real shadow DOM, real CSS anchor positioning), not a fake
   picture of it.
6. **Avoid statements that go stale.** Do not write things that are only true
   right now and could change quietly: which option is the default, what value a
   setting has today, version numbers, dates, "new" / "recently added", browser
   support percentages, "soon", counts of files. Explain what each choice *does*
   and let a `<CodeSnippet>` show the current value. If you must point at a value,
   point at it through a snippet of the real file, never by typing it.
7. **No hand-kept numbers.** Read time is computed from word count
   (`readMinutes`); never type a minutes value. The table of contents is built
   from the section list; do not write one by hand.
8. **File names are kebab-case.** e.g. `my-thing.tsx`, not `MyThing.tsx`. React
   component names inside the files stay PascalCase as usual.

## Steps

1. **Understand the concept in this codebase first.** Find the real files and
   functions that use it. Note exact function signatures or unique lines you can
   use as `startMatch` markers. Confirm they exist with grep before writing.

2. **Plan the lesson.** A good shape:
   - The problem (what job needs doing, in plain words).
   - One way to do it, with its downside.
   - Another way, and why it helps. (Name the ways by what they DO, e.g. "the
     JavaScript way" / "the CSS way" — not "the old way" / "the new way", which
     goes stale.)
   - The real code, shown with `<CodeSnippet>`.
   - A live demo to try.
   - A short "what to remember" list.

3. **Write the content** at `tutorials/src/tutorials/<slug>.tsx` (kebab-case
   file name). Export a `const <name>Tutorial: TutorialContent` object with:
   `title`, `summary`, `intro`, `sections` (each `{ id, title, content }`), and
   optional `faqs` (each `{ question, answer }`). Do NOT build the page chrome,
   table of contents, headings, or read time yourself — `<TutorialLayout>` does
   all of that from this data. Use `id`s in kebab-case; they become URL hashes.
   Reuse the building blocks from `../components/bits` (`Note`, `Step`, `Compare`,
   `DemoFrame`) and `../components/code-snippet`.

4. **Build any demo** under `tutorials/src/demos/<name>.tsx` (kebab-case). Keep
   it small and focused on one idea. For browser features that may be missing,
   feature-detect and show a fallback message (see `positioning-demo.tsx`).

5. **Register it** in `tutorials/src/tutorials/registry.ts` by adding a
   `{ slug, content }` entry to `TUTORIALS`. The home page and the `/t/$slug`
   route pick it up automatically — you do NOT add a route file per tutorial,
   and you do NOT type a title/summary/minutes anywhere else (they come from the
   content; read time is computed).

6. **FAQ.** If the user asks clarifying questions about the tutorial, add each as
   a `{ question, answer }` to the tutorial's `faqs`. Keep answers short and in
   the same plain tone. The FAQ renders at the end and joins the table of
   contents on its own.

7. **Verify** (run from the repo root):
   - `npm run tutorials:build` must pass.
   - `npm run tutorials`, then check the home page (HTTP 200) and that each
     `<CodeSnippet>` resolves by hitting
     `/repo-file?path=<the path>` and confirming the marker text is present.
   - Re-read the prose: remove hype, cleverness, hard words, and anything that
     could go stale (see hard rule 6).

## CodeSnippet reference

```tsx
// By marker (preferred — robust to line moves). Shows the whole function/block.
<CodeSnippet path="src/ui/shadow-dom-manager.js" startMatch="enableAnchorPositioning(host) {" caption="..." />

// By a unique marker on a CSS rule, etc.
<CodeSnippet path="src/styles/shadow_new.css" startMatch=":host(.vsc-anchored)" caption="..." />

// By line range (last resort — line numbers drift, so use a marker when you can).
<CodeSnippet path="src/some/file.js" startLine={10} endLine={18} caption="..." />
```

`startMatch` finds the first line containing the text and includes lines down to
the closing brace/bracket/paren at the same indentation. Pick a marker that is
unique in the file (a function signature is usually safe).

## Files in the app you will touch or reuse

- `tutorials/src/tutorials/registry.ts` — the list of tutorials (edit this).
- `tutorials/src/tutorials/<slug>.tsx` — the new tutorial content object (create this).
- `tutorials/src/demos/` — interactive demos (create here if needed).
- `tutorials/src/components/tutorial-layout.tsx` — renders a `TutorialContent`:
  page chrome, collapsible table of contents, collapsible sections, FAQ, and the
  computed read time. Reuse; rarely changes. (`SECTIONS_OPEN_BY_DEFAULT` here
  controls whether sections start open or collapsed.)
- `tutorials/src/components/code-snippet.tsx` — live source snippets (reuse).
- `tutorials/src/components/bits.tsx` — `Lead`, `Note`, `Step`, `Compare`, `DemoFrame` (reuse).
- `tutorials/src/lib/repo-source.ts` — fetch + region extraction (rarely changes).
- `tutorials/src/routes/` — file-based routes (TanStack Router); you normally do
  NOT edit these — tutorials are keyed by slug via `t.$slug.tsx`.
- `tutorials/vite.config.ts` — the `/repo-file` dev endpoint (rarely changes).
- `tutorials/src/styles.css` — shared styles, including dark/light via
  `prefers-color-scheme`; add classes here if a demo needs them.
