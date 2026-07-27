/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // The club deliberately prefers the classic serif look.
        //
        // This key must be `sans` because Tailwind's preflight applies
        // fontFamily.sans as the page default - so that is the knob that controls
        // body text, even though the value here is a serif stack.
        //
        // This previously read ['var(--font-inter)'], but that variable was never
        // defined anywhere, so the declaration was invalid and browsers fell back
        // to their default serif. The serif appearance was therefore accidental.
        // It is now explicit: same look, but intentional, and it will not change
        // if someone later "fixes" the missing variable.
        sans: ['Times New Roman', 'Times', 'serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}