import { useAuth } from '../context/AuthContext';
import styled from 'styled-components';
import Card from '../components/Card';
import { useTheme } from '../context/ThemeContext';

const Header = styled.header`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
`;

const Avatar = styled.img`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 3px solid ${({ theme }) => theme.primary};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
`;

const StatTitle = styled.h3`
  margin: 0;
  color: ${({ theme }) => theme.text};
  opacity: 0.8;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const StatValue = styled.p`
  margin: 0.5rem 0 0;
  font-size: 2rem;
  font-weight: bold;
  color: ${({ theme }) => theme.primary};
`;

export default function Dashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();

  if (!user) return null;

  const { discord, stats } = user;
  const avatarUrl = discord.avatar
    ? `https://cdn.discordapp.com/avatars/${discord.id}/${discord.avatar}.png`
    : 'https://cdn.discordapp.com/embed/avatars/0.png';

  return (
    <div>
      <Header>
        <Avatar src={avatarUrl} alt={discord.username} />
        <div>
          <h1 style={{ margin: 0 }}>Welcome, {discord.username}</h1>
          <p style={{ margin: 0, opacity: 0.7 }}>Level {stats.level} Explorer</p>
        </div>
      </Header>

      <StatsGrid>
        <Card>
          <StatTitle>Current Level</StatTitle>
          <StatValue>{stats.level}</StatValue>
        </Card>
        <Card>
          <StatTitle>Experience</StatTitle>
          <StatValue>{stats.xp}</StatValue>
        </Card>
        <Card>
          <StatTitle>Tokens</StatTitle>
          <StatValue>{stats.tokens}</StatValue>
        </Card>
        <Card>
          <StatTitle>Lottery Tickets</StatTitle>
          <StatValue>{stats.lottery?.current_tickets || 0}</StatValue>
        </Card>
      </StatsGrid>

      <h2 style={{ marginTop: '3rem' }}>Inventory</h2>
      <StatsGrid>
         {Object.entries(stats.market_stock || {}).map(([itemId, count]) => (
            <Card key={itemId}>
              <StatTitle>{itemId.replace(/_/g, ' ')}</StatTitle>
              <StatValue>{count}</StatValue>
            </Card>
         ))}
      </StatsGrid>
      {Object.keys(stats.market_stock || {}).length === 0 && <p>No items owned.</p>}
    </div>
  );
}
