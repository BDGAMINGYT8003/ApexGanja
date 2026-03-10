import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: '#E91E63',
          hover: '#C2185B',
        },
        secondary: {
          DEFAULT: '#6B7280',
          hover: '#4B5563',
        },
        success: '#00FF00',
        error: '#FF0000',
        warning: '#FFA500',
        card: 'var(--card-bg)',
      },
    },
  },
  plugins: [],
};
export default config;
