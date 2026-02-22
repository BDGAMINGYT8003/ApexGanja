import { createContext, useContext, useEffect, useState } from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

const themes = {
  light: {
    bg: '#ffffff',
    text: '#1a1a1a',
    primary: '#E91E63',
    secondary: '#f3f4f6',
    accent: '#3b82f6',
    border: '#e5e7eb',
    card: '#ffffff'
  },
  dark: {
    bg: '#0f172a', // Deep blue/slate
    text: '#f3f4f6',
    primary: '#E91E63', // Pink
    secondary: '#1e293b',
    accent: '#60a5fa',
    border: '#334155',
    card: '#1e293b'
  }
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Check initial state from DOM to match FOUC script
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
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
