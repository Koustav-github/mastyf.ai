import { eq } from 'drizzle-orm';
import { getDb } from './db';
import { accounts, users } from './db/schema';
import { toAccountView, type AccountView } from './account-view';
import { getUserOrg } from './org-context';

export type { AccountView } from './account-view';

/**
 * The user's profile, linked sign-in methods and workspace, read from Postgres. Only the
 * provider name is read from `accounts`; the stored OAuth tokens never leave the database.
 */
export async function getAccount(userId: string): Promise<AccountView | null> {
  const db = getDb();
  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, image: users.image, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) return null;

  const [linked, ctx] = await Promise.all([
    db.select({ provider: accounts.provider }).from(accounts).where(eq(accounts.userId, userId)),
    getUserOrg(userId),
  ]);

  return toAccountView(
    user,
    linked.map((a) => a.provider),
    ctx,
  );
}
