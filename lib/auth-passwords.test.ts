import { hashPassword, verifyPassword } from "./auth-passwords";

describe("auth-passwords", () => {
  it("hashes password and generates scrypt format", async () => {
    const hash = await hashPassword("mySuperSecret123!");
    expect(hash).toMatch(/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/);
  });

  it("verifies correct password against hash", async () => {
    const password = "correct-horse-battery-staple";
    const hash = await hashPassword(password);
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it("rejects incorrect password", async () => {
    const hash = await hashPassword("correctPassword1");
    const isValid = await verifyPassword("wrongPassword2", hash);
    expect(isValid).toBe(false);
  });

  it("produces distinct hashes for identical passwords due to random salt", async () => {
    const hash1 = await hashPassword("samePassword");
    const hash2 = await hashPassword("samePassword");
    expect(hash1).not.toBe(hash2);
    expect(await verifyPassword("samePassword", hash1)).toBe(true);
    expect(await verifyPassword("samePassword", hash2)).toBe(true);
  });

  it("returns false for malformed or empty hashes", async () => {
    expect(await verifyPassword("pass", "")).toBe(false);
    expect(await verifyPassword("pass", "invalid-hash")).toBe(false);
    expect(await verifyPassword("pass", "scrypt:short")).toBe(false);
    expect(await verifyPassword("pass", "bcrypt:salt:hash")).toBe(false);
  });

  it("throws when hashing invalid password input", async () => {
    await expect(hashPassword("")).rejects.toThrow("Password must be a non-empty string.");
    await expect(hashPassword(null as unknown as string)).rejects.toThrow();
  });
});
