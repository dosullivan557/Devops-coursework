import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { query } from "@/app/lib/db";
import { verifyPassword } from "@/app/lib/password";
import { ensureUserAuthSchema } from "@/app/lib/user-auth-schema";

type AuthUserRow = {
  id: number;
  teamId: number;
  name: string;
  email: string;
  passwordHash: string | null;
  salt: string | null;
};

const resolveNextAuthSecret = () => {
  const authSecret = process.env.auth;

  if (process.env.NEXTAUTH_SECRET) {
    return process.env.NEXTAUTH_SECRET;
  }

  if (process.env.AUTH_SECRET) {
    return process.env.AUTH_SECRET;
  }

  if (!authSecret) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(authSecret) as {
      NEXTAUTH_SECRET?: string;
      AUTH_SECRET?: string;
    };

    return parsed.NEXTAUTH_SECRET ?? parsed.AUTH_SECRET ?? authSecret;
  } catch {
    return authSecret;
  }
};

const nextAuthSecret = resolveNextAuthSecret();

if (nextAuthSecret) {
  process.env.NEXTAUTH_SECRET ??= nextAuthSecret;
  process.env.AUTH_SECRET ??= nextAuthSecret;
}

export const authOptions: NextAuthOptions = {
  secret: nextAuthSecret,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password ?? "";

        if (!email || !password) {
          return null;
        }

        await ensureUserAuthSchema();

        const [user] = await query<AuthUserRow>(
          `
          SELECT
            id,
            team_id AS "teamId",
            name,
            email,
            password_hash AS "passwordHash",
            salt
          FROM users
          WHERE LOWER(email) = LOWER($1)
          LIMIT 1
        `,
          [email],
        );

        if (!user) {
          return null;
        }

        if (!user.passwordHash || !user.salt) {
          return null;
        }

        if (!verifyPassword(password, user.passwordHash, user.salt)) {
          return null;
        }

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          teamId: user.teamId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.teamId = (user as { teamId?: number }).teamId;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? session.user.id;
        session.user.teamId = token.teamId as number | undefined;
      }

      return session;
    },
  },
};
