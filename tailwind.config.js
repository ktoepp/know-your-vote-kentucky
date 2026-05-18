/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // Dark mode is not in scope for v1.
  theme: {
    extend: {
      colors: {
        // Brand
        primary:           'var(--primary)',
        'primary-dark':    'var(--primary-dark)',
        'primary-light':   'var(--primary-light)',
        'primary-50':      'var(--primary-50)',

        // Surfaces & neutrals
        'bg-surface':      'var(--bg-surface)',
        'bg-page':         'var(--bg-page)',
        'bg-tertiary':     'var(--bg-tertiary)',
        'border-light':    'var(--border-light)',
        border:            'var(--border)',

        // Text
        'text-primary':    'var(--text-primary)',
        'text-secondary':  'var(--text-secondary)',
        'text-tertiary':   'var(--text-tertiary)',
        'text-muted':      'var(--text-muted)',

        // Semantic
        success:           'var(--success)',
        'success-tint':    'var(--success-tint)',
        error:             'var(--error)',
        'error-tint':      'var(--error-tint)',
        warning:           'var(--warning)',

        // Chamber & party
        'chamber-senate':  'var(--chamber-senate)',
        'chamber-house':   'var(--chamber-house)',
        'party-r':         'var(--party-r)',
        'party-d':         'var(--party-d)',
        'party-i':         'var(--party-i)',
        'party-fg':        'var(--party-fg)',
      },
      fontFamily: {
        display: ['var(--font-heading)'],
        sans:    ['var(--font-sans)'],
        mono:    ['var(--font-mono)'],
      },
      borderRadius: {
        md:   '8px',
        full: '9999px',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
      },
      maxWidth: {
        content: '1200px',
        hero:    '960px',
      },
    },
  },
  plugins: [],
};
