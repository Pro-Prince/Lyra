with open('src/index.css', 'r') as f:
    css = f.read()

theme_additions = """  --color-text-danger: var(--text-danger);
  
  /* Overrides for standard tailwind transitions */
  --default-transition-duration: 200ms;
  --default-transition-timing-function: cubic-bezier(0.2, 0.8, 0.2, 1);
"""

css = css.replace('  --color-text-danger: var(--text-danger);', theme_additions)
with open('src/index.css', 'w') as f:
    f.write(css)
