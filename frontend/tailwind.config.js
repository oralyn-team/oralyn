/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0B4F5E',
          light: '#0d6275',
          dark:  '#083d4a',
        },
        teal: {
          DEFAULT: '#3ECFCF',
          light:   '#7ECECE',
          muted:   '#5a8a8a',
          border:  '#C7E8E8',
          soft:    '#E5F4F4',
          bg:      '#EAF6F6',
          panel:   '#F7FDFD',
          info:    '#F0FAFA',
        },
        status: {
          green:      '#3B6D11',
          greenBg:    '#EAF3DE',
          amber:      '#854F0B',
          amberBg:    '#FAEEDA',
          amberMid:   '#EF9F27',
          blue:       '#185FA5',
          blueBg:     '#E6F1FB',
          blueMid:    '#85B7EB',
          red:        '#A32D2D',
          redBg:      '#FCEBEB',
        },
      },
      fontFamily: {
        sans:    ['"DM Sans"', 'sans-serif'],
        display: ['"DM Serif Display"', 'serif'],
      },
      borderWidth: {
        DEFAULT: '0.5px',
      },
    },
  },
  plugins: [],
};