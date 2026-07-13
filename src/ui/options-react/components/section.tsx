import { ReactNode } from 'react';

type Props = {
  title: string;
  children: ReactNode;
};

export const Section = ({ title, children }: Props) => (
  <div className="collapse-arrow join-item border-base-300 collapse border">
    <input type="checkbox" />
    <div className="collapse-title text-lg font-semibold">{title}</div>
    <div className="collapse-content">{children}</div>
  </div>
);
