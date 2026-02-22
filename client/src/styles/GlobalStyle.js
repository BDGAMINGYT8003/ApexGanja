import { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  body {
    background-color: ${({ theme }) => theme.bg};
    color: ${({ theme }) => theme.text};
    font-family: 'Inter', sans-serif;
    transition: background-color 0.3s, color 0.3s;
    margin: 0;
    padding: 0;
  }

  a {
    color: ${({ theme }) => theme.accent};
    text-decoration: none;
  }

  button {
    font-family: inherit;
    cursor: pointer;
  }

  * {
    box-sizing: border-box;
  }
`;

export default GlobalStyle;
