import { useEffect, useState } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import Card from '../components/Card';
import { useAuth } from '../context/AuthContext';

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
`;

const ItemName = styled.h3`
  margin-top: 0;
  color: ${({ theme }) => theme.text};
`;

const ItemCost = styled.p`
  color: ${({ theme }) => theme.accent};
  font-weight: bold;
`;

const BuyButton = styled.button`
  background-color: ${({ theme }) => theme.primary};
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  width: 100%;
  margin-top: 1rem;
  transition: opacity 0.2s;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export default function Marketplace() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    axios.get('/api/market')
      .then(res => setItems(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleBuy = async (itemId) => {
    try {
        const res = await axios.post('/api/market/buy', { itemId, amount: 1 });
        alert(res.data.message);
        window.location.reload(); // Simple refresh to update balance
    } catch (err) {
        alert(err.response?.data?.error || 'Purchase failed');
    }
  };

  if (loading) return <p>Loading market...</p>;

  return (
    <div>
      <h1>Marketplace</h1>
      <p>Balance: {user?.stats.tokens} Tokens</p>
      <Grid>
        {items.map(item => (
          <Card key={item.id}>
            <ItemName>{item.name}</ItemName>
            <ItemCost>{item.cost} Tokens</ItemCost>
            <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                Min Level: {item.minLevel} | Stock Limit: {item.maxStock}
            </p>
            <BuyButton
                onClick={() => handleBuy(item.id)}
                disabled={(user?.stats.tokens || 0) < item.cost}
            >
                Buy
            </BuyButton>
          </Card>
        ))}
      </Grid>
    </div>
  );
}
