import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    // Media query to detect system preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      const isLight = e.matches;
      setTheme(isLight ? 'light' : 'dark');
      
      const root = document.documentElement;
      if (isLight) {
        root.classList.add('light');
        root.classList.remove('dark');
      } else {
        root.classList.add('dark');
        root.classList.remove('light');
      }
    };

    // Initialize with current preference
    handleChange(mediaQuery);

    // Listen for changes
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  return { theme };
}
