import { captureKey, displayLabelForCode } from '../key-capture';

type Mods = { alt: boolean; shift: boolean; ctrl: boolean };

type ModifiersProps = {
  mods: Mods;
  onChange: (mods: Mods) => void;
};

export const Modifiers = ({ mods, onChange }: ModifiersProps) => (
  <div className="flex flex-col gap-1">
    {(['alt', 'shift', 'ctrl'] as const).map((m) => (
      <label key={m} className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="checkbox checkbox-sm"
          checked={mods[m]}
          onChange={(e) => onChange({ ...mods, [m]: e.target.checked })}
        />
        {m.toUpperCase()}
      </label>
    ))}
  </div>
);

type KeyInputProps = {
  code: string;
  onCapture: (code: string, mods: Mods) => void;
};

// Records a physical key on keydown; also lifts the modifiers held during
// capture up to the caller (which reflects them in the modifier checkboxes).
export const KeyInput = ({ code, onCapture }: KeyInputProps) => (
  <input
    className="input input-bordered input-sm w-full"
    type="text"
    readOnly
    placeholder="press a key"
    value={displayLabelForCode(code)}
    onKeyDown={(e) => {
      const result = captureKey(e);
      e.preventDefault();
      e.stopPropagation();

      if (result === null) {
        return;
      }
      if (result === 'clear') {
        onCapture('', { alt: false, shift: false, ctrl: false });
        return;
      }

      onCapture(result.code, { alt: result.alt, shift: result.shift, ctrl: result.ctrl });
    }}
  />
);
