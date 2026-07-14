export type Theme = 'light' | 'dark' | 'system';

export const THEME_ORDER: Theme[] = ['light', 'dark', 'system'];

export const nextTheme = (theme: Theme): Theme => THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length];

// daisyUI reads data-theme on <html>. 'system' removes it so the --prefersdark
// media query decides light/dark from the OS preference.
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
}
