/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sage: {
          50:  '#f4f7f0',
          100: '#e7ede0',
          200: '#d0dcc3',
          300: '#b3c49e',
          400: '#a3b18a',
          500: '#7d9464',
          600: '#637950',
          700: '#4f6041',
          800: '#414e36',
          900: '#37422e',
        },
        cream: {
          50:  '#fefcfa',
          100: '#f6f1e9',
          200: '#ede4d4',
          300: '#e0d0ba',
          400: '#d0b89a',
          500: '#be9d77',
          600: '#a8835c',
          700: '#8c6b4a',
          800: '#74593f',
          900: '#614b36',
        },
        peach: {
          50:  '#fdf6f2',
          100: '#faeae1',
          200: '#ebc7b2',
          300: '#e0a98c',
          400: '#d48a68',
          500: '#c56e48',
          600: '#a85838',
          700: '#8a4630',
          800: '#723b29',
          900: '#5f3224',
        },
        warmgray: {
          50:  '#faf9f7',
          100: '#f3f0ec',
          200: '#d6ccc2',
          300: '#c4b8ac',
          400: '#b0a093',
          500: '#98877a',
          600: '#7e6f63',
          700: '#685c52',
          800: '#564d45',
          900: '#48413a',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'glass-md': '0 12px 40px 0 rgba(31, 38, 135, 0.10)',
        'soft': '0 2px 16px 0 rgba(163, 177, 138, 0.15)',
        'soft-md': '0 4px 24px 0 rgba(163, 177, 138, 0.20)',
        'inner-soft': 'inset 0 2px 8px 0 rgba(163, 177, 138, 0.10)',
      },
      backgroundImage: {
        'gradient-sage': 'linear-gradient(135deg, #a3b18a 0%, #7d9464 100%)',
        'gradient-warm': 'linear-gradient(135deg, #f6f1e9 0%, #ebc7b2 100%)',
        'gradient-dusk': 'linear-gradient(135deg, #2d3b2a 0%, #1a2118 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'shimmer': 'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
