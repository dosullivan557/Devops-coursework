import { createHash, pbkdf2Sync, scryptSync } from "crypto";
import { describe, expect, it } from "@jest/globals";

import { createPasswordHash, verifyPassword } from "./password";

describe("password helpers", () => {
  it("creates a salted scrypt hash that can be verified", () => {
    const password = "correct horse battery staple";
    const { salt, passwordHash } = createPasswordHash(password);

    expect(salt).toMatch(/^[a-f0-9]{32}$/);
    expect(passwordHash).toMatch(/^[a-f0-9]{128}$/);
    expect(verifyPassword(password, passwordHash, salt)).toBe(true);
  });

  it("uses a fresh salt for each hash", () => {
    const first = createPasswordHash("same-password");
    const second = createPasswordHash("same-password");

    expect(second.salt).not.toBe(first.salt);
    expect(second.passwordHash).not.toBe(first.passwordHash);
  });

  it("rejects an incorrect password", () => {
    const { salt, passwordHash } = createPasswordHash("right-password");

    expect(verifyPassword("wrong-password", passwordHash, salt)).toBe(false);
  });

  it("rejects hashes with an unexpected length", () => {
    expect(verifyPassword("password", "too-short", "salt")).toBe(false);
  });

  it.each([
    ["plain text", (password: string) => password],
    [
      "SHA-256 password and salt",
      (password: string, salt: string) =>
        createHash("sha256").update(`${password}${salt}`).digest("hex"),
    ],
    [
      "SHA-256 salt and password",
      (password: string, salt: string) =>
        createHash("sha256").update(`${salt}${password}`).digest("hex"),
    ],
    [
      "PBKDF2 hex",
      (password: string, salt: string) =>
        pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex"),
    ],
    [
      "PBKDF2 base64",
      (password: string, salt: string) =>
        pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("base64"),
    ],
    [
      "scrypt hex",
      (password: string, salt: string) =>
        scryptSync(password, salt, 64).toString("hex"),
    ],
    [
      "scrypt base64",
      (password: string, salt: string) =>
        scryptSync(password, salt, 64).toString("base64"),
    ],
  ])("accepts the supported %s format", (_name, makeHash) => {
    const password = "legacy-password";
    const salt = "legacy-salt";

    expect(verifyPassword(password, makeHash(password, salt), salt)).toBe(true);
  });
});
