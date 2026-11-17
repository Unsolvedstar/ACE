# TODO

Tracking what's left from the Workspace Hierarchy + Mailbox Agent plan
(`C:\Users\tshik\.claude\plans\swift-coalescing-turing.md`). Phase A's code is
written, tested, and building; the items below are what's still outstanding.

## Phase A — Workspace Hierarchy (code complete, not yet verified live)

- [ ] Apply the `AddWorkspaceHierarchy` migration to a real database
      (`dotnet ef database update --project src/AcmeHR.Infrastructure --startup-project src/AcmeHR.Api`).
      Not run yet — no local Postgres was up (Docker Desktop wasn't running).
- [ ] Manual browser walkthrough with the dev stack running:
  - Create a Space → Folder → board-in-folder and board-direct-in-space
  - Move a board between folder and space-level
  - Archive/delete a Folder and confirm its boards fall back to space-level (not orphaned)
  - Confirm legacy boards (no Space/Folder) still list correctly in the old `/kpi/boards` view
  - Confirm the AI board-agent chat/actions are unaffected on those boards
- [ ] Mobile app (`mobile/app/(app)/boards`) has no workspace-hierarchy UI — out of scope for
      now, flagged as a follow-up if mobile parity is wanted.

## Phase B — Mailbox Agent (not started)

Gmail-only v1, drafts require human approval before sending (no auto-send), per your
confirmed answers.

### B.1 OAuth connection (Google, Authorization Code + PKCE)
- [ ] Register a real Google Cloud OAuth 2.0 Web application client (Testing status is
      enough), scopes `gmail.readonly` + `gmail.send`
- [ ] Domain: `MailboxConnection`, `OAuthPendingRequest` entities; `MailProviderKind`,
      `MailboxConnectionStatus` enums
- [ ] Application: `IMailOAuthService` (`BuildAuthorizationUrlAsync`, `CompleteConnectionAsync`)
- [ ] Infrastructure: `GoogleMailOAuthService` (typed HttpClient), `MailAgentSettings`
      (`MailAgent:Google:{ClientId,ClientSecret}`, `RedirectBaseUrl`, `PollingIntervalMinutes`)
- [ ] `services.AddDataProtection().PersistKeysToDbContext<ApplicationDbContext>()` —
      required so encrypted refresh tokens survive a Render redeploy (default local-disk
      key ring gets wiped on every container rebuild)
- [ ] Api: `MailboxConnectionsController` (GET mine, GET `{provider}/authorize-url`,
      POST `complete`, DELETE `{id}`)
- [ ] EF configs + migration for the new entities
- [ ] `render.yaml`: add `MailAgent__Google__ClientId` / `MailAgent__Google__ClientSecret`
      (`sync: false`) and `MailAgent__RedirectBaseUrl`

### B.2 Polling
- [ ] `MailboxPollingService` background job (mirrors `RefreshTokenCleanupService`) —
      per-connection try/catch, Gmail `users.history.list`/`users.messages.list`

### B.3 AI drafting
- [ ] Extend `IAiProvider` with `DraftEmailReplyAsync` + `MailDraftRequest`/`MailDraftResponse` DTOs
- [ ] Implement in `RuleBasedAiProvider` (templated) and `OllamaAiProvider` (real prompt)

### B.4 Propose → approve → send
- [ ] `MailDraftAudit` entity + `MailDraftStatus` enum (dedicated, not reusing `AgentActionAudit`)
- [ ] `IMailDraftService` / `MailDraftService` (owner-only approve/reject)
- [ ] `MailSendDispatcher` — the single code path allowed to call Gmail's send API, only
      reachable from `ApproveAndSendAsync`
- [ ] `MailDraftsController` (GET mine, POST `{id}/approve`, POST `{id}/reject`)
- [ ] `IGmailApiClient` test seam (list/history/send) so polling + send are unit-testable

### B.5 Client
- [ ] `MailboxSettingsPage` ("Connect Gmail" button, connection status, disconnect)
- [ ] `MailboxCallbackPage` at `/settings/mailbox/callback`
- [ ] `MailDraftsInboxPage` + `MailDraftCard` (approve/edit/reject UI)
- [ ] `api/mailboxConnections.ts`, `api/mailDrafts.ts`, `types/mailbox.ts`, `types/mailDraft.ts`
- [ ] Nav entry for `/mail`
- [ ] `MailHub` (SignalR) + `useMailHub.ts` for realtime draft notifications

### B.6 DI registrations
- [ ] Wire everything above into `Infrastructure/DependencyInjection.cs`

### B.7 Tests & verification
- [ ] Unit tests including an explicit assertion that `RejectAsync` never reaches the
      Gmail send call (the "never auto-send" invariant)
- [ ] Manual end-to-end: connect a real test Gmail inbox → send it a test email → confirm
      polling picks it up → draft appears in the inbox UI → edit → approve → confirm it
      actually lands in the test inbox's Sent folder and threads correctly
