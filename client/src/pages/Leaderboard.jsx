import { useEffect, useState } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import Card from '../components/Card';

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
`;

const Th = styled.th`
  text-align: left;
  padding: 1rem;
  background-color: ${({ theme }) => theme.secondary};
  color: ${({ theme }) => theme.text};
`;

const Td = styled.td`
  padding: 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.border};
`;

const TabContainer = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
`;

const Tab = styled.button`
  background: ${({ $active, theme }) => $active ? theme.primary : 'transparent'};
  color: ${({ $active, theme }) => $active ? 'white' : theme.text};
  border: 1px solid ${({ theme }) => theme.primary};
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
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

  if (loading) return <p>Loading leaderboard...</p>;

  const displayData = view === 'current' ? data.current : (data.history[0]?.leaderboard || []);
  const historyMonth = view === 'history' ? (data.history[0]?.month || 'No History') : '';

  return (
    <div>
      <h1>Leaderboard</h1>
      <TabContainer>
        <Tab $active={view === 'current'} onClick={() => setView('current')}>Current</Tab>
        <Tab $active={view === 'history'} onClick={() => setView('history')}>History ({historyMonth})</Tab>
      </TabContainer>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Rank</Th>
              <Th>User ID</Th>
              <Th>Level</Th>
              <Th>XP</Th>
            </tr>
          </thead>
          <tbody>
            {displayData.map((user, index) => (
              <tr key={user.id}>
                <Td>#{index + 1}</Td>
                <Td>{user.id}</Td>
                <Td>{user.level}</Td>
                <Td>{user.total_xp}</Td>
              </tr>
            ))}
            {displayData.length === 0 && <tr><Td colSpan="4">No data available.</Td></tr>}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
