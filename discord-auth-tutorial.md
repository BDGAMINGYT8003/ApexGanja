# Discord Authentication & Routing Setup Guide for Apex Girls Dashboard

This guide covers setting up Discord OAuth2 authentication for your Next.js companion app and ensuring it correctly synchronizes with the existing `apex-girls-bot` JSON database structure.

## Prerequisites
- A Next.js App Router project (created with `npx create-next-app@latest`).
- `next-auth` installed.

## Step 1: Configure Discord Developer Portal
1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Select your existing Apex Girls Bot application.
3. Navigate to **OAuth2**.
4. Add a redirect URI for your web app:
   - For local development: `http://localhost:3000/api/auth/callback/discord`
   - For production: `https://yourdomain.com/api/auth/callback/discord`
5. Copy your **Client ID** and **Client Secret**.

## Step 2: Set up Environment Variables
In the root of your Next.js project, create a `.env.local` file:
```env
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here
NEXTAUTH_SECRET=your_generated_random_secret_here
NEXTAUTH_URL=http://localhost:3000

# Path to your bot's database directory (if hosted together)
BOT_DATA_PATH=/path/to/bot/src/data
```

## Step 3: Install NextAuth
Run the following command:
```bash
npm install next-auth
```

## Step 4: Configure NextAuth with Discord Provider & DB Check
Create the NextAuth route handler in `app/api/auth/[...nextauth]/route.ts`.

In this file, we configure the Discord Provider and use the `signIn` or `session` callbacks to check if the user exists in `complete.json` (the onboarded users database from the bot).

```typescript
import NextAuth, { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import fs from 'fs';
import path from 'path';

// Note: Ensure your web app has read access to the bot's data directory.
const COMPLETE_DB_PATH = path.join(process.env.BOT_DATA_PATH || '', 'complete.json');

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        // Attach Discord user ID to the session
        session.user.id = token.sub;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      // Optional: Prevent login if the user isn't onboarded in the bot
      try {
        if (fs.existsSync(COMPLETE_DB_PATH)) {
          const completeData = JSON.parse(fs.readFileSync(COMPLETE_DB_PATH, 'utf8'));

          // Since the bot organizes users by guild, we might need to search across guilds,
          // or if the bot is single-guild, hardcode the guild ID.
          let isUserOnboarded = false;
          for (const guildId in completeData) {
            if (completeData[guildId][user.id]) {
              isUserOnboarded = true;
              break;
            }
          }

          if (!isUserOnboarded) {
            // Redirect to a specific error page telling them to run /onboard in Discord
            return '/not-onboarded';
          }
        }
      } catch (err) {
        console.error("Failed to read database:", err);
      }
      return true;
    }
  },
  pages: {
    signIn: '/', // Custom sign-in page (Landing page)
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

## Step 5: Implement App Routing and Middleware
Create a `middleware.ts` in the root of your project to automatically handle redirects.

```typescript
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const isAuth = !!req.nextauth.token;
    const isAuthPage = req.nextUrl.pathname === '/';

    if (isAuthPage) {
      if (isAuth) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
      return null;
    }

    if (!isAuth) {
      return NextResponse.redirect(new URL('/', req.url));
    }
  },
  {
    callbacks: {
      authorized: () => true, // Let the middleware function handle the logic
    },
  }
);

export const config = {
  matcher: ['/', '/dashboard', '/market', '/leaderboard', '/lottery']
};
```

## Step 6: Create the Landing Page
In `app/page.tsx`:
```tsx
'use client';

import { signIn } from "next-auth/react";

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-900 text-white">
      <h1 className="text-4xl font-bold mb-4">Apex Girls Dashboard</h1>
      <p className="mb-8">Manage your profile, view the market, and track your leaderboard status.</p>

      {/* Custom styled Discord button */}
      <button
        onClick={() => signIn('discord')}
        className="px-6 py-3 bg-[#5865F2] hover:bg-[#4752C4] transition-colors rounded-md font-semibold text-white"
      >
        Sign in with Discord
      </button>
    </div>
  );
}
```

## Summary
By combining `next-auth` with a custom `signIn` callback, we integrate seamlessly with Discord and the existing bot database (`complete.json`). The Next.js `middleware.ts` completely handles the automatic routing between the landing page for unauthenticated users and the main dashboard for authenticated users.
