import { createFileRoute, Link } from '@tanstack/react-router';

import { TUTORIALS, tutorialCard } from '../tutorials/registry';

export const Route = createFileRoute('/')({
  component: Home,
});

// Lists every tutorial. New entries in registry.ts appear here on their own.
function Home() {
  const cards = TUTORIALS.map(tutorialCard);
  return (
    <div className="home">
      <header className="home__header">
        <h1>VideoSpeed Tutorials</h1>
        <p>
          Short lessons that explain how parts of the VideoSpeed extension work. Each one uses the real code from this
          project, and has demos you can try.
        </p>
      </header>

      <ul className="home__list">
        {cards.map((t) => (
          <li key={t.slug} className="home__card">
            <Link to="/t/$slug" params={{ slug: t.slug }} className="home__cardlink">
              <h2>{t.title}</h2>
              <p>{t.summary}</p>
              <span className="home__meta">{t.minutes} min read</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
