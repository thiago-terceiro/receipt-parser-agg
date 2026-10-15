import { randomUUID } from "node:crypto";

import { hashPassword, verifyPassword } from "./auth-passwords";
import { getSupabaseServerClient, hasSupabaseServerConfig } from "./supabase-server";

export type AuthDbUser = {
  id: string;
  email: string;
  name: string;
};

export class AuthRegistrationError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "AuthRegistrationError";
    this.status = status;
  }
}

export const verifyUserCredentials = async (
  emailOrUsername: string,
  password: string,
): Promise<AuthDbUser | null> => {
  if (!hasSupabaseServerConfig) {
    return null;
  }

  const normalized = emailOrUsername.trim().toLowerCase();
  if (!normalized || !password) {
    return null;
  }

  try {
    const client = getSupabaseServerClient();

    const { data: creds, error: credsError } = await client
      .from("user_credentials")
      .select("user_id, email, password_hash")
      .eq("email", normalized)
      .maybeSingle();

    if (credsError || !creds?.password_hash) {
      return null;
    }

    const isValid = await verifyPassword(password, creds.password_hash);
    if (!isValid) {
      return null;
    }

    const { data: profile } = await client
      .from("profiles")
      .select("id, email, display_name")
      .eq("id", creds.user_id)
      .maybeSingle();

    return {
      id: creds.user_id,
      email: creds.email,
      name: profile?.display_name || creds.email.split("@")[0],
    };
  } catch (err) {
    console.error("Failed to verify user credentials against database:", err);
    return null;
  }
};

export const registerUser = async ({
  email,
  password,
  name,
}: {
  email: string;
  password: string;
  name?: string | null;
}): Promise<AuthDbUser> => {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    throw new AuthRegistrationError("A valid email address is required.", 400);
  }

  if (!password || typeof password !== "string" || password.length < 8) {
    throw new AuthRegistrationError(
      "Password must be at least 8 characters long.",
      400,
    );
  }

  if (!hasSupabaseServerConfig) {
    throw new AuthRegistrationError(
      "Database registration is not configured on the server.",
      503,
    );
  }

  const client = getSupabaseServerClient();

  // Check if credentials already exist
  const { data: existingCreds } = await client
    .from("user_credentials")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existingCreds) {
    throw new AuthRegistrationError(
      "An account with this email already exists.",
      409,
    );
  }

  // Check if profile with email already exists (e.g. from OAuth)
  const { data: existingProfile } = await client
    .from("profiles")
    .select("id, display_name")
    .eq("email", normalizedEmail)
    .maybeSingle();

  const passwordHash = await hashPassword(password);
  let userId = existingProfile?.id;
  let createdProfile = false;
  const displayName = name?.trim() || existingProfile?.display_name || normalizedEmail.split("@")[0];

  if (!userId) {
    userId = randomUUID();
    const { error: profileError } = await client.from("profiles").insert({
      id: userId,
      email: normalizedEmail,
      display_name: displayName,
      image_url: null,
    });

    if (profileError) {
      if (profileError.code === "23505" || profileError.message?.includes("unique")) {
        throw new AuthRegistrationError("An account with this email already exists.", 409);
      }
      throw new AuthRegistrationError(
        `Failed to create user profile: ${profileError.message}`,
        500,
      );
    }
    createdProfile = true;
  }

  const { error: credsError } = await client.from("user_credentials").insert({
    user_id: userId,
    email: normalizedEmail,
    password_hash: passwordHash,
  });

  if (credsError) {
    if (createdProfile) {
      await client.from("profiles").delete().eq("id", userId);
    }
    if (credsError.code === "23505" || credsError.message?.includes("unique")) {
      throw new AuthRegistrationError("An account with this email already exists.", 409);
    }
    throw new AuthRegistrationError(
      `Failed to save credentials: ${credsError.message}`,
      500,
    );
  }

  return {
    id: userId,
    email: normalizedEmail,
    name: displayName,
  };
};
