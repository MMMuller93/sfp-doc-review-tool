/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        stone: {
          950: '#0a0908',
          925: '#100f0e',
          900: '#1c1917',
        },
        bronze: {
          500: '#bf9f75',
          400: '#ccb391',
          200: '#e6d9c9',
          50: '#f2ece4',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Newsreader', 'Georgia', 'serif'],
      },
      backgroundImage: {
        'grid-pattern': `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h60v60H0z' fill='none'/%3E%3Cpath d='M0 0h1v60H0zM0 0h60v1H0z' fill='%23bf9f75' fill-opacity='0.05'/%3E%3C/svg%3E")`,
      },
    },
  },
  plugins: [],
}
