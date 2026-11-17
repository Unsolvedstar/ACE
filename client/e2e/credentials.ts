/**
 * Password of the seeded bootstrap accounts (hr.admin@acmehr.local, exec.admin@acmehr.local).
 * It must match the API's `Seed:BootstrapPassword` and is never hard-coded: export
 * E2E_BOOTSTRAP_PASSWORD before running `npm run test:e2e` (CI sets it for you).
 */
export const BOOTSTRAP_PASSWORD = process.env.E2E_BOOTSTRAP_PASSWORD ?? "";

if (!BOOTSTRAP_PASSWORD) {
  throw new Error("Set E2E_BOOTSTRAP_PASSWORD to the API's Seed:BootstrapPassword before running the e2e tests.");
}
