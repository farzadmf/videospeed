import { Children, isValidElement, type ReactNode, useMemo } from 'react';

// The frame every tutorial uses. A tutorial gives a title, a short intro, a list
// of sections, and (optionally) a list of FAQ items. This component then:
//   - draws each section with a heading you can link to,
//   - builds a collapsible table of contents from those sections,
//   - shows the FAQ at the end (and adds it to the table of contents),
//   - works out the read time from the words on the page (no manual number).

export interface Section {
  /** Short id used in the URL hash and the TOC link, e.g. "the-problem". */
  id: string;
  /** Heading text shown on the page and in the TOC. */
  title: string;
  /** The section body. */
  content: ReactNode;
}

export interface Faq {
  /** A question, as a reader would ask it. */
  question: string;
  /** A short, plain answer. */
  answer: ReactNode;
}

// A whole tutorial as data. Tutorials export this; the page renders it and the
// registry reads it to work out the read time, so nothing is typed by hand.
export interface TutorialContent {
  /** Heading and home-page title. */
  title: string;
  /** One or two plain sentences for the home page. */
  summary: string;
  /** The opening paragraph(s). */
  intro: ReactNode;
  sections: Section[];
  faqs?: Faq[];
}

type Props = Omit<TutorialContent, 'summary'>;

const FAQ_ID = 'faq';

// Sections start collapsed so the page is short and easy to scan. Flip to `true`
// here (or delete the `open` attribute below) to show everything by default.
const SECTIONS_OPEN_BY_DEFAULT = false;

export function TutorialLayout({ title, intro, sections, faqs }: Props) {
  const minutes = useMemo(() => readMinutes({ title, summary: '', intro, sections, faqs }), [title, intro, sections, faqs]);

  const tocItems = useMemo(() => {
    const items = sections.map((s) => ({ id: s.id, title: s.title }));
    if (faqs && faqs.length > 0) {
      items.push({ id: FAQ_ID, title: 'Questions and answers' });
    }
    return items;
  }, [sections, faqs]);

  // A TOC link should open the section it jumps to, even when sections are
  // collapsed by default. We open the target's <details> on hash change.
  const openFromHash = () => {
    const id = decodeURIComponent(location.hash.replace('#', ''));
    if (!id) return;
    const el = document.getElementById(id);
    if (el instanceof HTMLDetailsElement) el.open = true;
  };

  return (
    <article className="tutorial">
      <h1>{title}</h1>
      <p className="tutorial__readtime">{minutes} min read</p>
      <div className="lead">{intro}</div>

      <Toc items={tocItems} onJump={openFromHash} />

      {sections.map((s) => (
        <details
          key={s.id}
          id={s.id}
          className="tutorial__section"
          open={SECTIONS_OPEN_BY_DEFAULT}
        >
          <summary className="tutorial__heading">
            <span className="tutorial__heading-text">{s.title}</span>
          </summary>
          <div className="tutorial__body">{s.content}</div>
        </details>
      ))}

      {faqs && faqs.length > 0 && (
        <details id={FAQ_ID} className="tutorial__section" open={SECTIONS_OPEN_BY_DEFAULT}>
          <summary className="tutorial__heading">
            <span className="tutorial__heading-text">Questions and answers</span>
          </summary>
          <dl className="faq">
            {faqs.map((f, i) => (
              <div className="faq__item" key={i}>
                <dt className="faq__q">{f.question}</dt>
                <dd className="faq__a">{f.answer}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </article>
  );
}

// The collapsible table of contents. Open by default; click the header to fold.
function Toc({ items, onJump }: { items: { id: string; title: string }[]; onJump: () => void }) {
  return (
    <details className="toc" open>
      <summary className="toc__summary">On this page</summary>
      <ol className="toc__list">
        {items.map((it) => (
          <li key={it.id}>
            <a href={`#${it.id}`} onClick={() => requestAnimationFrame(onJump)}>
              {it.title}
            </a>
          </li>
        ))}
      </ol>
    </details>
  );
}

// Counts the words inside any JSX. Best-effort: it walks the React tree and adds
// up the text in strings. Code snippets fetch their text at runtime, so they are
// not counted here — that is fine for a rough read-time estimate.
function countWords(node: ReactNode): number {
  let words = 0;
  Children.forEach(node, (child) => {
    if (typeof child === 'string' || typeof child === 'number') {
      words += String(child).trim().split(/\s+/).filter(Boolean).length;
    } else if (isValidElement(child)) {
      words += countWords((child.props as { children?: ReactNode }).children);
    }
  });
  return words;
}

// Rough read time from the words in a tutorial, at about 250 words per minute.
// Used by both the page and the home-page card, so they always agree and no one
// types a number by hand.
export function readMinutes(content: TutorialContent): number {
  let words = countWords(content.intro);
  for (const s of content.sections) {
    words += countWords(s.title) + countWords(s.content);
  }
  for (const f of content.faqs ?? []) {
    words += countWords(f.question) + countWords(f.answer);
  }
  return Math.max(1, Math.round(words / 250));
}
