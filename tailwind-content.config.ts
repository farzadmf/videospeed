import daisyui from 'daisyui';
import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {},
  },
  plugins: [daisyui],
  prefix: 't-',
  daisyui: {
    prefix: 'd-',
  },
} satisfies Config;
