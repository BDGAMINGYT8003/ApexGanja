'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MARKET_ITEMS } from '@/lib/constants';
import { Navigation } from '@/components/Navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function MarketPage({ user, session }: { user: any, session: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handlePurchase = async (itemId: string) => {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const res = await fetch('/api/market/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, quantity: 1 }), // Fixed 1 qty for demo
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to purchase.');
      } else {
        setMessage(data.message + (data.codes ? ` Codes: ${data.codes.join(', ')}` : ''));
        router.refresh();
      }
    } catch (err) {
      setError('An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pt-16">
      <Navigation />
      <main className="container mx-auto p-4 md:p-8 space-y-8">
        <h1 className="text-3xl font-bold tracking-tight text-center bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-hover mb-12">Supply Depot</h1>

        {user && (
          <div className="mb-8 p-4 bg-primary/10 rounded-lg text-primary text-center font-semibold text-lg max-w-sm mx-auto shadow-sm">
            Current Balance: {user.tokens} CI Tokens
          </div>
        )}

        {error && <div className="text-error text-center mb-4">{error}</div>}
        {message && <div className="text-success text-center mb-4">{message}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {MARKET_ITEMS.map((item) => {
            const bought = user?.market_stock?.[item.id] || 0;
            const remaining = item.id === 'lottery_ticket' ? '∞' : item.maxStock - bought;
            const canAfford = user ? user.tokens >= item.cost : false;
            const meetsLevel = user ? user.level >= item.minLevel : false;

            return (
              <Card key={item.id} className="p-6 flex flex-col justify-between hover:shadow-xl transition-all border-2 border-transparent hover:border-primary/20 dark:hover:border-primary/50 group bg-card">
                <div>
                  <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">{item.name.replace(/ x\d+$/, '')}</h3>
                  <p className="text-sm text-secondary dark:text-gray-400 mb-4 h-10">Requires Clearance {item.minLevel}</p>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-gray-50 dark:bg-[#1a1a1a] p-3 rounded-md">
                    <span className="font-mono font-bold text-primary">{item.cost} CI</span>
                    <span className="text-xs font-medium px-2 py-1 bg-gray-200 dark:bg-gray-800 rounded-full text-secondary dark:text-gray-300">
                      Stock: {remaining}
                    </span>
                  </div>
                  <Button
                    onClick={() => handlePurchase(item.id)}
                    disabled={!user || !canAfford || !meetsLevel || remaining === 0 || loading}
                    className="w-full"
                  >
                    {!user ? 'Login Required' : !meetsLevel ? 'Level Too Low' : !canAfford ? 'Insufficient Funds' : remaining === 0 ? 'Out of Stock' : 'Purchase Item'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
