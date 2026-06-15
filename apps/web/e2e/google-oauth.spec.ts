import { test, expect } from "@playwright/test";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

test.describe("Google OAuth callback", () => {
  test("returns error when code is missing", async ({ request }) => {
    const res = await request.get(`${API_URL}/api/google/callback`, {
      params: { state: "some-state" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.message).toBe("Missing code or state");
  });

  test("returns error when state is missing", async ({ request }) => {
    const res = await request.get(`${API_URL}/api/google/callback`, {
      params: { code: "some-code" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.message).toBe("Missing code or state");
  });

  test("returns error when both code and state are missing", async ({ request }) => {
    const res = await request.get(`${API_URL}/api/google/callback`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.message).toBe("Missing code or state");
  });

  test("rejects invalid auth code", async ({ request }) => {
    const res = await request.get(`${API_URL}/api/google/callback`, {
      params: { code: "invalid-code-123", state: "test-doctor-id" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.message).toBe("Failed to connect Google account");
    expect(body.redirectUrl).toContain("google=error");
  });

  test("handles Google error parameter", async ({ request }) => {
    const res = await request.get(`${API_URL}/api/google/callback`, {
      params: {
        code: "some-code",
        state: "some-state",
        error: "access_denied",
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.message).toBe("Google auth failed");
    expect(body.error).toBe("access_denied");
  });
});

test.describe("Google OAuth auth endpoint", () => {
  test("returns 401 without auth token", async ({ request }) => {
    const res = await request.get(`${API_URL}/api/google/auth`);
    expect(res.status()).toBe(401);
  });

  test("returns 401 for status without auth", async ({ request }) => {
    const res = await request.get(`${API_URL}/api/google/status`);
    expect(res.status()).toBe(401);
  });

  test("returns 401 for disconnect without auth", async ({ request }) => {
    const res = await request.get(`${API_URL}/api/google/disconnect`);
    expect(res.status()).toBe(401);
  });
});
