import { NextAuthOptions } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
import { getUser } from '@/lib/db';

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID || 'dummy_id',
      clientSecret: process.env.DISCORD_CLIENT_SECRET || 'dummy_secret',
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
      }
      return session;
    },
    async signIn({ user }) {
      const dbUser = getUser(user.id);
      if (!dbUser) {
        // Reject sign-in if the user is not onboarded in the bot's complete.json database.
        return '/?error=not-onboarded';
      }
      return true;
    },
  },
  pages: {
    signIn: '/',
  },
  secret: process.env.NEXTAUTH_SECRET || 'fallback_secret',
};
