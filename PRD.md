# Product Requirements

This PRD tracks product behavior, platform rollout, and docs parity for Lunchbox.

Status key:
- [ ] Incomplete
- [x] Complete

## Core Product Requirements (Landing Page Parity)

### Primary Value Props
- [ ] “Git for your data” positioning is reflected in platform copy and docs
- [ ] Single API key experience (no IAM sprawl) is documented and visible in platform onboarding
- [ ] Immutable revisions with verifiable hashes are presented in product UX
- [ ] Instant restore and point-in-time recovery (Postgres WAL) are supported in platform UX
- [ ] SQLite + PostgreSQL support is explicit across landing page and docs
- [ ] Post-quantum encryption option is visible and documented
- [ ] Self-hosted and managed options are clearly separated in product UX

### CLI and API Claims
- [ ] One-command sync workflows match docs examples
- [ ] Scheduled backups are supported and documented
- [ ] Restore flows include file restore and Postgres restore
- [ ] CI/CD integration examples exist and are aligned with product behavior

### Managed Storage Tiers
- [ ] Maximum durability tier messaging appears in product and docs
- [ ] Best value (EU) tier messaging appears in product and docs
- [ ] BYOB tier (any S3-compatible) is described and selectable

## Platform Experience (Initial)

### Routes and Navigation
- [x] “Get Started” CTA routes to the platform experience
- [x] Landing page CTA and footer CTA are consistent
- [x] /docs remains accessible from landing and platform

### Dummy Authentication (Interim)
- [x] Platform uses a single demo account (fixed email + password)
- [x] Auth screen shows the demo credentials inline
- [x] “Log me in using these credentials” button performs auth
- [x] Auth state is stored client-side for now (local storage or memory)
- [x] Auth guards block platform routes when not “logged in”

### Platform Shell
- [x] Basic platform layout (sidebar + header + content) is present
- [x] User identity display shows demo email
- [x] Sign-out clears the demo auth state

## Docs Parity Requirements

### Landing Page and Docs Alignment
- [x] All landing page claims exist in docs (features, tiers, restore paths)
- [x] Docs highlight the same CLI commands used in the landing page
- [x] Pricing and tier language matches the landing page wording
- [x] Security and encryption claims are consistent across docs and landing

### Platform Onboarding Docs
- [ ] “Get Started” in docs points to the platform entry point
- [ ] Dummy auth steps are documented as temporary

### Phase 0 Findings (Docs vs Landing)
- [x] Post-quantum encryption is claimed on landing but not documented
- [x] Scheduled backups (CLI schedule/cron) are shown on landing but not documented
- [x] Team visibility (roles, audit history) appears on landing but not documented
- [x] “Git for your data” positioning is not echoed in docs copy

## Testing Requirements

### Frontend
- [x] Routing tests cover landing → platform and docs
- [x] Auth tests cover demo login and sign-out
- [ ] UI smoke tests for platform shell

### Docs Validation
- [ ] Doc snippets match actual CLI behavior
- [ ] Platform onboarding steps verified against UI

## Iterative Rollout Plan

### Phase 0: PRD + Docs Alignment
- [x] Draft PRD and track all requirements in this file
- [x] Validate docs vs landing page claims and note gaps

### Phase 1: CTA and Platform Entry
- [x] Wire “Get Started” on landing page to platform route
- [x] Add platform route stub (shell only)
- [x] Add basic tests for routing

### Phase 2: Dummy Auth
- [x] Implement demo auth screen with fixed credentials
- [x] Gate platform routes behind demo auth state
- [x] Add tests for login/logout and route guarding

### Phase 3: Core Platform Sections (Incremental)
- [x] Databases list (mock data)
- [x] Revisions list (mock data)
- [ ] Restore flow (mock UX)
- [x] Scheduling UI (mock UX)
- [x] API key management (mock UX)
- [ ] Add tests for each new section

### Phase 4: Feature Hardening
- [ ] Replace mock data with real API integration
- [ ] Dynamic database status calculation (currently hardcoded "Healthy")
- [ ] Restore tracking and restores_label (currently hardcoded "0 this week")
- [ ] Expand test coverage (unit + integration)
- [ ] Validate docs against shipped behaviors

**Note on database status and restores tracking:**
- Currently `status` is always "Healthy" and `restores_label` is always "0 this week"
- Future work: Add restore endpoint, track restore operations in database, update `restores_label` dynamically
- Status should reflect actual database health (e.g., pending syncing, error states, healthy)
