/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff8ff',
          100: '#dbeefe',
          200: '#bfe1fe',
          300: '#93cefd',
          400: '#60b3fa',
          500: '#3aa3eb',
          600: '#2586d0',
          700: '#1e6ba8',
          800: '#1f5a89',
          900: '#1d4d70',
        },
        ios: {
          gray: '#8e8e93',
          gray2: '#aeaeb2',
          gray3: '#c7c7cc',
          gray4: '#d1d1d6',
          gray5: '#e5e5ea',
          gray6: '#f2f2f7',
          bg: '#000000',
          bgElevated: '#1c1c1e',
          bgElevated2: '#2c2c2e',
          separator: 'rgba(84,84,88,0.6)',
        },
      },
      borderRadius: {
        ios: '10px',
        'ios-md': '14px',
        'ios-lg': '18px',
        'ios-xl': '22px',
        'ios-2xl': '28px',
      },
      boxShadow: {
        ios: '0 1px 3px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.18)',
        'ios-lg': '0 4px 16px rgba(0,0,0,0.22), 0 12px 32px rgba(0,0,0,0.28)',
        'ios-xl': '0 8px 28px rgba(0,0,0,0.28), 0 20px 48px rgba(0,0,0,0.32)',
        brand: '0 4px 14px rgba(58,163,235,0.35)',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'SF Pro Display', 'Inter', 'sans-serif'],
        body: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'Inter', 'sans-serif'],
        display: ['Integral CF', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Inter', 'sans-serif'],
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        ios: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
