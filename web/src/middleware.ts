import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

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
      return NextResponse.redirect(new URL('/?error=unauthorized', req.url));
    }
  },
  {
    callbacks: {
      authorized: () => true,
    },
  }
);

export const config = {
  matcher: ['/', '/dashboard', '/market', '/leaderboard', '/lottery'],
};
