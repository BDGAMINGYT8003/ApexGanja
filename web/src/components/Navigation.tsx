import Link from 'next/link';
import { Home, ShoppingCart, Trophy, Ticket } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export function Navigation() {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-[#121212]/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="text-xl font-bold tracking-tight text-primary">
            AG Terminal
          </Link>
          <div className="hidden md:flex gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
              <Home size={18} /> Dashboard
            </Link>
            <Link href="/market" className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
              <ShoppingCart size={18} /> Market
            </Link>
            <Link href="/leaderboard" className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
              <Trophy size={18} /> Leaderboard
            </Link>
            <Link href="/lottery" className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
              <Ticket size={18} /> Lottery
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
