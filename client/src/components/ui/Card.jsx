import styled from 'styled-components';
import { motion } from 'framer-motion';

const StyledCard = styled(motion.div)`
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: ${({ theme }) => theme.shadow};
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: border-color 0.2s, box-shadow 0.2s;
  overflow: hidden;

  /* Glassmorphism Effect for Dark Mode */
  ${({ theme }) => theme.theme === 'dark' && `
    background: rgba(31, 40, 51, 0.7);
    border-color: rgba(255, 255, 255, 0.1);
  `}

  &:hover {
    border-color: ${({ theme, hoverEffect }) => hoverEffect ? theme.primary : theme.border};
    box-shadow: ${({ theme, hoverEffect }) => hoverEffect ? `0 8px 30px ${theme.primary}20` : theme.shadow};
  }
`;

const Card = ({ children, hoverEffect = false, ...props }) => {
  return (
    <StyledCard
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      hoverEffect={hoverEffect}
      {...props}
    >
      {children}
    </StyledCard>
  );
};

export default Card;
