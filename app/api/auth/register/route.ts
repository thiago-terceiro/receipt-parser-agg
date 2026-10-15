import { NextResponse } from "next/server";

import { AuthRegistrationError, registerUser } from "@/lib/auth-db";

export const runtime = "nodejs";

export const POST = async (request: Request) => {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 },
      );
    }

    const { email, password, name } = (body as Record<string, unknown>) ?? {};

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
