import styled, { css } from 'styled-components';
import { motion } from 'framer-motion';

const variants = {
  primary: css`
    background: ${({ theme }) => theme.primary};
    color: white;
    border: none;
    box-shadow: 0 4px 14px 0 rgba(233, 30, 99, 0.39);

    &:hover {
      box-shadow: 0 6px 20px rgba(233, 30, 99, 0.23);
    }
  `,
  secondary: css`
    background: ${({ theme }) => theme.secondary};
    color: ${({ theme }) => theme.text};
    border: 1px solid ${({ theme }) => theme.border};

    &:hover {
      background: ${({ theme }) => theme.hover};
    }
  `,
  outline: css`
    background: transparent;
    color: ${({ theme }) => theme.primary};
    border: 1px solid ${({ theme }) => theme.primary};

    &:hover {
      background: ${({ theme }) => theme.primary}10; /* 10% opacity */
    }
  `,
  ghost: css`
    background: transparent;
    color: ${({ theme }) => theme.text};

    &:hover {
      background: ${({ theme }) => theme.hover};
    }
  `
};

const StyledButton = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 12px;
  cursor: pointer;
  outline: none;
  position: relative;
  overflow: hidden;
  transition: all 0.2s ease-in-out;
  width: ${({ fullWidth }) => fullWidth ? '100%' : 'auto'};

  /* Apply Variant Styles */
  ${({ variant }) => variants[variant] || variants.primary}

  /* Disabled State */
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
    pointer-events: none;
  }
`;

const Button = ({ children, variant = 'primary', fullWidth = false, ...props }) => {
  return (
    <StyledButton
      variant={variant}
      fullWidth={fullWidth}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      {...props}
    >
      {children}
    </StyledButton>
  );
};

export default Button;
