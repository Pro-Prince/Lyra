import re

with open('src/index.css', 'r') as f:
    css = f.read()

css = css.replace('transition: background-color 0.2s ease-in-out, border-color 0.2s ease-in-out, transform 0.2s ease-in-out;',
                  'transition: background-color var(--transition-normal), border-color var(--transition-normal), transform var(--transition-normal);')

css = css.replace('.glass-panel-interactive:hover {\n  background-color: rgba(36, 24, 35, 0.98);\n  border-color: rgba(255, 143, 192, 0.38);\n}',
                  '.glass-panel-interactive:hover {\n  background-color: rgba(36, 24, 35, 0.98);\n  border-color: rgba(255, 143, 192, 0.38);\n  transform: translateY(-1px);\n}\n.glass-panel-interactive:active {\n  transform: translateY(0) scale(0.99);\n}')

with open('src/index.css', 'w') as f:
    f.write(css)
