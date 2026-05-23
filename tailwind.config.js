/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Single brand accent — chozen green. Used sparingly (links,
        // active states, focus rings). Body is pure black + off-white;
        // accent never carries large surfaces.
        chozen: {
          DEFAULT: '#00FF1E',
          soft: '#7FFF8E',     // hover state — slightly lighter, less intense
          dim: 'rgba(0, 255, 30, 0.06)',  // backdrop tint
        },
      },
      fontFamily: {
        // Inter for everything. Loaded via Google Fonts in index.html.
        // Falls back to system-ui (SF Pro on Mac, Segoe UI on Win) if
        // the network is down — both look Apple-ish.
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
      },
      letterSpacing: {
        // Apple-style tight tracking on display sizes.
        tightest: '-0.04em',
      },
    },
  },
  plugins: [],
}
