'use client';
import { signIn } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-6 p-8 text-center bg-card shadow-lg rounded-2xl"
      >
        <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-hover">
          Apex Girls Terminal
        </h1>
        <p className="text-lg text-secondary dark:text-gray-400 max-w-md">
          Authenticate with your Discord account to access your Commander Dashboard, Market Data, and Sector rankings.
        </p>
        <Button onClick={() => signIn('discord', { callbackUrl: '/dashboard' })} size="lg">
          Initialize Uplink
        </Button>
      </motion.div>
    </div>
  );
}
