/** The signed-in user's account as the dashboard and GET /api/me show it (no database imports). */

export type SignInMethod = 'github' | 'google';

export type AccountView = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  /** ISO time the account was created (first sign-in). */
  joinedAt: string;
  /** OAuth providers linked to this account; empty for the demo and local accounts. */
  signInMethods: SignInMethod[];
  workspace: { id: string; slug: string; name: string; role: string } | null;
};

const SIGN_IN_METHODS: readonly SignInMethod[] = ['github', 'google'];

type UserRow = { id: string; name: string | null; email: string; image: string | null; createdAt: Date };
type OrgContext = {
  org: { id: string; slug: string; name: string };
  membership: { role: string };
} | null;

export function toAccountView(user: UserRow, providers: string[], ctx: OrgContext): AccountView {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    joinedAt: user.createdAt.toISOString(),
    signInMethods: SIGN_IN_METHODS.filter((m) => providers.includes(m)),
    workspace: ctx
      ? { id: ctx.org.id, slug: ctx.org.slug, name: ctx.org.name, role: ctx.membership.role }
      : null,
  };
}
