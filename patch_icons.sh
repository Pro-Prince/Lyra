sed -i 's/<Home className="w-4 h-4 text-\[var(--text-muted)\]" \/>/<Home className="w-4 h-4" style={{ color: activeAccent }} \/>/g' src/pages/Chat.tsx
sed -i 's/<User className="w-4 h-4 text-\[var(--text-muted)\]" \/>/<User className="w-4 h-4" style={{ color: activeAccent }} \/>/g' src/pages/Chat.tsx
