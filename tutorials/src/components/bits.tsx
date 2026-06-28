import type { ReactNode } from 'react';

// Small shared building blocks for tutorial pages. Plain and consistent.

export function Lead({ children }: { children: ReactNode }) {
  return <p className="lead">{children}</p>;
}

export function Note({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <aside className="note">
      {title && <div className="note__title">{title}</div>}
      <div>{children}</div>
    </aside>
  );
}

export function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="step">
      <h3 className="step__title">
        <span className="step__num">{n}</span>
        {title}
      </h3>
      <div className="step__body">{children}</div>
    </section>
  );
}

// A bordered box that holds a live, interactive demo, with a one-line label.
export function DemoFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="demo">
      <div className="demo__label">Try it: {label}</div>
      <div className="demo__stage">{children}</div>
    </div>
  );
}

// Two short columns to compare the old way and the new way side by side.
export function Compare({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="compare">
      <div className="compare__col">{left}</div>
      <div className="compare__col">{right}</div>
    </div>
  );
}
