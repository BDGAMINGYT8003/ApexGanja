import styled from 'styled-components';
import { motion } from 'framer-motion';

const Wrapper = styled.div`
  position: relative;
  width: 100%;
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({ theme }) => theme.text};
  margin-bottom: 0.5rem;
  opacity: 0.8;
`;

const StyledInput = styled(motion.input)`
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  color: ${({ theme }) => theme.text};
  background: ${({ theme }) => theme.secondary};
  border: 2px solid ${({ theme }) => theme.border};
  border-radius: 10px;
  outline: none;
  transition: all 0.2s ease;

  &:focus {
    border-color: ${({ theme }) => theme.primary};
    box-shadow: 0 0 0 4px ${({ theme }) => theme.primary}20;
  }

  &::placeholder {
    color: ${({ theme }) => theme.text}60;
  }
`;

const Input = ({ label, ...props }) => {
  return (
    <Wrapper>
      {label && <Label>{label}</Label>}
      <StyledInput
        whileFocus={{ scale: 1.01 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        {...props}
      />
    </Wrapper>
  );
};

export default Input;
