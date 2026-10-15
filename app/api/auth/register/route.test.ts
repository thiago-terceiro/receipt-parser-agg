/**
 * @jest-environment node
 */

import { AuthRegistrationError, registerUser } from "@/lib/auth-db";

import { POST } from "./route";

jest.mock("@/lib/auth-db", () => ({
  AuthRegistrationError: class AuthRegistrationError extends Error {
    readonly status: number;
    constructor(message: string, status = 400) {
      super(message);
      this.name = "AuthRegistrationError";
      this.status = status;
    }
  },
  registerUser: jest.fn(),
}));

const createJsonRequest = (body: unknown) => {
  return new Request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
};

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when body is not valid JSON", async () => {
    const request = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: "not json",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Invalid JSON request body.");
  });

  it("returns 400 when email is invalid", async () => {
    const request = createJsonRequest({ email: "invalid", password: "password123" });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("A valid email address is required.");
  });

  it("returns 400 when password is too short", async () => {
    const request = createJsonRequest({ email: "user@example.com", password: "123" });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Password must be at least 8 characters long.");
  });

  it("returns 409 when user already exists", async () => {
    (registerUser as jest.Mock).mockRejectedValueOnce(
      new AuthRegistrationError("An account with this email already exists.", 409),
    );
    const request = createJsonRequest({ email: "existing@example.com", password: "password123" });
    const response = await POST(request);
    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data.error).toBe("An account with this email already exists.");
  });

  it("returns 201 when user is registered successfully", async () => {
    (registerUser as jest.Mock).mockResolvedValueOnce({
      id: "new-user-123",
      email: "new@example.com",
      name: "New User",
    });
    const request = createJsonRequest({
      email: "new@example.com",
      password: "securePassword123!",
      name: "New User",
    });
    const response = await POST(request);
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toEqual({
      success: true,
      user: {
        id: "new-user-123",
        email: "new@example.com",
        name: "New User",
      },
    });
  });
});
