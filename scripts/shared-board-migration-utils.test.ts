jest.mock("@upstash/redis", () => ({
  Redis: jest.fn(),
}));

import { ensureProfile } from "./shared-board-migration-utils";

import type { SupabaseClient } from "@supabase/supabase-js";

describe("shared-board-migration-utils ensureProfile", () => {
  it("upserts profile with email when email is provided", async () => {
    const upsertMock = jest.fn().mockResolvedValue({ error: null });
    const mockSupabase = {
      from: jest.fn().mockReturnValue({
        upsert: upsertMock,
      }),
    } as unknown as SupabaseClient;

    await ensureProfile(mockSupabase, "user-123", "alice@example.com");

    expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
    expect(upsertMock).toHaveBeenCalledWith(
      {
        id: "user-123",
        email: "alice@example.com",
      },
      {
        ignoreDuplicates: false,
        onConflict: "id",
      },
    );
  });

  it("omits email and sets ignoreDuplicates to true when email is null to prevent overwriting", async () => {
    const upsertMock = jest.fn().mockResolvedValue({ error: null });
    const mockSupabase = {
      from: jest.fn().mockReturnValue({
        upsert: upsertMock,
      }),
    } as unknown as SupabaseClient;

    await ensureProfile(mockSupabase, "user-456", null);

    expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
    expect(upsertMock).toHaveBeenCalledWith(
      {
        id: "user-456",
      },
      {
        ignoreDuplicates: true,
        onConflict: "id",
      },
    );
  });

  it("throws descriptive error when Supabase upsert fails", async () => {
    const upsertMock = jest.fn().mockResolvedValue({
      error: { message: "Database connection timeout" },
    });
    const mockSupabase = {
      from: jest.fn().mockReturnValue({
        upsert: upsertMock,
      }),
    } as unknown as SupabaseClient;

    await expect(
      ensureProfile(mockSupabase, "user-fail", "fail@example.com"),
    ).rejects.toThrow("Database connection timeout");
  });
});
