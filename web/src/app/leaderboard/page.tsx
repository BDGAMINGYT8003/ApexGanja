import { getLeaderboard } from '@/lib/actions';
import { Navigation } from '@/components/Navigation';
import { Card } from '@/components/ui/Card';

export default async function LeaderboardPage() {
  const users = await getLeaderboard();

  return (
    <div className="min-h-screen bg-background text-foreground pt-16">
      <Navigation />
      <main className="container mx-auto p-4 md:p-8 max-w-4xl space-y-6">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Global Sector Rankings</h1>
        <Card className="p-0 overflow-hidden border dark:border-gray-800">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-[#2a2a2a] text-secondary dark:text-gray-300 text-sm uppercase tracking-wider border-b dark:border-gray-800">
                <th className="px-6 py-4 font-semibold">Rank</th>
                <th className="px-6 py-4 font-semibold">Commander</th>
                <th className="px-6 py-4 font-semibold text-right">Clearance</th>
                <th className="px-6 py-4 font-semibold text-right">XP</th>
              </tr>
            </thead>
            <tbody>
              {users.slice(0, 10).map((user, idx) => (
                <tr
                  key={user.id}
                  className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#222] transition-colors"
                >
                  <td className="px-6 py-4 font-bold text-primary">#{idx + 1}</td>
                  <td className="px-6 py-4 font-medium">{user.id}</td>
                  <td className="px-6 py-4 font-mono text-right">{user.level}</td>
                  <td className="px-6 py-4 font-mono text-right">{user.total_xp || user.xp}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="p-8 text-center text-secondary">No data available.</div>
          )}
        </Card>

        <h2 className="text-2xl font-bold tracking-tight mt-12 mb-6">Historical Archives</h2>
        <Card className="p-6 border dark:border-gray-800 text-center text-secondary">
           <p>Past monthly leaderboards will be archived here after the season ends.</p>
           {/* In a real implementation, you would fetch from a database of archived seasons */}
        </Card>
      </main>
    </div>
  );
}
