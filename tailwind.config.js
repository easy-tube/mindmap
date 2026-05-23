/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Reserved spot for a brand palette once the design lands.
        // For now: neutral-* + a single accent. Keep accent flexible
        // so we can A/B-test it before committing to the brand color.
        accent: {
          DEFAULT: '#22d3ee',
          fg: '#082f37',
        },
      },
    },
  },
  plugins: [],
}
