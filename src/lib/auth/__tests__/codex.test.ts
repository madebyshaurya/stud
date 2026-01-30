import { describe, it, expect, beforeEach } from "vitest";
import {
  getStoredAuth,
  saveAuth,
  clearAuth,
  isAuthenticated,
  extractAccountIdFromClaims,
  type OAuthAuth,
  type IdTokenClaims,
} from "../codex";

describe("Codex Auth", () => {
  beforeEach(() => {
    clearAuth();
  });

  describe("storage functions", () => {
    it("should return null when no auth is stored", () => {
      const result = getStoredAuth();
      expect(result).toBeNull();
    });

    it("should save and retrieve auth", () => {
      const auth: OAuthAuth = {
        type: "oauth",
        access: "test-access-token",
        refresh: "test-refresh-token",
        expires: Date.now() + 3600000,
        accountId: "test-account-id",
      };

      saveAuth(auth);
      const result = getStoredAuth();

      expect(result).toEqual(auth);
    });

    it("should clear auth", () => {
      const auth: OAuthAuth = {
        type: "oauth",
        access: "test-access-token",
        refresh: "test-refresh-token",
        expires: Date.now() + 3600000,
      };

      saveAuth(auth);
      expect(getStoredAuth()).not.toBeNull();

      clearAuth();
      expect(getStoredAuth()).toBeNull();
    });
  });

  describe("isAuthenticated", () => {
    it("should return false when no auth is stored", () => {
      expect(isAuthenticated()).toBe(false);
    });

    it("should return true when auth with refresh token is stored", () => {
      const auth: OAuthAuth = {
        type: "oauth",
        access: "test-access-token",
        refresh: "test-refresh-token",
        expires: Date.now() + 3600000,
      };

      saveAuth(auth);
      expect(isAuthenticated()).toBe(true);
    });

    it("should return false when auth has no refresh token", () => {
      // Manually set invalid auth
      localStorage.setItem(
        "stud_chatgpt_auth",
        JSON.stringify({
          type: "oauth",
          access: "test-access-token",
          expires: Date.now() + 3600000,
        })
      );

      expect(isAuthenticated()).toBe(false);
    });
  });

  describe("extractAccountIdFromClaims", () => {
    it("should extract chatgpt_account_id", () => {
      const claims: IdTokenClaims = {
        chatgpt_account_id: "account-123",
      };

      const result = extractAccountIdFromClaims(claims);
      expect(result).toBe("account-123");
    });

    it("should extract from https://api.openai.com/auth", () => {
      const claims: IdTokenClaims = {
        "https://api.openai.com/auth": {
          chatgpt_account_id: "account-456",
        },
      };

      const result = extractAccountIdFromClaims(claims);
      expect(result).toBe("account-456");
    });

    it("should extract from organizations array", () => {
      const claims: IdTokenClaims = {
        organizations: [{ id: "org-789" }],
      };

      const result = extractAccountIdFromClaims(claims);
      expect(result).toBe("org-789");
    });

    it("should prefer chatgpt_account_id over others", () => {
      const claims: IdTokenClaims = {
        chatgpt_account_id: "preferred-id",
        "https://api.openai.com/auth": {
          chatgpt_account_id: "other-id",
        },
        organizations: [{ id: "org-id" }],
      };

      const result = extractAccountIdFromClaims(claims);
      expect(result).toBe("preferred-id");
    });

    it("should return undefined when no account id found", () => {
      const claims: IdTokenClaims = {
        email: "test@example.com",
      };

      const result = extractAccountIdFromClaims(claims);
      expect(result).toBeUndefined();
    });
  });
});
