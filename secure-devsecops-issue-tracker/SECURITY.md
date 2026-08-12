# Security Documentation

This document explains the security architecture of the Secure DevSecOps Issue Tracker.

## Authentication Architecture

- Users authenticate with email + password via `POST /api/auth/login`.
- Passwords are hashed with **bcrypt** (12 salt rounds) before storage; plaintext passwords are never persisted or logged.
- On successful login, the server issues a **JWT** containing the user's id (`sub`) and role, signed with `JWT_SECRET` and a configurable expiry (`JWT_EXPIRES_IN`, default `1h`).
- The client stores the token (in this reference app, in `localStorage`) and sends it as `Authorization: Bearer <token>` on every request.
- `requireAuth` middleware validates the token signature and expiry, then re-loads the user from the database on every request — so a deleted or role-changed user is rejected even with a still-unexpired token.
- Login failures (bad email or bad password) return the same generic `401 Invalid email or password` message, preventing user enumeration.

## Authorization Architecture (RBAC)

Three roles: `ADMIN`, `DEVELOPER`, `VIEWER`.

| Capability            | ADMIN | DEVELOPER | VIEWER |
|------------------------|:---:|:---:|:---:|
| View issues            | ✅ | ✅ | ✅ |
| Create / update issues | ✅ | ✅ | ❌ |
| Delete issues           | ✅ | ❌ | ❌ |
| Assign issues           | ✅ | ✅ | ❌ |
| Manage users / roles    | ✅ | ❌ | ❌ |
| View audit logs         | ✅ | ❌ | ❌ |

Authorization is enforced **exclusively on the backend** via the `requireRole(...roles)` middleware, mounted on every sensitive route. The React frontend also hides buttons/routes a user shouldn't see, but that is a UX convenience only — every state-changing request is re-checked server-side regardless of what the UI allowed the user to click.

## Password Security

- bcrypt with 12 salt rounds.
- Password hashes are never included in any API response (`toPublicUser()` strips `passwordHash` before serialization).
- Minimum password length of 8 characters enforced via Zod validation.

## JWT Security

- Secret loaded exclusively from the `JWT_SECRET` environment variable (never hard-coded).
- Tokens have a configurable expiry (default 1 hour).
- Malformed, unsigned, tampered, or expired tokens are rejected with `401` before any handler logic runs.
- The Bearer scheme is required; tokens are never accepted from query strings or cookies (no CSRF surface introduced by cookie-based auth).

## Input Validation

All request bodies, params, and query strings on user-facing routes are validated with **Zod** schemas (`src/validation/schemas.js`) via a reusable `validate(schema, source)` middleware. Malformed requests are rejected with `400` and a structured list of field errors, before touching the database.

## SQL Injection Prevention

All database access goes through **Prisma**, which uses parameterized queries under the hood — no raw SQL is used anywhere in this codebase. User-controlled values (e.g. search terms) are passed as Prisma query arguments, never concatenated into a query string.

## IDOR / BOLA Protection

- Role checks happen **before** any object is looked up, so a non-privileged user can never reach the point of touching another user's or another team's record.
- Users cannot delete their own account through the admin endpoint (`400` guard) and cannot self-escalate, since role changes require `ADMIN` regardless of whose id is in the URL.
- Issue mutation endpoints load the target row and return `404` if missing, rather than leaking existence information to unauthorized callers (they never get that far, since RBAC blocks them first).
- IDs are UUIDs (non-sequential, non-guessable), reducing the value of ID enumeration even for authorized users probing adjacent records.

## Rate Limiting

`express-rate-limit` is applied to:
- `POST /api/auth/login` — 10 requests / 15 minutes per IP
- `POST /api/auth/register` — 10 requests / hour per IP
- All other `/api/*` routes — 300 requests / 15 minutes per IP (general abuse guard)

## Security Headers

`helmet` is applied globally, configuring:
- A Content-Security-Policy restricting script/style/object sources
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`
- `frame-ancestors: 'none'` (clickjacking protection)

## CORS

CORS is restricted to a single explicit origin read from `FRONTEND_URL` — never `origin: "*"` — since requests carry bearer credentials.

## Error Handling

A centralized Express error-handling middleware (`src/middleware/errorHandler.js`) ensures:
- Stack traces, raw database errors, and internal details are never sent to the client.
- Prisma error codes (e.g. unique constraint violations, record-not-found) are mapped to appropriate generic HTTP status codes and messages.
- Full error details are logged server-side (console, or a log aggregator in production) for debugging.

## Audit Logging

Every security-relevant action is written to the `AuditLog` table: `LOGIN_SUCCESS`, `LOGIN_FAILURE`, `USER_CREATED`, `USER_ROLE_CHANGED`, `USER_DELETED`, `ISSUE_CREATED`, `ISSUE_UPDATED`, `ISSUE_DELETED`, `ISSUE_ASSIGNED`. Each entry records the actor, action, entity type/id, metadata, source IP, and timestamp. Audit log writes never throw back to the request — a logging failure is reported server-side but does not block the primary operation. Only `ADMIN` can read the audit log via `GET /api/audit-logs`.

## Threat Model

**In scope / mitigated:**
- Credential stuffing / brute force on login (rate limiting, generic error messages)
- Privilege escalation via role tampering (server-side RBAC re-checked per request)
- IDOR/BOLA on user and issue records (role gates before lookup, UUID ids)
- SQL injection (Prisma parameterized queries only)
- XSS via reflected/stored issue content (React escapes output by default; CSP as defense-in-depth)
- Sensitive data exposure (password hashes never serialized; generic error responses)
- Clickjacking (CSP `frame-ancestors: 'none'`)

**Out of scope / known limitations (see below).**

## Known Limitations

- JWTs are stored in `localStorage` in this reference implementation, which is simpler to demonstrate but is vulnerable to token theft via XSS; a production system should prefer an `httpOnly` secure cookie with CSRF protection, or short-lived tokens with refresh rotation.
- No email verification or password-reset flow is implemented.
- No multi-factor authentication.
- No distributed rate-limit store (the in-memory limiter resets on restart and won't scale across multiple backend instances without a shared store like Redis).
- No automated dependency vulnerability scanning wired into CI (documented as a future improvement — see `docs/INTERVIEW_GUIDE.md`).
- No refresh-token rotation; a compromised, unexpired JWT remains valid until it expires or the underlying user is deleted.
