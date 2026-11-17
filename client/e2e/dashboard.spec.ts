import { expect, test } from "@playwright/test";
import { BOOTSTRAP_PASSWORD } from "./credentials";

test("dashboard loads with module launch grid after login", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("hr.admin@acmehr.local");
  await page.getByLabel("Password").fill(BOOTSTRAP_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("http://localhost:5173/");

  await expect(page.getByText(/Welcome back,/)).toBeVisible();
  await expect(page.getByText("Incidents (MTD)")).toBeVisible();
  await expect(page.getByText("Medical Compliance")).toBeVisible();
  await expect(page.getByText("Recent Shift Requests")).toBeVisible();
  await expect(page.getByText("Core Modules")).toBeVisible();
});
