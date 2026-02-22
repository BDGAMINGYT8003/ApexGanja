import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

const Container = styled.div`
  display: flex;
  min-height: 100vh;
`;

const Sidebar = styled.nav`
  width: 250px;
  background-color: ${({ theme }) => theme.secondary};
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Main = styled(motion.main)`
  flex: 1;
  padding: 2rem;
  background-color: ${({ theme }) => theme.bg};
  overflow-y: auto;
`;

const NavLink = styled(Link)`
  color: ${({ theme, active }) => active ? theme.primary : theme.text};
  font-weight: ${({ active }) => active ? 'bold' : 'normal'};
  padding: 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s;
  display: block;

  &:hover {
    background-color: ${({ theme }) => theme.border};
  }
`;

const ThemeButton = styled.button`
  margin-top: auto;
  background: none;
  border: 1px solid ${({ theme }) => theme.border};
  color: ${({ theme }) => theme.text};
  padding: 0.5rem;
  border-radius: 4px;
`;

const LogoutButton = styled.button`
  background: ${({ theme }) => theme.primary};
  color: white;
  border: none;
  padding: 0.5rem;
  border-radius: 4px;
`;

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  return (
    <Container>
      <Sidebar>
        <h2 style={{ color: theme === 'dark' ? 'white' : 'black' }}>Apex Girls</h2>
        <NavLink to="/dashboard" active={location.pathname === '/dashboard' ? 1 : 0}>Dashboard</NavLink>
        <NavLink to="/market" active={location.pathname === '/market' ? 1 : 0}>Marketplace</NavLink>
        <NavLink to="/leaderboard" active={location.pathname === '/leaderboard' ? 1 : 0}>Leaderboard</NavLink>
        <NavLink to="/lottery" active={location.pathname === '/lottery' ? 1 : 0}>Lottery</NavLink>

        <ThemeButton onClick={toggleTheme}>
          Theme: {theme === 'light' ? 'Light' : 'Dark'}
        </ThemeButton>
        <LogoutButton onClick={logout}>Logout</LogoutButton>
      </Sidebar>
      <AnimatePresence mode="wait">
        <Main
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
        >
          <Outlet />
        </Main>
      </AnimatePresence>
    </Container>
  );
}
