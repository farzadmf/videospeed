import { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  title: string;
};

export const Section = ({ children, title }: Props) => (
  <section className="border-base-content/15 rounded-lg border p-2">
    <h2 className="text-base-content/60 mb-2 px-1 text-xs font-semibold tracking-wide uppercase">{title}</h2>
    {children}
  </section>
);
