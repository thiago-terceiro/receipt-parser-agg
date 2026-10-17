import { NextResponse } from "next/server";

import { isTestAuthEnabled } from "@/auth";
import { AuthRegistrationError, registerUser } from "@/lib/auth-db";
import {
  checkRegisterRateLimit,
  createRateLimitHeaders,
} from "@/lib/rate-limit";

export const runtime = "nodejs";

export const POST = async (request: Request) => {
  if (!isTestAuthEnabled()) {
    return NextResponse.json(
      { error: "Registration is disabled in production." },
      { status: 403 },
    );
  }

  try {
    const rateLimit = await checkRegisterRateLimit(request);
    if (rateLimit && !rateLimit.success) {
      return NextResponse.json(
        {
          error:
            "Too many registration attempts. Please wait a few minutes and try again.",
        },
        {
          status: 429,
          headers: createRateLimitHeaders(rateLimit),
        },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 },
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 },
      );
    }

    const { email, password, name } = body as Record<string, unknown>;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 },
      );
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 },
      );
    }

    if (password.length > 256) {
      return NextResponse.json(
        { error: "Password must not exceed 256 characters." },
        { status: 400 },
      );
    }

    const user = await registerUser({
      email: email.trim(),
      password,
      name: typeof name === "string" ? name.trim() : null,
    });

    return NextResponse.json(
      { success: true, user },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof AuthRegistrationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message =
      error instanceof Error ? error.message : "Failed to register user.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
