import { ReactNode } from 'react';

type CheckboxProps = {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export const CheckboxField = ({ label, checked, onChange }: CheckboxProps) => (
  <label className="flex cursor-pointer items-start gap-3 py-1.5">
    <input type="checkbox" className="checkbox mt-0.5" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span className="text-base">{label}</span>
  </label>
);

type TextProps = {
  label: ReactNode;
  value: string | number;
  type?: 'text' | 'number';
  onChange: (value: string) => void;
};

export const TextField = ({ label, value, type = 'text', onChange }: TextProps) => (
  <label className="flex items-center gap-3 py-1.5">
    <span className="w-56 text-base">{label}</span>
    <input
      type={type}
      className="input input-bordered flex-1"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </label>
);

type SelectProps = {
  label: ReactNode;
  value: string | number;
  options: { value: string | number; label: string }[];
  onChange: (value: string) => void;
};

export const SelectField = ({ label, value, options, onChange }: SelectProps) => (
  <label className="flex items-center gap-3 py-1.5">
    <span className="w-56 text-base">{label}</span>
    <select className="select select-bordered flex-1" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </label>
);
