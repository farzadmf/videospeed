# Coding style

Conventions for code in this repo, beyond what the linter enforces.

## Blank lines: read code like paragraphs

Use blank lines to group statements into "paragraphs", the way prose groups sentences. Each paragraph should do one thing; a blank line separates one idea from the next. This is about readability, not a hard rule — but apply it consistently.

Guidelines:

- Separate the distinct steps of a function with a blank line. A guard clause, the main work, and the return are usually three paragraphs.
- Keep tightly-coupled lines together with no blank line between them (e.g. a variable and the `if` that immediately checks it).
- Add a blank line before a comment that introduces a new paragraph, so the comment heads its group.
- Do not scatter single statements with blank lines on both sides for no reason, and do not pack ten unrelated statements with no breaks. Both are hard to read.

Example:

```js
function handle(event) {
  const msg = parse(event.data);
  if (!msg) {
    return;
  }

  log(msg);

  switch (
    msg.type
    // ...
  ) {
  }
}
```

Here the parse-and-guard is one paragraph, the log is its own beat, and the switch is the main work — three groups, two blank lines.

## Comments

Write a comment only when it explains something the code cannot: a non-obvious _why_, a constraint, or a gotcha. Do not narrate what the next line plainly does. Keep comments factual; no hype, no "temporary"/"prototype" labels on code that is staying. State the constraint plainly — don't sell or praise the code; a comment that reads like ad copy for the function ("so a quick tap never flips the UI") is noise even when it's technically a _why_.

## Markdown

Do not manually wrap prose across multiple lines. Write each paragraph as one long line and let the editor soft-wrap it; hard-wrapped sentences render as broken lines in editors that don't reflow (`proseWrap: never` un-wraps them). `npm run format` fixes formatting across JS/TS/Markdown; `npm run lint` checks it (`lint:format` runs `prettier --check`) and `build` runs `lint` first, so bad formatting fails the build.

## Commits

Commits follow conventional commit format

- They only mention facts, no hype to create excitement etc.
- A commit lists the what(s) and more importantly why(s)
- The what(s) DO NOT reiterate the code line/function changes; those are obvious in the diff; instead they're just an overview list where details can be separately looked at in case the reader wants to
- The why(s) is/are super short, to-the-point, again no hype, no assumption. Eg, "change this; never do blah"; how do you know that "never"? Goes back to what was mentioned before: facts only.
- We prefer to mention the why along the what itself as it's easier to correlate (NOTE: we should still be careful to have short, readable points in there).
- With the above, either the why section would be removed (because all the why's were mentioned) or it would be there and contain a "general why" that's not directly relatable to any of the "what's" mentioned above it.
