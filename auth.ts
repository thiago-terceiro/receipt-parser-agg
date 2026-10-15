import CredentialsProvider from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import type { NextAuthOptions, User } from "next-auth";

export type PreconfiguredAccount = {
  id: string;
  email: string;
  username: string;
  name: string;
};

export const PRECONFIGURED_ACCOUNTS: PreconfiguredAccount[] = [
  {
    id: "test-user-owner-001",
    email: "test@receipt.ai",
    username: "test",
    name: "Test Owner",
  },
  {
    id: "test-user-partner-002",
    email: "partner@receipt.ai",
    username: "partner",
    name: "Test Partner",
  },
];

export const isTestAuthEnabled = () =>
  process.env.NODE_ENV !== "production" ||
  process.env.ENABLE_TEST_AUTH === "true";

export const getCredentialsPassword = () =>
  process.env.TEST_AUTH_PASSWORD?.trim() || "password123";

const resolveProvider = <T>(provider: T): T => {
  if (typeof provider === "function") {
    return provider;
  }
  const candidate = (provider as { default?: unknown })?.default;
  if (typeof candidate === "function") {
    return candidate as T;
  }
  return provider;
};

const createCredentials = resolveProvider(CredentialsProvider);

const credentialsConfig = {
  id: "credentials",
  name: "Username & Password",
  type: "credentials" as const,
  credentials: {
    username: { label: "Username or Email", type: "text", placeholder: "test or partner" },
    password: { label: "Password", type: "password" },
  },
  authorize(credentials: Record<string, string> | undefined): User | null {
    if (!isTestAuthEnabled() || !credentials?.username || !credentials.password) {
      return null;
    }

    const inputUser = credentials.username.trim().toLowerCase();
    const inputPass = credentials.password;

    if (inputPass !== getCredentialsPassword()) {
      return null;
    }

    const matchedAccount = PRECONFIGURED_ACCOUNTS.find(
      (acc) =>
        acc.username.toLowerCase() === inputUser ||
        acc.email.toLowerCase() === inputUser,
    );

    if (matchedAccount) {
      return {
        id: matchedAccount.id,
        name: matchedAccount.name,
        email: matchedAccount.email,
      };
    }

    const safeId = `user_${inputUser.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    return {
      id: safeId,
      name: credentials.username.trim(),
      email: inputUser.includes("@") ? inputUser : `${inputUser}@receipt.local`,
    };
  },
};

export const credentialsProvider = {
  ...createCredentials(credentialsConfig),
  ...credentialsConfig,
};

export const getAuthProviders = () => {
  const googleProvider =
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? Google({
          clientId: process.env.AUTH_GOOGLE_ID,
          clientSecret: process.env.AUTH_GOOGLE_SECRET,
        })
      : null;

  return [
    ...(googleProvider ? [googleProvider] : []),
    ...(isTestAuthEnabled() ? [credentialsProvider] : []),
  ];
};

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt({ token, user, account }) {
      if (account?.provider === "google" && account.providerAccountId) {
        token.uid = account.providerAccountId;
      } else if (user?.id) {
        token.uid = user.id;
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
  get providers() {
    return getAuthProviders();
  },
};

