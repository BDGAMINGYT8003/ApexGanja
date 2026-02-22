import { useAuth } from '../context/AuthContext';
import styled from 'styled-components';
import Card from '../components/ui/Card';
import { motion } from 'framer-motion';

const Header = styled.header`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  text-align: center;

  @media (min-width: 768px) {
    flex-direction: row;
    text-align: left;
    gap: 1.5rem;
  }
`;

const Avatar = styled(motion.img)`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 4px solid ${({ theme }) => theme.primary};
  box-shadow: ${({ theme }) => theme.shadow};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  margin-bottom: 3rem;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const StatTitle = styled.h3`
  margin: 0;
  color: ${({ theme }) => theme.text};
  opacity: 0.6;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
`;

const StatValue = styled(motion.div)`
  margin: 0.5rem 0 0;
  font-size: 2.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, ${({ theme }) => theme.primary}, ${({ theme }) => theme.accent});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1.1;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  color: ${({ theme }) => theme.text};
  border-left: 4px solid ${({ theme }) => theme.primary};
  padding-left: 1rem;
`;

const InventoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 1rem;
`;

const InventoryItem = styled(Card)`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 1rem;
`;

const ItemIcon = styled.div`
  font-size: 2rem;
  margin-bottom: 0.5rem;
`;

const ItemCount = styled.div`
  background: ${({ theme }) => theme.secondary};
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: bold;
  margin-top: 0.5rem;
  color: ${({ theme }) => theme.primary};
`;

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) return null;

  const { discord, stats } = user;
  const avatarUrl = discord.avatar
    ? `https://cdn.discordapp.com/avatars/${discord.id}/${discord.avatar}.png`
    : 'https://cdn.discordapp.com/embed/avatars/0.png';

  const statItems = [
    { title: 'Level', value: stats.level },
    { title: 'Experience', value: stats.xp },
    { title: 'Tokens', value: stats.tokens },
    { title: 'Lottery Tix', value: stats.lottery?.current_tickets || 0 },
  ];

  return (
    <div>
      <Header>
        <Avatar
          src={avatarUrl}
          alt={discord.username}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        />
        <div>
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            style={{ margin: 0, fontSize: '2rem' }}
          >
            {discord.username}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            style={{ margin: '0.5rem 0 0', opacity: 0.7, fontSize: '1.1rem' }}
          >
            Level {stats.level} Explorer
          </motion.p>
        </div>
      </Header>

      <StatsGrid>
        {statItems.map((item, index) => (
          <Card key={item.title} hoverEffect>
            <StatTitle>{item.title}</StatTitle>
            <StatValue
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              {item.value.toLocaleString()}
            </StatValue>
          </Card>
        ))}
      </StatsGrid>

      <SectionTitle>Inventory</SectionTitle>
      {Object.keys(stats.market_stock || {}).length === 0 ? (
          <Card>
            <p style={{ textAlign: 'center', opacity: 0.6 }}>Your inventory is empty. Visit the Marketplace!</p>
          </Card>
      ) : (
          <InventoryGrid>
             {Object.entries(stats.market_stock || {}).map(([itemId, count], index) => (
                <InventoryItem
                    key={itemId}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    hoverEffect
                >
                  <ItemIcon>📦</ItemIcon>
                  <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                    {itemId.replace(/_/g, ' ')}
                  </span>
                  <ItemCount>x{count}</ItemCount>
                </InventoryItem>
             ))}
          </InventoryGrid>
      )}
    </div>
  );
}
