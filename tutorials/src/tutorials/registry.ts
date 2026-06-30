import { readMinutes, type TutorialContent } from '../components/tutorial-layout';
import { anchorPositioningTutorial } from './anchor-positioning';
import { leaderCoordinationTutorial } from './leader-coordination';

// Add new tutorials here: give a slug and the content object. Title, summary and
// read time all come from the content, so there is nothing to keep in sync by
// hand. The home page and the /t/$slug route read this list.

export interface TutorialEntry {
  /** URL slug, e.g. "anchor-positioning" -> /t/anchor-positioning */
  slug: string;
  content: TutorialContent;
}

export const TUTORIALS: TutorialEntry[] = [
  { slug: 'anchor-positioning', content: anchorPositioningTutorial },
  { slug: 'leader-coordination', content: leaderCoordinationTutorial },
];

export function getTutorial(slug: string): TutorialEntry | undefined {
  return TUTORIALS.find((t) => t.slug === slug);
}

/** Everything the home page needs for a card, derived from the content. */
export function tutorialCard(entry: TutorialEntry) {
  return {
    slug: entry.slug,
    title: entry.content.title,
    summary: entry.content.summary,
    minutes: readMinutes(entry.content),
  };
}
