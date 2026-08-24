import re

with open('src/index.css', 'r') as f:
    css = f.read()

# Let's find the standard buttons block and replace the whole thing cleanly.
start_marker = "/* Standardized Button System */"
end_marker = "/* Standard Card Surfaces & Interactive Hover Uplift */"

btn_css = """/* Standardized Button System */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  font-family: var(--font-body);
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: transform var(--transition-normal), box-shadow var(--transition-normal), background var(--transition-normal), border-color var(--transition-normal), filter var(--transition-normal);
}
.btn-lg { padding: 14px 28px; font-size: 16px; gap: 8px; }
.btn-sm { padding: 8px 20px; font-size: 14px; gap: 6px; }

.btn-primary {
  background: var(--accent-primary);
  color: var(--bg-base);
  box-shadow: none;
}
.btn-primary:hover {
  transform: translateY(-1px);
  filter: brightness(1.05);
  box-shadow: none;
}
.btn-primary:active {
  transform: translateY(0) scale(0.98);
  filter: brightness(0.95);
}

.btn-secondary {
  background: var(--bg-surface);
  color: var(--text-primary);
  border: 1px solid rgba(255, 182, 213, 0.16);
  box-shadow: none;
}
.btn-secondary:hover {
  border-color: rgba(255, 182, 213, 0.24);
  background: rgba(255, 143, 192, 0.04);
  box-shadow: none;
}
.btn-secondary:active {
  transform: translateY(0) scale(0.98);
  background: rgba(255, 143, 192, 0.08);
}

.btn:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

.btn:disabled,
.btn[disabled] {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

.icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 9999px;
  background: var(--bg-surface);
  border: 1px solid rgba(255, 182, 213, 0.16);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary);
  transition: background var(--transition-normal), border-color var(--transition-normal), transform var(--transition-fast);
}
.icon-btn:hover {
  background: rgba(255, 143, 192, 0.04);
  border-color: rgba(255, 182, 213, 0.24);
}
.icon-btn:active {
  transform: scale(0.92);
  background: rgba(255, 143, 192, 0.08);
}

/* Standard Card Surfaces & Interactive Hover Uplift */
.card-standard,
.feature-card,
.content-card,
.email-box,
.outfit-card,
.interactive-surface {
  transition: transform var(--transition-normal), border-color var(--transition-normal), box-shadow var(--transition-normal);
}
.card-standard:hover,
.feature-card:hover,
.content-card:hover,
.email-box:hover,
.outfit-card:hover,
.interactive-surface:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 182, 213, 0.24);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
.card-standard:active,
.feature-card:active,
.content-card:active,
.email-box:active,
.outfit-card:active,
.interactive-surface:active {
  transform: translateY(0) scale(0.99);
  box-shadow: none;
}
"""

start_idx = css.find(start_marker)
# Find the next block after the cards
end_idx = css.find(".card-standard {")

if start_idx != -1 and end_idx != -1:
    new_css = css[:start_idx] + btn_css + css[end_idx:]
    with open('src/index.css', 'w') as f:
        f.write(new_css)
else:
    print("Could not find markers!")

