# Feature Specification: Customer sign-in on auth.<brand>.com

**Feature Branch**: `main` (no feature branches; see plan.md §0)
**Created**: 2026-11-15
**Status**: Draft
**Plan item**: P1.4 in plan.md · Roadmap row 18
**Input**: "Each Headless storefront should have its own branded sign-in at auth.<domain>.com, like Canyon's. Free to use; we already use Cloudflare."

## Why

Shopify gives one store one customer-accounts domain, a subdomain of the primary domain (ecombio.com).
All three brands share store khkkyb-b8, so every brand's sign-in lands on auth.ecombio.com.
Each brand needs its own branded sign-in on its own domain, at no monthly cost.

## Decision (re-plan, see plan.md §6)

- **Auth library**: Better Auth `1.7.25` (pinned), open source, free. Runs inside the existing `headless-<brand>` Worker.
- **Database**: Cloudflare D1, one per brand: `headless-auth-<brand>`. Logins never mix across brands.
- **Sign-in host**: `auth.<brand>.com`, a custom domain on the same Worker. Session cookie is set for `.<brand>.com` so the shop and the auth host share it.
- **Sign-in methods at launch**: email one-time code + Continue with Google. No passwords.
- **Later**: Continue with Apple (needs an Apple Developer account, $99/year).
- **Email sender**: Brevo transactional API (free plan: 300 emails/day across all brands, multiple sender domains, no card), from `no-reply@<brand>.com`. Secret `BREVO_API_KEY`. Chosen over Cloudflare Email Service, which needs Workers Paid for shopper addresses. Upgrade path if volume grows: Brevo Starter or Cloudflare Email Service.
- **Shopify link**: the ECOMBIOv2 admin app finds or creates the Shopify customer by email and stores the Shopify customer ID on the user. The account pages read orders from the Admin API, filtered to this brand's storefront tag.
- **Replaces**: the Customer Account API flow in `src/server/customer-account.ts`. It stays in place until this feature passes validation, then gets removed.

## User Scenarios & Testing

### User Story 1 - Sign in with an email code (Priority: P1)

A shopper on bicyclebio.com clicks Sign in, lands on auth.bicyclebio.com, enters an email, gets a 6-digit code, enters it, and returns to the page they came from, signed in.

**Why this priority**: the core of sign-in; works with no third party.

**Independent Test**: on bicyclebio.com, sign in with a verified test address and see the account icon change to signed-in.

**Acceptance Scenarios**:
1. **Given** a new email, **When** the shopper enters the code, **Then** an account is created and they return to `return_to` (default `/en-us/account`).
2. **Given** an existing email, **When** the shopper enters the code, **Then** they sign in to the same account.
3. **Given** a wrong or expired code, **When** submitted, **Then** an error shows and the shopper can request a new code.

### User Story 2 - Continue with Google (Priority: P2)

**Why this priority**: faster sign-in for many shoppers; free.

**Independent Test**: click Continue with Google on auth.bicyclebio.com and return signed in.

**Acceptance Scenarios**:
1. **Given** a Google account whose email matches an existing account, **When** they continue, **Then** they sign in to that same account.

### User Story 3 - See my orders (Priority: P1)

**Why this priority**: the main reason to have an account.

**Independent Test**: sign in with the email of a past BicycleBio test order (e.g. #1004) and see it listed.

**Acceptance Scenarios**:
1. **Given** a signed-in shopper, **When** they open `/en-us/account/orders`, **Then** they see only their orders from this brand.
2. **Given** a shopper with no orders, **Then** an empty state with a link to shop shows.

### User Story 4 - Sign out (Priority: P1)

**Acceptance Scenarios**:
1. **Given** a signed-in shopper, **When** they sign out, **Then** the session ends on both `<brand>.com` and `auth.<brand>.com` and they land on the home page.

### Edge Cases

- Many code requests from one email or IP: rate limited (max 5 codes per email per 10 minutes).
- Email service down: show "We couldn't send your code. Try again in a minute." Nothing else breaks; the shop stays browsable.
- Shopify Admin API down during first sign-in: sign-in still succeeds; the Shopify link retries on the next account page visit.
- `return_to` pointing to another domain: ignored; default to `/en-us/account` (no open redirects).
- Shopper visits `www.<brand>.com`: cookie domain `.<brand>.com` covers it.

## Requirements

### Functional Requirements

- **FR-001**: Each brand MUST serve its sign-in page at `https://auth.<brand>.com`, styled with that brand's tokens and logo.
- **FR-002**: Sign-in MUST support email one-time code (6 digits, 10-minute expiry) and Google.
- **FR-003**: Accounts, sessions and codes MUST live in that brand's own D1 database.
- **FR-004**: Session cookie MUST be `HttpOnly`, `Secure`, `SameSite=Lax`, domain `.<brand>.com`.
- **FR-005**: On first sign-in the system MUST find or create the Shopify customer by email (ECOMBIOv2) and store its ID.
- **FR-006**: Account pages (`/account`, `/account/orders`, `/account/orders/<id>`, `/account/addresses`, `/account/profile`) MUST read from the Admin API using the stored Shopify customer ID, limited to this brand's orders.
- **FR-007**: `return_to` MUST only accept same-brand paths.
- **FR-008**: Secrets (`BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_SECRET`, `BREVO_API_KEY`) MUST be Worker secrets set through `scripts/` with masked input.
- **FR-009**: Writes to the prod Shopify store (customer create) need the owner's go-ahead before the first live run.

### Key Entities

- **User**: email, name, Shopify customer ID, created date.
- **Session**: user, expiry (30 days, refreshed on use).
- **Verification**: email, hashed code, expiry, attempt count.

## Success Criteria

- **SC-001**: Sign in, view orders, sign out works on bicyclebio.com, scooterbio.com and skaterbio.com.
- **SC-002**: Sign-in page loads in under 1 second at 375px and 1440px.
- **SC-003**: No auth secret appears in git, logs, or the browser.
- **SC-004**: Monthly cost of this feature: $0 (Workers Free, D1 free tier, Brevo free, Google free).

## Assumptions

- Sign-in code emails stay under Brevo's free 300/day across all three brands.
- Order tags or the `storefront` note on orders identify the brand (seen on test order #1004).
- Google OAuth client: one Google Cloud project, one OAuth client per brand domain.
