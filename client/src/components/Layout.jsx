import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Container = styled.div`
  display: flex;
  min-height: 100vh;
  flex-direction: column;

  @media (min-width: 768px) {
    flex-direction: row;
  }
`;

const Sidebar = styled.nav`
  display: none;

  @media (min-width: 768px) {
    display: flex;
    flex-direction: column;
    width: 280px;
    height: 100vh;
    padding: 2rem;
    position: sticky;
    top: 0;
    border-right: 1px solid ${({ theme }) => theme.border};
    background: ${({ theme }) => theme.secondary};
    z-index: 10;
  }
`;

const MobileNav = styled.nav`
  display: flex;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: ${({ theme }) => theme.bg};
  border-top: 1px solid ${({ theme }) => theme.border};
  justify-content: space-around;
  align-items: center;
  z-index: 50;
  padding-bottom: env(safe-area-inset-bottom);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  background: ${({ theme }) => theme.theme === 'dark' ? 'rgba(11, 12, 16, 0.8)' : 'rgba(252, 252, 252, 0.8)'};

  @media (min-width: 768px) {
    display: none;
  }
`;

const NavLinkStyled = styled(Link)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  color: ${({ $active, theme }) => $active ? theme.primary : theme.text};
  opacity: ${({ $active }) => $active ? 1 : 0.6};
  font-size: 0.75rem;
  transition: all 0.2s;
  position: relative;
  text-decoration: none;

  &:hover {
    opacity: 1;
    color: ${({ theme }) => theme.primary};
  }

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: flex-start;
    font-size: 1rem;
    font-weight: 500;
    padding: 0.75rem 1rem;
    border-radius: 12px;
    margin-bottom: 0.5rem;
    background: ${({ $active, theme }) => $active ? `${theme.primary}15` : 'transparent'};

    &:hover {
      background: ${({ theme }) => theme.secondary};
    }
  }
`;

const NavButtonStyled = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  color: ${({ theme }) => theme.text};
  opacity: 0.6;
  font-size: 0.75rem;
  transition: all 0.2s;
  position: relative;
  border: none;
  background: transparent;
  cursor: pointer;

  &:hover {
    opacity: 1;
    color: ${({ theme }) => theme.primary};
  }

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: flex-start;
    font-size: 1rem;
    font-weight: 500;
    padding: 0.75rem 1rem;
    border-radius: 12px;
    margin-bottom: 0.5rem;
    width: 100%;

    &:hover {
      background: ${({ theme }) => theme.secondary};
    }
  }
`;

const NavIcon = styled.span`
  font-size: 1.5rem;
  margin-bottom: 2px;

  @media (min-width: 768px) {
    margin-bottom: 0;
    margin-right: 1rem;
  }
`;

const Main = styled(motion.main)`
  flex: 1;
  padding: 1.5rem;
  padding-bottom: 6rem; /* Space for mobile nav */
  background-color: ${({ theme }) => theme.bg};
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden;

  @media (min-width: 768px) {
    padding: 3rem;
    padding-bottom: 3rem;
  }
`;

const ThemeToggle = styled(motion.button)`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  color: ${({ theme }) => theme.text};
  cursor: pointer;

  @media (min-width: 768px) {
    margin-top: auto;
    width: 100%;
    border-radius: 12px;
    height: auto;
    padding: 1rem;
    justify-content: flex-start;
    gap: 1rem;
  }
`;

const Brand = styled.div`
  font-size: 1.5rem;
  font-weight: 800;
  margin-bottom: 3rem;
  color: ${({ theme }) => theme.primary};
  letter-spacing: -0.05em;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &::before {
    content: '';
    width: 8px;
    height: 8px;
    background: ${({ theme }) => theme.accent};
    border-radius: 50%;
    display: inline-block;
  }
`;

// Helper component for Theme Toggle Text
const DesktopText = styled.span`
  font-size: 1rem;
  font-weight: 500;
  display: none;
  @media (min-width: 768px) {
    display: inline;
  }
`;

export default function Layout() {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { path: '/market', label: 'Market', icon: '🛒' },
    { path: '/leaderboard', label: 'Ranks', icon: '🏆' },
    { path: '/lottery', label: 'Lottery', icon: '🎟️' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <Container>
      {/* Desktop Sidebar */}
      <Sidebar>
        <Brand>Apex Girls</Brand>
        {navItems.map((item) => (
            <NavLinkStyled
            key={item.path}
            to={item.path}
            $active={isActive(item.path) ? 1 : 0}
            >
            <NavIcon>{item.icon}</NavIcon>
            <span>{item.label}</span>
            </NavLinkStyled>
        ))}

        <ThemeToggle
            onClick={toggleTheme}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
        >
            <span>{theme === 'dark' ? '🌙' : '☀️'}</span>
            <DesktopText>
                {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </DesktopText>
        </ThemeToggle>

        <NavButtonStyled onClick={logout} style={{ marginTop: '1rem' }}>
            <NavIcon>🚪</NavIcon>
            <span>Logout</span>
        </NavButtonStyled>
      </Sidebar>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        <Main
            key={location.pathname}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} // Apple-esque bezier
        >
          <Outlet />
        </Main>
      </AnimatePresence>

      {/* Mobile Bottom Bar */}
      <MobileNav>
        {navItems.map((item) => (
            <NavLinkStyled
            key={item.path}
            to={item.path}
            $active={isActive(item.path) ? 1 : 0}
            >
            <NavIcon>{item.icon}</NavIcon>
            <span style={{ fontSize: '0.6rem' }}>{item.label}</span>
            </NavLinkStyled>
        ))}
        <NavButtonStyled onClick={toggleTheme}>
            <NavIcon>{theme === 'dark' ? '🌙' : '☀️'}</NavIcon>
            <span style={{ fontSize: '0.6rem' }}>Theme</span>
        </NavButtonStyled>
      </MobileNav>
    </Container>
  );
}
