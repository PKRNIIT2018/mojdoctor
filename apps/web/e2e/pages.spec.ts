import { test, expect } from "@playwright/test";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

test.describe("API health", () => {
  test("API server is reachable", async ({ request }) => {
    const res = await request.get(`${API_URL}/api/google/auth`, {
      failOnStatusCode: false,
    });
    expect(res.status()).toBe(401);
  });
});

test.describe("Public pages", () => {
  test("homepage loads", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1")).toContainText("Online Consultation");
  });

  test("booking page loads", async ({ page }) => {
    const res = await page.goto("/book");
    expect(res?.status()).toBe(200);
    await expect(page.locator("body")).toBeAttached();
  });
});

test.describe("Auth redirects", () => {
  test("dashboard redirects to home when unauthenticated", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL("/");
    await expect(page.locator("h1")).toContainText("Online Consultation");
  });

  test("settings redirects to home when unauthenticated", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await page.waitForURL("/");
    await expect(page.locator("h1")).toContainText("Online Consultation");
  });
});
