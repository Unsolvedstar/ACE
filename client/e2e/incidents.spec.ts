import { expect, test } from "@playwright/test";

test.describe("Incidents & Near Miss", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("hr.admin@acmehr.local");
    await page.getByLabel("Password").fill("Bootstrap@123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("http://localhost:5173/");
    await page.goto("/incidents");
  });

  test("report an incident, then move it through the review queue to closed", async ({ page }) => {
    const title = `E2E loose handrail ${Date.now()}`;

    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Severity").selectOption({ label: "High" });
    await page.getByLabel("Location").fill("Crusher house");
    await page.getByRole("button", { name: "Next" }).click();

    await page.getByLabel("Description").fill("Handrail on level 2 walkway is loose.");
    await page.getByRole("button", { name: "Submit report" }).click();

    // The HR bootstrap account is both the reporter and an authorized reviewer here, so the
    // same incident shows up in both the review queue (rendered first) and "My reports"
    // (rendered last) — scope to the queue's row (.first()) for the actions and status checks
    // below, since only the queue renders the advance-status buttons.
    const row = page.locator("li", { hasText: title }).first();
    await expect(row.getByText("Reported")).toBeVisible();

    await row.getByRole("button", { name: "Start investigation" }).click();
    await page.getByPlaceholder("Review notes (optional)").fill("Inspecting the bracket.");
    await page.getByRole("button", { name: "Confirm" }).click();

    await expect(row.getByText("Under Investigation")).toBeVisible();

    await row.getByRole("button", { name: "Close" }).click();
    await page.getByPlaceholder("Review notes (optional)").fill("Bracket re-welded and inspected.");
    await page.getByRole("button", { name: "Confirm" }).click();

    await expect(row.getByText("Closed")).toBeVisible();
    await expect(row.getByText("Bracket re-welded and inspected.")).toBeVisible();
  });
});
