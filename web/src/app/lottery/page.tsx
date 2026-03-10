import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUser } from '@/lib/db';
import { getLeaderboard } from '@/lib/actions';
import { Navigation } from '@/components/Navigation';
import { Card } from '@/components/ui/Card';
import fs from 'fs';
import path from 'path';

export default async function LotteryPage() {
  const session = await getServerSession(authOptions);
  let user = null;
  if (session?.user?.id) {
    user = getUser(session.user.id);
  }

  const allUsers = await getLeaderboard();

  let totalTickets = 0;
  let totalUnique = 0;
  let totalPoolWeight = 0;

  allUsers.forEach(u => {
      const t = u.lottery?.current_tickets || 0;
      if (t > 0) {
          totalTickets += t;
          totalUnique++;
          totalPoolWeight += Math.log10(t + 1) + 1;
      }
  });

  const userTickets = user?.lottery?.current_tickets || 0;
  let winChance = '0.00';
  if (userTickets > 0 && totalPoolWeight > 0) {
      const userWeight = Math.log10(userTickets + 1) + 1;
      winChance = ((userWeight / totalPoolWeight) * 100).toFixed(2);
  }

  const now = new Date();
  const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));
  const timestamp = Math.floor(endOfMonth.getTime() / 1000);

  // Load Historical Claims
  let pastWinners: any[] = [];
  try {
    const claimsPath = path.join(process.cwd(), '../src/data/lottery_claims.json');
    if (fs.existsSync(claimsPath)) {
       const claimsData = JSON.parse(fs.readFileSync(claimsPath, 'utf8'));
       // Flatten claims for UI
       for(const month in claimsData) {
         claimsData[month].forEach((claim: any) => {
             pastWinners.push({ month, ...claim });
         });
       }
    }
  } catch (error) {
     console.error('Failed to load past winners', error);
  }

  return (
    <div className="min-h-screen bg-background text-foreground pt-16">
      <Navigation />
      <main className="container mx-auto p-4 md:p-8 max-w-4xl space-y-6">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Calamity Supply Drop (Lottery)</h1>

        {/* Current Month Lottery UI ... */}
        <Card className="p-8 border-l-4 border-l-primary bg-gradient-to-br from-card to-gray-50 dark:to-[#222]">
          <h2 className="text-2xl font-bold mb-6 text-primary">Current Lottery Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b pb-4 dark:border-gray-800">
                <span className="text-secondary dark:text-gray-400 font-medium">Total Participants</span>
                <span className="text-xl font-bold">{totalUnique} Commanders</span>
              </div>
              <div className="flex justify-between items-center border-b pb-4 dark:border-gray-800">
                <span className="text-secondary dark:text-gray-400 font-medium">Total Tickets Pool</span>
                <span className="text-xl font-bold">{totalTickets} Tickets</span>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-secondary dark:text-gray-400 font-medium text-sm">Time Remaining</span>
                <span className="text-lg font-mono text-warning bg-warning/10 p-3 rounded-md border border-warning/20">Closes at Unix: {timestamp}</span>
              </div>
            </div>

            <div className="space-y-6 bg-gray-50 dark:bg-[#1a1a1a] p-6 rounded-xl border dark:border-gray-800">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-primary inline-block"></span> Your Logistics</h3>
              <div className="flex justify-between items-center">
                <span className="text-secondary dark:text-gray-400 font-medium text-sm">Your Entries</span>
                <span className="text-xl font-bold text-primary">{userTickets} Tickets</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-secondary dark:text-gray-400 font-medium text-sm">Win Probability</span>
                <span className="text-xl font-bold text-success bg-success/10 px-3 py-1 rounded-full">{winChance}%</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Historical Winners Archive */}
        <h2 className="text-2xl font-bold tracking-tight mt-12 mb-6">Historical Archives: Past Winners</h2>
        <Card className="p-6 border dark:border-gray-800">
          {pastWinners.length > 0 ? (
            <ul className="space-y-4">
              {pastWinners.map((winner, idx) => (
                <li key={idx} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-[#222] rounded-lg border dark:border-gray-800">
                   <div>
                     <span className="font-bold block text-primary">{winner.userId}</span>
                     <span className="text-sm text-secondary">Month: {winner.month}</span>
                   </div>
                   <div className="text-right">
                      <span className="font-mono text-sm bg-card px-2 py-1 rounded border dark:border-gray-700 block">UID: {winner.uid}</span>
                      <span className="text-xs text-secondary mt-1 block">Claimed on: {new Date(winner.timestamp).toLocaleDateString()}</span>
                   </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-secondary py-4">No historical claims found.</p>
          )}
        </Card>

      </main>
    </div>
  );
}
