import { createFileRoute, Link } from '@tanstack/react-router';

import { TutorialLayout } from '../components/tutorial-layout';
import { getTutorial } from '../tutorials/registry';

export const Route = createFileRoute('/t/$slug')({
  component: TutorialPage,
});

// Looks up the tutorial by its slug and renders it, with a link back home.
function TutorialPage() {
  const { slug } = Route.useParams();
  const tutorial = getTutorial(slug);

  if (!tutorial) {
    return (
      <div className="page">
        <p>That tutorial was not found.</p>
        <Link to="/">Back to all tutorials</Link>
      </div>
    );
  }

  const { content } = tutorial;
  return (
    <div className="page">
      <nav className="page__nav">
        <Link to="/">← All tutorials</Link>
      </nav>
      <TutorialLayout
        title={content.title}
        intro={content.intro}
        sections={content.sections}
        faqs={content.faqs}
      />
      <nav className="page__nav page__nav--bottom">
        <Link to="/">← All tutorials</Link>
      </nav>
    </div>
  );
}
