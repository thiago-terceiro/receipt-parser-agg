import Google from "next-auth/providers/google";

import type { NextAuthOptions } from "next-auth";

const providers =
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
    ? [
        Google({
          clientId: process.env.AUTH_GOOGLE_ID,
          clientSecret: process.env.AUTH_GOOGLE_SECRET,
        }),
      ]
    : [];

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt({ token, account }) {
      if (account?.provider === "google" && account.providerAccountId) {
        token.uid = account.providerAccountId;
      }

      if (!token.uid && typeof token.sub === "string" && token.sub.trim()) {
        token.uid = token.sub;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.uid === "string" && token.uid.trim()) {
        (session.user as typeof session.user & { id?: string }).id = token.uid;
      }

      return session;
    },
  },
  providers,
};
