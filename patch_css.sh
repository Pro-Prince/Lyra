cat << 'INNER_EOF' >> src/index.css

.companion-screen {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  height: calc(100dvh - 72px); /* minus header */
}
.companion-viewport {
  flex: 1 1 auto;
  min-height: 0;
  position: relative; /* so the control bar can anchor to its bottom, not the page's */
}
.control-bar {
  position: absolute;
  bottom: var(--space-md);
  left: 0;
  right: 0;
  flex: 0 0 auto;
}
INNER_EOF
