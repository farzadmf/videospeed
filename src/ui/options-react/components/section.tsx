import { ReactNode } from 'react';

type Props = {
  title: string;
  children: ReactNode;
};

export const Section = ({ title, children }: Props) => (
  <div className="collapse-arrow border-base-300 bg-base-200 rounded-box collapse border shadow-sm">
    <input type="checkbox" />
    <div className="collapse-title text-lg font-semibold">{title}</div>
    <div className="collapse-content text-base">{children}</div>
  </div>
);
