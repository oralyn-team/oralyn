/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    screens: {
      xs: '320px',
      sm: '480px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0B4F5E',
          light: '#0E6073',
          dark: '#073642',
          hover: '#0A4452',
        },
        teal: {
          DEFAULT: '#3ECFCF',
          light: '#7ECECE',
          muted: '#5A8A8A',
          border: '#C7E8E8',
          soft: '#E5F4F4',
          bg: '#EAF6F6',
          panel: '#F7FDFD',
          info: '#F0FAFA',
        },
        dark: {
          bg: '#0F172A',
          card: '#1E293B',
          border: '#334155',
          hover: '#334155',
          text: '#F8FAFC',
          muted: '#94A3B8',
          input: '#1E293B',
        },
        status: {
          green: '#2E7D32',
          greenBg: '#E8F5E9',
          amber: '#D97706',
          amberBg: '#FEF3C7',
          amberMid: '#F59E0B',
          blue: '#1D4ED8',
          blueBg: '#EFF6FF',
          blueMid: '#60A5FA',
          red: '#DC2626',
          redBg: '#FEF2F2',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
      },
      boxShadow: {
        'soft-sm': '0 2px 8px -2px rgba(11, 79, 94, 0.06), 0 1px 4px -1px rgba(0, 0, 0, 0.04)',
        'soft-md': '0 4px 16px -4px rgba(11, 79, 94, 0.1), 0 2px 6px -2px rgba(0, 0, 0, 0.05)',
        'soft-lg': '0 10px 30px -5px rgba(11, 79, 94, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.04)',
        'glow-teal': '0 0 15px rgba(62, 207, 207, 0.4)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      borderWidth: {
        DEFAULT: '1px',
        '0.5': '0.5px',
      },
      keyframes: {
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        }
      },
      animation: {
        'slide-in-right': 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-subtle': 'pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
};