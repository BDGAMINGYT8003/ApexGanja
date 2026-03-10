import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUser } from '@/lib/db';
import MarketClient from './MarketClient';

export default async function MarketPage() {
  const session = await getServerSession(authOptions);
  let user = null;
  if (session?.user?.id) {
    user = getUser(session.user.id);
  }

  return <MarketClient user={user} session={session} />;
}
