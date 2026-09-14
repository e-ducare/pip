# Better Auth with Resend

## Decision

Better Auth owns email/password authentication and database sessions. Supabase hosts Postgres; Next.js connects through `pg`. Resend delivers verification and password-reset links.

The application has no existing users to import. Application roles, permissions, organizations, and teams are outside this implementation.

## Chosen approach

- `src/lib/auth.ts` requires verified email before login and revokes all sessions on password reset. Password hashing uses Better Auth's default scrypt.
- `src/lib/auth-email.ts` schedules delivery with Next.js `after()`. This keeps provider latency out of account-existence responses and keeps delivery alive in supported serverless runtimes. Logs exclude message bodies, recipients, and tokens.
- `/api/auth/[...all]` runs in Node.js. Browser forms use the same-origin Better Auth client; protected data requires server-side database session validation.
- The Supabase migration creates only the four core Better Auth tables. RLS and revoked Data API grants protect credential and session data from REST/GraphQL clients.
- The `pg` pool has one connection per warm instance and is reused across development reloads.

## Alternatives not selected

- An ORM adds schema tooling without an application schema that needs it. Direct `pg` matches Better Auth's supported Postgres adapter.
- Import scripts, Supabase metadata fields, and bcrypt compatibility serve existing accounts; this application has none.
- Awaiting Resend in request handlers exposes delivery latency. Untracked background promises risk termination after the response. A durable mail queue adds infrastructure not required for this initial implementation.
- The demo's admin, organization, MFA, and billing plugins introduce requirements that are not settled.

## Verification

Nineteen tests pass, including real local PostgreSQL handler tests with mocked Resend, schema compatibility, and Data API privilege checks. The production build and TypeScript checks pass with isolated test configuration. No real email was sent and no remote database was changed.

Better Auth disables origin validation by default in test mode. The redirect regression test explicitly enables origin and CSRF checks on an instance using the runtime configuration.

## Deployment requirements

`README.md` documents the five server-only environment settings, Resend domain setup, migration deployment, and test database requirements. Private env files were left untouched because editor settings block access.

Apply the reviewed migration, configure credentials, run Supabase advisors, and verify delivery to a real mailbox before release. Rate limiting is Better Auth's process-local default; multi-instance public deployments need shared storage or upstream enforcement. Email delivery failures require a new link request; there is no persistent retry queue.
