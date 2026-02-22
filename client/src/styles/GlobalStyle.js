import { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  :root {
    --primary-color: #E91E63;
    --accent-color: #66FCF1;
  }

  body {
    background-color: ${({ theme }) => theme.bg};
    color: ${({ theme }) => theme.text};
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    transition: background-color 0.2s ease, color 0.2s ease;
    margin: 0;
    padding: 0;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow-x: hidden; /* Prevent horizontal scroll */
  }

  /* Mobile-first: No horizontal scroll */
  #root {
    width: 100%;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  /* Custom Scrollbar */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  ::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.secondary};
  }
  ::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.primary};
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.accent};
  }

  a {
    color: inherit;
    text-decoration: none;
    cursor: pointer;
  }

  button {
    font-family: inherit;
    cursor: pointer;
    border: none;
    outline: none;
    background: transparent;
  }

  * {
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent; /* Remove mobile tap highlight */
  }

  /* Typography Scale */
  h1, h2, h3, h4, h5, h6 {
    margin-top: 0;
    font-weight: 700;
    line-height: 1.2;
    color: ${({ theme }) => theme.theme === 'light' ? '#111' : '#fff'};
  }

  p {
    line-height: 1.6;
    margin-bottom: 1rem;
  }
`;

export default GlobalStyle;
