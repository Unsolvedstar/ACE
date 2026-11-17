import { expect, test } from "@playwright/test";
import { BOOTSTRAP_PASSWORD } from "./credentials";

test.describe("Workflow automation", () => {
  test("build a trigger-to-notification workflow, run it, and see it succeed", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("hr.admin@acmehr.local");
    await page.getByLabel("Password").fill(BOOTSTRAP_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("http://localhost:5173/");

    // Decode the JWT to get the logged-in employee's own id, used below as the notification's
    // recipient so the test can assert on a real, valid target without a dedicated "/me" endpoint.
    const employeeId = await page.evaluate(() => {
      const token = localStorage.getItem("acmehr.accessToken");
      if (!token) throw new Error("No access token found after login.");
      const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      return payload.employeeId as string;
    });

    await page.goto("/workflows");
    await expect(page.getByRole("button", { name: "New workflow" })).toBeVisible();

    await page.getByRole("button", { name: "New workflow" }).click();
    const workflowName = `E2E Workflow ${Date.now()}`;
    await page.getByLabel("Name").fill(workflowName);
    await page.getByRole("button", { name: "Create workflow" }).click();

    await expect(page.getByText(workflowName)).toBeVisible();
    await page.getByText(workflowName).click();
    await page.waitForURL(/\/workflows\/[0-9a-f-]+$/);

    // Drag a Notification node from the palette onto the canvas, well clear of the trigger node
    // (which fitView centers in the pane) so the two node cards don't visually overlap.
    const paletteItem = page.getByText("Send Notification").first();
    const canvas = page.locator(".react-flow__pane");
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error("Canvas pane not found.");
    await paletteItem.dragTo(canvas, {
      targetPosition: { x: canvasBox.width * 0.7, y: canvasBox.height * 0.25 },
    });

    // Select the new node and fill in its config.
    await page.getByText("Configure a message").click();
    await page.getByLabel("Recipient employee ID").fill(employeeId);
    await page.getByLabel("Message", { exact: true }).fill("E2E smoke test notification");

    // Connect the trigger node's source handle to the new node's target handle.
    const triggerHandle = page.locator(".react-flow__node").filter({ hasText: "Manual Trigger" }).locator(".react-flow__handle-right");
    const notificationHandle = page
      .locator(".react-flow__node")
      .filter({ hasText: "Send Notification" })
      .locator(".react-flow__handle-left");
    await triggerHandle.dragTo(notificationHandle);

    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saving...")).toHaveCount(0);

    await page.getByRole("button", { name: "Run now" }).click();
    await expect(page.getByText("Succeeded").first()).toBeVisible({ timeout: 15000 });
  });
});
