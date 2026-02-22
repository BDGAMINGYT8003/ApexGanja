import { useEffect, useState } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../components/ui/Card';

const TabContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  background: ${({ theme }) => theme.secondary};
  padding: 0.25rem;
  border-radius: 12px;
  width: fit-content;
`;

const Tab = styled(motion.button)`
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  color: ${({ isActive, theme }) => isActive ? (theme.theme === 'dark' ? '#fff' : theme.primary) : theme.text};
  background: ${({ isActive, theme }) => isActive ? theme.card : 'transparent'};
  box-shadow: ${({ isActive }) => isActive ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'};
  position: relative;
  z-index: 1;
  cursor: pointer;
  border: none;
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const RankCard = styled(Card)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
`;

const RankInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const RankNumber = styled.div`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  color: ${({ theme, rank }) => {
    if (rank === 1) return '#FFD700'; // Gold
    if (rank === 2) return '#C0C0C0'; // Silver
    if (rank === 3) return '#CD7F32'; // Bronze
    return theme.text;
  }};
  font-size: 1.2rem;
`;

const UserDetails = styled.div`
  display: flex;
  flex-direction: column;
`;

const UserName = styled.span`
  font-weight: 700;
  font-size: 1rem;
`;

const UserSub = styled.span`
  font-size: 0.8rem;
  opacity: 0.6;
`;

const XPBadge = styled.div`
  background: ${({ theme }) => theme.primary}15;
  color: ${({ theme }) => theme.primary};
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.9rem;
`;

export default function Leaderboard() {
  const [data, setData] = useState({ current: [], history: [] });
  const [view, setView] = useState('current');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/leaderboard')
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading...</p>;

  const displayData = view === 'current' ? data.current : (data.history[0]?.leaderboard || []);

  return (
    <div>
      <motion.h1
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        style={{ marginBottom: '1.5rem' }}
      >
        Leaderboard
      </motion.h1>

      <TabContainer>
        <Tab
            isActive={view === 'current'}
            onClick={() => setView('current')}
            whileTap={{ scale: 0.95 }}
        >
            Current Month
        </Tab>
        <Tab
            isActive={view === 'history'}
            onClick={() => setView('history')}
            whileTap={{ scale: 0.95 }}
        >
            History
        </Tab>
      </TabContainer>

      <List>
        <AnimatePresence mode="popLayout">
          {displayData.map((user, index) => (
            <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
            >
                <RankCard hoverEffect>
                    <RankInfo>
                        <RankNumber rank={index + 1}>{index + 1}</RankNumber>
                        <UserDetails>
                            <UserName>User {user.id.slice(0, 4)}...</UserName>
                            <UserSub>Level {user.level}</UserSub>
                        </UserDetails>
                    </RankInfo>
                    <XPBadge>{user.total_xp.toLocaleString()} XP</XPBadge>
                </RankCard>
            </motion.div>
          ))}
        </AnimatePresence>
        {displayData.length === 0 && <p>No data available.</p>}
      </List>
    </div>
  );
}
