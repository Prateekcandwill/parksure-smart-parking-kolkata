import type { Config } from 'tailwindcss'

const withOpacity = (variable: string) => `rgb(var(${variable}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        ink: withOpacity('--ink'),
        surface: withOpacity('--surface'),
        raised: withOpacity('--raised'),
        line: withOpacity('--line'),
        text: withOpacity('--text'),
        muted: withOpacity('--muted'),
        accent: withOpacity('--accent'),
        'accent-ink': withOpacity('--accent-ink'),
        violet: withOpacity('--violet'),
        success: withOpacity('--success'),
        warning: withOpacity('--warning'),
        danger: withOpacity('--danger'),
        info: withOpacity('--info'),
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        bevel:
          'inset 0 1px 0 rgba(255,255,255,.055), inset 0 -1px 0 rgba(0,0,0,.25), 0 18px 60px -30px rgba(0,0,0,.95)',
        lift: '0 24px 80px -34px rgba(0,0,0,.9), inset 0 1px 0 rgba(255,255,255,.05)',
        glow: '0 0 0 1px rgb(var(--accent) / .2), 0 18px 50px -22px rgb(var(--accent) / .45)',
        inset: 'inset 0 1px 0 rgba(255,255,255,.06)',
      },
      letterSpacing: {
        label: '0.14em',
        tighter2: '-0.045em',
      },
      backgroundImage: {
        'accent-sheen':
          'linear-gradient(135deg, rgb(var(--accent) / .22), transparent 55%)',
        'surface-sheen':
          'linear-gradient(155deg, rgba(255,255,255,.055), transparent 42%)',
        'reserved-pattern':
          'repeating-linear-gradient(135deg, rgb(var(--warning) / .45) 0 3px, transparent 3px 7px)',
        'grain':
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E\")",
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.55' },
        },
        rise: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scan: {
          from: { transform: 'translateY(-100%)' },
          to: { transform: 'translateY(400%)' },
        },
        typing: {
          '0%, 60%, 100%': { opacity: '0.35', transform: 'translateY(0)' },
          '30%': { opacity: '1', transform: 'translateY(-2px)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s linear infinite',
        'pulse-soft': 'pulseSoft 2.2s ease-in-out infinite',
        rise: 'rise .45s cubic-bezier(.2,.8,.2,1) both',
        scan: 'scan 3.6s linear infinite',
        typing: 'typing 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
