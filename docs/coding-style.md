# Coding style

Conventions for code in this repo, beyond what the linter enforces.

## Blank lines: read code like paragraphs

Use blank lines to group statements into "paragraphs", the way prose groups
sentences. Each paragraph should do one thing; a blank line separates one idea
from the next. This is about readability, not a hard rule — but apply it
consistently.

Guidelines:

- Separate the distinct steps of a function with a blank line. A guard clause,
  the main work, and the return are usually three paragraphs.
- Keep tightly-coupled lines together with no blank line between them (e.g. a
  variable and the `if` that immediately checks it).
- Add a blank line before a comment that introduces a new paragraph, so the
  comment heads its group.
- Do not scatter single statements with blank lines on both sides for no
  reason, and do not pack ten unrelated statements with no breaks. Both are hard
  to read.

Example:

```js
function handle(event) {
  const msg = parse(event.data);
  if (!msg) {
    return;
  }

  log(msg);

  switch (msg.type) {
    // ...
  }
}
```

Here the parse-and-guard is one paragraph, the log is its own beat, and the
switch is the main work — three groups, two blank lines.

## Comments

Write a comment only when it explains something the code cannot: a non-obvious
*why*, a constraint, or a gotcha. Do not narrate what the next line plainly
does. Keep comments factual; no hype, no "temporary"/"prototype" labels on code
that is staying.
