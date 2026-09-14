# PIP

Next.js application with Better Auth email/password authentication, Supabase-hosted Postgres, and Resend email delivery. Application roles, permissions, organizations, and teams are not configured.

## Setup

Use Node.js 24 and pnpm 11.16.0.

```sh
pnpm install
```

Set these server-only variables in `.env.local` and in your deployment environment:

| Variable             | Value                                                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`       | Supabase Postgres connection URI from the dashboard's Connect dialog, including the database password and TLS settings |
| `BETTER_AUTH_URL`    | Application origin, `http://localhost:3000` locally or your exact HTTPS production origin                              |
| `BETTER_AUTH_SECRET` | Random secret of at least 32 characters, unique to each environment                                                    |
| `RESEND_API_KEY`     | Resend API key with sending permission for the verified domain                                                         |
| `RESEND_FROM_EMAIL`  | Sender on that domain, such as `PIP <auth@pip.e-ducare.org>`                                                           |

Generate the auth secret with `openssl rand -base64 32`. Never prefix these variables with `NEXT_PUBLIC_` or commit their values. Supabase publishable and service-role API keys are not database passwords and are not used by this app.

### Database connection

For serverless hosting, choose Supabase's transaction pooler. For local development on IPv4, the session pooler also works. Copy the complete host and username from Connect rather than constructing them. Percent-encode reserved characters in the password.

Use TLS for remote connections. Configure `sslmode=verify-full` and the Supabase root certificate via `sslrootcert` when required by your connection. Do not disable certificate validation. See [Supabase connection settings](https://supabase.com/docs/guides/database/connecting-to-postgres).

The application uses one `pg` connection per warm instance. Auth tables have RLS enabled without browser-facing policies. The server connection must be able to manage those tables, such as the table-owning migration role; a role subject to RLS needs explicit server-only policies. Keep database credentials server-side and restrict their privileges to the auth tables when provisioning a dedicated runtime login.

### Resend

1. Add a sending domain in [Resend](https://resend.com/domains).
2. Add the DNS records Resend supplies and wait for verification.
3. Create a sending API key, preferably scoped to that domain.
4. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` above.
5. Disable click tracking for authentication emails so verification and reset links are not rewritten.

Resend receives the recipient address and the message containing the authentication link. Its sending quotas and pricing apply. The `resend.dev` test sender is restricted and is not a production sender.

### Create the auth tables

Review `supabase/migrations/20260914114448_better_auth.sql`, then apply it to the intended linked Supabase project:

```sh
supabase migration list --linked
supabase db push --linked --dry-run
supabase db push --linked
supabase db advisors --linked
```

Check the linked project and migration history before pushing. If the remote history contains a migration absent locally, retrieve that migration rather than resetting the database or rewriting its history.

The migration creates `user`, `session`, `account`, and `verification` in `public`, with foreign-key indexes and RLS. It revokes table privileges from `PUBLIC`, `anon`, `authenticated`, and `service_role`. It does not alter Supabase's managed `auth` schema or import users. Do not run Better Auth's automatic migration against production instead: it does not include this migration's Data API restrictions.

Better Auth sessions do not populate Supabase's `auth.uid()`. Future application data access needs explicit server-side authorization or a separately designed RLS integration. You can disable Supabase's Data API if nothing else uses it.

## Run

```sh
pnpm dev
```

Open http://localhost:3000. Sign up, verify the email link, and log in to `/protected`. `/auth/login` also offers verification resend and password recovery.

`src/lib/auth.ts` configures Better Auth. `src/lib/auth-email.ts` sends plain-text verification and reset links through Resend using Next.js `after()`. Delivery runs after the response, so a success message confirms the request, not delivery. Monitor server logs and Resend delivery logs for failures; users can request another link. There is no persistent email retry queue.

Password resets revoke all sessions. Protected pages validate the database session; the proxy's cookie-presence check only provides an early redirect. Every future protected page, route handler, and server action must validate the session before accessing data.

Better Auth's default production rate limiter uses process-local memory. Before a multi-instance public deployment, configure shared rate-limit storage or an upstream limiter and verify the proxy's trusted IP headers. A Node.js deployment supporting `after()` is required; static export is not supported.

## Validation

```sh
pnpm typecheck
pnpm test
pnpm build
```

The build requires auth environment settings and a reachable migrated database for Better Auth's schema validation. Tests mock Resend and never deliver email.

`pnpm test` runs unit tests and skips database integration tests unless `TEST_DATABASE_URL` is set. To run integration tests, create a disposable local Postgres database named `pip_auth_test`, create the `anon`, `authenticated`, and `service_role` Postgres roles, and apply the migration. These roles represent Supabase's Data API roles, not application roles.

```sh
TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55439/pip_auth_test pnpm test
```

Integration tests refuse non-local URLs and other database names. They truncate only the four auth tables in that disposable database. They check email verification, login/logout, reset token expiry and reuse, session revocation, trusted redirects, schema compatibility, and Data API privileges.
