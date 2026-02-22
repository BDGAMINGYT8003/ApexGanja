import { useEffect, useState } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import Card from '../components/ui/Card';

const Section = styled.section`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  margin-bottom: 1rem;
  opacity: 0.9;
`;

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
`;

const StatCard = styled(Card)`
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 800;
  color: ${({ theme }) => theme.primary};
`;

const StatLabel = styled.div`
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.6;
`;

const HistoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const HistoryCard = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const WinnerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const Winner = styled.div`
  background: ${({ theme }) => theme.secondary};
  padding: 0.5rem;
  border-radius: 8px;
  text-align: center;
  font-size: 0.8rem;

  strong {
    display: block;
    color: ${({ theme, rank }) => {
        if (rank === 1) return '#FFD700';
        if (rank === 2) return '#C0C0C0';
        if (rank === 3) return '#CD7F32';
        return theme.text;
    }};
  }
`;

export default function Lottery() {
  const [data, setData] = useState({ current: {}, history: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/lottery')
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading lottery...</p>;

  return (
    <div>
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Lottery
      </motion.h1>

      <Section>
        <SectionTitle>Current Month Status</SectionTitle>
        <StatGrid>
            <StatCard hoverEffect initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                <StatValue>{data.current.participants}</StatValue>
                <StatLabel>Participants</StatLabel>
            </StatCard>
            <StatCard hoverEffect initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
                <StatValue>{data.current.totalTickets}</StatValue>
                <StatLabel>Total Tickets</StatLabel>
            </StatCard>
        </StatGrid>
      </Section>

      <Section>
        <SectionTitle>Previous Winners</SectionTitle>
        <HistoryList>
            {data.history.length === 0 ? <p>No history yet.</p> : (
                data.history.map((h, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + (i * 0.1) }}
                    >
                        <HistoryCard hoverEffect>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <h3>{h.month}</h3>
                                <span style={{ opacity: 0.6 }}>{h.lottery.total_tickets} Tickets</span>
                            </div>
                            <WinnerGrid>
                                {h.lottery.winners.map(w => (
                                    <Winner key={w.rank} rank={w.rank}>
                                        <strong>#{w.rank}</strong>
                                        User {w.id.slice(0, 4)}
                                    </Winner>
                                ))}
                            </WinnerGrid>
                        </HistoryCard>
                    </motion.div>
                ))
            )}
        </HistoryList>
      </Section>
    </div>
  );
}
