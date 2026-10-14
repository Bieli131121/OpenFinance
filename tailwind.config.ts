import type { Config } from 'tailwindcss';
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: { extend: { colors: { brand: { 50: '#f0f7ff', 500: '#3b6fe0', 600: '#2f58c4', 900: '#101b3d' } } } },
  plugins: [],
};
export default config;
