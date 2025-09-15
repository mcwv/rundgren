// tailwind.config.ts

import type { Config } from 'tailwindcss';
import { fontFamily } from 'tailwindcss/defaultTheme';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // This adds the 'Inter' font to the Tailwind font family utility
        sans: ['Inter', ...fontFamily.sans],
      },
    },
  },
  plugins: [],
};
export default config;

// src/app/globals.css

/* This imports the Inter font from Google Fonts. */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

/* Apply the 'Inter' font to the entire body of the application. */
body {
  font-family: 'Inter', sans-serif;
}
