import { useEffect, useState } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import Card from '../components/Card';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Highlight = styled.span`
  color: ${({ theme }) => theme.primary};
  font-weight: bold;
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
    <Container>
      <h1>Lottery System</h1>

      <Section>
        <h2>Current Month Status</h2>
        <Card>
            <p>Total Participants: <Highlight>{data.current.participants}</Highlight></p>
            <p>Total Tickets: <Highlight>{data.current.totalTickets}</Highlight></p>
            <p>Prize Pool: <Highlight>{data.current.prizePool}</Highlight></p>
        </Card>
      </Section>

      <Section>
        <h2>Previous Winners</h2>
        {data.history.length === 0 ? <p>No history available.</p> : (
            data.history.map((h, i) => (
                <Card key={i}>
                    <h3>{h.month}</h3>
                    <ul>
                        {h.lottery.winners.map(w => (
                            <li key={w.rank}>Rank {w.rank}: User {w.id}</li>
                        ))}
                    </ul>
                    <p>Total Tickets: {h.lottery.total_tickets}</p>
                </Card>
            ))
        )}
      </Section>
    </Container>
  );
}
