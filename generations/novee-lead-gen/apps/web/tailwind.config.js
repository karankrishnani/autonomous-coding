/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary (Blue)
        primary: {
          DEFAULT: '#2563EB',
          dark: '#1E40AF',
          light: '#60A5FA',
        },
        // Secondary (Green)
        secondary: {
          DEFAULT: '#10B981',
          light: '#34D399',
        },
        // Accent (Amber)
        accent: {
          DEFAULT: '#F59E0B',
          light: '#FBBF24',
        },
        // Surface colors
        surface: {
          DEFAULT: '#F8FAFC',
          dark: '#1F2937',
        },
        // Text colors
        text: {
          primary: '#111827',
          secondary: '#6B7280',
          muted: '#9CA3AF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
    },
  },
  plugins: [],
};
