import NextAuth from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { authConfig } from './auth.config';
import { getDb } from './db';
import { accounts, sessions, users, verificationTokens } from './db/schema';

const drizzleTables = {
  usersTable: users,
  accountsTable: accounts,
  sessionsTable: sessions,
  verificationTokensTable: verificationTokens,
};

/** Lazy adapter — avoid DATABASE_URL requirement during Next.js production build. */
function cloudAdapter() {
  return DrizzleAdapter(getDb(), drizzleTables);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: process.env.DATABASE_URL ? cloudAdapter() : undefined,
});
