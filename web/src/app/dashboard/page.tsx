import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUser } from '@/lib/db';
import { Navigation } from '@/components/Navigation';
import { Card } from '@/components/ui/Card';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return <div>Unauthorized</div>;
  }

  const user = getUser(session.user.id);
  if (!user) {
    return <div>User not found in complete.json. Please onboard first.</div>;
  }

  const baseXP = 100;
  const nextXp = baseXP + (user.level - 1);
  const progress = (user.xp / nextXp) * 100;

  return (
    <div className="min-h-screen bg-background text-foreground pt-16">
      <Navigation />
      <main className="container mx-auto p-4 md:p-8 max-w-4xl space-y-6">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Agent {session.user.name || 'Commander'}</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <h3 className="text-sm font-medium text-secondary dark:text-gray-400">Clearance (Level)</h3>
            <p className="text-4xl font-bold text-primary">{user.level}</p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm font-medium text-secondary dark:text-gray-400">Calamity Intel (Tokens)</h3>
            <p className="text-4xl font-bold text-primary">{user.tokens}</p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm font-medium text-secondary dark:text-gray-400">Total XP</h3>
            <p className="text-4xl font-bold text-primary">{user.total_xp || user.xp}</p>
          </Card>
        </div>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Clearance Progress</h3>
          <div className="flex justify-between text-sm mb-2 text-secondary dark:text-gray-400">
            <span>{user.xp} XP</span>
            <span>{nextXp} XP</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
            <div
              className="bg-primary h-4 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Supply Depot Stock</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             {Object.keys(user.market_stock || {}).map((item) => (
                <div key={item} className="p-4 border rounded-lg dark:border-gray-800 text-center text-sm font-medium capitalize">
                    {item.replace(/_/g, ' ')}: {user.market_stock[item]}
                </div>
             ))}
             {Object.keys(user.market_stock || {}).length === 0 && (
                <p className="text-secondary dark:text-gray-500">No items purchased.</p>
             )}
          </div>
        </Card>
      </main>
    </div>
  );
}
