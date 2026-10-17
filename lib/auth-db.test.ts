import {
  AuthRegistrationError,
  registerUser,
  registerUserWithCredentials,
  verifyUserCredentials,
} from "./auth-db";
import { hashPassword } from "./auth-passwords";
import { getSupabaseServerClient } from "./supabase-server";

jest.mock("./supabase-server", () => ({
  get hasSupabaseServerConfig() {
    return true;
  },
  getSupabaseServerClient: jest.fn(),
}));

describe("auth-db", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("verifyUserCredentials", () => {
    it("returns null when password does not match", async () => {
      const mockHash = await hashPassword("correctPassword123");
      const client = {
        from: jest.fn((table: string) => {
          if (table === "user_credentials") {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: { user_id: "user-123", email: "user@example.com", password_hash: mockHash },
                    error: null,
                  }),
                })),
              })),
            };
          }
          return {};
        }),
      };
      (getSupabaseServerClient as jest.Mock).mockReturnValue(client);

      const result = await verifyUserCredentials("user@example.com", "wrongPassword");
      expect(result).toBeNull();
    });

    it("returns user profile when credentials are valid", async () => {
      const password = "correctPassword123";
      const mockHash = await hashPassword(password);
      const client = {
        from: jest.fn((table: string) => {
          if (table === "user_credentials") {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: { user_id: "user-123", email: "user@example.com", password_hash: mockHash },
                    error: null,
                  }),
                })),
              })),
            };
          }
          if (table === "profiles") {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: { id: "user-123", email: "user@example.com", display_name: "Jane Doe" },
                    error: null,
                  }),
                })),
              })),
            };
          }
          return {};
        }),
      };
      (getSupabaseServerClient as jest.Mock).mockReturnValue(client);

      const result = await verifyUserCredentials("user@example.com", password);
      expect(result).toEqual({
        id: "user-123",
        email: "user@example.com",
        name: "Jane Doe",
      });
    });

    it("returns null when user is not found in database", async () => {
      const client = {
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        })),
      };
      (getSupabaseServerClient as jest.Mock).mockReturnValue(client);

      const result = await verifyUserCredentials("nonexistent@example.com", "password123");
      expect(result).toBeNull();
    });
  });

  describe("registerUser", () => {
    it("validates email and password requirements", async () => {
      await expect(
        registerUser({ email: "invalid-email", password: "password123" }),
      ).rejects.toThrow(AuthRegistrationError);

      await expect(
        registerUser({ email: "user@example.com", password: "short" }),
      ).rejects.toThrow("Password must be at least 8 characters long.");
    });

    it("rejects registration when email already exists", async () => {
      const client = {
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn().mockResolvedValue({ data: { id: "existing-id" }, error: null }),
            })),
          })),
        })),
      };
      (getSupabaseServerClient as jest.Mock).mockReturnValue(client);

      await expect(
        registerUser({ email: "user@example.com", password: "password123" }),
      ).rejects.toThrow("An account with this email already exists.");
    });

    it("registers user and creates profile + user_credentials", async () => {
      const profileInsert = jest.fn().mockResolvedValue({ error: null });
      const credsInsert = jest.fn().mockResolvedValue({ error: null });

      const client = {
        from: jest.fn((table: string) => {
          if (table === "profiles") {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
                })),
              })),
              insert: profileInsert,
            };
          }
          if (table === "user_credentials") {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
                })),
              })),
              insert: credsInsert,
            };
          }
          return {};
        }),
      };
      (getSupabaseServerClient as jest.Mock).mockReturnValue(client);

      const user = await registerUser({
        email: "newuser@example.com",
        password: "securePassword123!",
        name: "New User",
      });

      expect(user.email).toBe("newuser@example.com");
      expect(user.name).toBe("New User");
      expect(profileInsert).toHaveBeenCalled();
      expect(credsInsert).toHaveBeenCalled();
    });

    it("rejects registration when user already has an existing OAuth profile", async () => {
      const profileInsert = jest.fn();
      const credsInsert = jest.fn();

      const client = {
        from: jest.fn((table: string) => {
          if (table === "profiles") {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: { id: "oauth-user-id", display_name: "Google User" },
                    error: null,
                  }),
                })),
              })),
              insert: profileInsert,
            };
          }
          if (table === "user_credentials") {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
                })),
              })),
              insert: credsInsert,
            };
          }
          return {};
        }),
      };
      (getSupabaseServerClient as jest.Mock).mockReturnValue(client);

      await expect(
        registerUser({
          email: "oauth@example.com",
          password: "securePassword123!",
        }),
      ).rejects.toMatchObject({
        message: "An account with this email already exists.",
        status: 409,
      });

      expect(profileInsert).not.toHaveBeenCalled();
      expect(credsInsert).not.toHaveBeenCalled();
    });

    it("exports registerUserWithCredentials as an alias for registerUser", () => {
      expect(registerUserWithCredentials).toBe(registerUser);
    });
  });
});
