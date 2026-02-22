import { useEffect, useState } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const Balance = styled.div`
  background: ${({ theme }) => theme.secondary};
  padding: 0.5rem 1rem;
  border-radius: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid ${({ theme }) => theme.border};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
`;

const ItemImage = styled.div`
  height: 140px;
  background: ${({ theme }) => theme.bg};
  border-radius: 8px;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  color: ${({ theme }) => theme.text}40;
`;

const ItemInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
`;

const ItemName = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  color: ${({ theme }) => theme.text};
`;

const ItemPrice = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.primary};
  background: ${({ theme }) => theme.primary}15;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.9rem;
`;

const Meta = styled.div`
  display: flex;
  gap: 0.5rem;
  font-size: 0.8rem;
  opacity: 0.7;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`;

const Badge = styled.span`
  background: ${({ theme }) => theme.border};
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
`;

export default function Marketplace() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { theme } = useTheme();

  useEffect(() => {
    axios.get('/api/market')
      .then(res => setItems(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleBuy = async (itemId) => {
    try {
        const res = await axios.post('/api/market/buy', { itemId, amount: 1 });
        // Use a better toast in real app, alert for now but styled?
        // Let's just alert for simplicity in this specific step, or implementing a Toast later.
        alert(res.data.message);
        window.location.reload();
    } catch (err) {
        alert(err.response?.data?.error || 'Purchase failed');
    }
  };

  if (loading) return <p>Loading market...</p>;

  return (
    <div>
      <Header>
        <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
        >
            Marketplace
        </motion.h1>
        <Balance>
            <span>💎</span>
            <span>{user?.stats.tokens.toLocaleString()} Tokens</span>
        </Balance>
      </Header>

      <Grid>
        <AnimatePresence>
            {items.map((item, index) => (
            <Card
                key={item.id}
                hoverEffect
                style={{ display: 'flex', flexDirection: 'column' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
            >
                <ItemImage>🛍️</ItemImage>
                <ItemInfo>
                    <ItemName>{item.name}</ItemName>
                    <ItemPrice>{item.cost}</ItemPrice>
                </ItemInfo>
                <Meta>
                    <Badge>Lvl {item.minLevel}+</Badge>
                    <Badge>Max: {item.maxStock}</Badge>
                </Meta>

                <div style={{ marginTop: 'auto' }}>
                    <Button
                        fullWidth
                        onClick={() => handleBuy(item.id)}
                        disabled={(user?.stats.tokens || 0) < item.cost}
                    >
                        {(user?.stats.tokens || 0) < item.cost ? 'Insufficient Funds' : 'Purchase'}
                    </Button>
                </div>
            </Card>
            ))}
        </AnimatePresence>
      </Grid>
    </div>
  );
}
