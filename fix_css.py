import re

with open('src/index.css', 'r') as f:
    css = f.read()

# First, clean up the messed up btn-primary active
css = re.sub(r'\.btn-primary:hover \{.*?\n\}', 
             '.btn-primary:hover {\n  transform: translateY(-1px);\n  filter: brightness(1.05);\n  box-shadow: none;\n}', 
             css, flags=re.DOTALL)
             
css = re.sub(r'\.btn-primary:active \{.*?\}', '', css, flags=re.DOTALL)

# Add active states properly
css = css.replace('.btn-primary:hover {\n  transform: translateY(-1px);\n  filter: brightness(1.05);\n  box-shadow: none;\n}',
                  '.btn-primary:hover {\n  transform: translateY(-1px);\n  filter: brightness(1.05);\n  box-shadow: none;\n}\n.btn-primary:active {\n  transform: translateY(0) scale(0.98);\n  filter: brightness(0.95);\n}')

css = css.replace('.btn-secondary:hover {\n  border-color: rgba(255, 182, 213, 0.24);\n  background: rgba(255, 143, 192, 0.04);\n  box-shadow: none;\n}',
                  '.btn-secondary:hover {\n  border-color: rgba(255, 182, 213, 0.24);\n  background: rgba(255, 143, 192, 0.04);\n  box-shadow: none;\n}\n.btn-secondary:active {\n  transform: translateY(0) scale(0.98);\n  background: rgba(255, 143, 192, 0.08);\n}')

css = css.replace('.icon-btn:hover {\n  background: rgba(255, 143, 192, 0.04);\n  border-color: rgba(255, 182, 213, 0.24);\n}',
                  '.icon-btn:hover {\n  background: rgba(255, 143, 192, 0.04);\n  border-color: rgba(255, 182, 213, 0.24);\n}\n.icon-btn:active {\n  transform: scale(0.92);\n  background: rgba(255, 143, 192, 0.08);\n}')

css = css.replace('.card-standard:hover,\n.feature-card:hover,\n.content-card:hover,\n.email-box:hover,\n.outfit-card:hover,\n.interactive-surface:hover {\n  transform: translateY(-2px);\n  border-color: rgba(255, 182, 213, 0.24);\n  box-shadow: none;\n}',
                  '.card-standard:hover,\n.feature-card:hover,\n.content-card:hover,\n.email-box:hover,\n.outfit-card:hover,\n.interactive-surface:hover {\n  transform: translateY(-2px);\n  border-color: rgba(255, 182, 213, 0.24);\n  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);\n}\n.card-standard:active,\n.feature-card:active,\n.content-card:active,\n.email-box:active,\n.outfit-card:active,\n.interactive-surface:active {\n  transform: translateY(0) scale(0.99);\n  box-shadow: none;\n}')

with open('src/index.css', 'w') as f:
    f.write(css)
