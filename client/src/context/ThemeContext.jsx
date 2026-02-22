import { createContext, useContext, useEffect, useState } from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

const themes = {
  light: {
    bg: '#fcfcfc', // Creamy Light
    text: '#1a1a1a', // Dark Gray Text
    primary: '#E91E63', // Deep Pink
    secondary: '#f3f4f6', // Light Gray
    accent: '#3b82f6', // Bright Blue
    border: '#e5e7eb', // Light Border
    card: '#ffffff', // White Card
    hover: '#f9fafb', // Hover State
    shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
  },
  dark: {
    bg: '#0B0C10', // Deep Black/Blue (Cyberpunk-esque)
    text: '#C5C6C7', // Soft Gray Text
    primary: '#E91E63', // Neon Pink
    secondary: '#1F2833', // Dark Slate
    accent: '#66FCF1', // Cyan Accent
    border: '#1F2833', // Dark Border
    card: '#1F2833', // Dark Card
    hover: '#2a3642', // Hover State
    shadow: '0 4px 14px 0 rgba(0, 0, 0, 0.5)'
  }
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Synchronous local storage read
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark'; // Fallback
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <StyledThemeProvider theme={themes[theme]}>
        {children}
      </StyledThemeProvider>
    </ThemeContext.Provider>
  );
};
