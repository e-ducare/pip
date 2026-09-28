# PIP

Next.js App Router application that runs on Cloudflare Workers through [vinext](https://github.com/cloudflare/vinext). It has Better Auth email/password authentication, Supabase-hosted Postgres behind Cloudflare Hyperdrive, and Resend email delivery. Application roles, permissions, organizations, and teams are not configured.

## Setup

Use Node.js 24 and pnpm 11.16.0.

```sh
pnpm install
```

The Worker reads these server-only settings. Locally, put them in `.env.local`; Wrangler loads `.env` and `.env.local` as the local Worker's secrets unless a `.dev.vars` file exists.

| Setting              | Value                                                                              | Production source                        |
| -------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------- |
| `BETTER_AUTH_URL`    | Application origin, `http://localhost:3000` locally or the exact production origin | `vars` in `wrangler.jsonc`               |
| `BETTER_AUTH_SECRET` | Random secret of at least 32 characters, unique to each environment                | Worker secret                            |
| `RESEND_API_KEY`     | Resend API key with sending permission for the verified domain                     | Worker secret                            |
| `RESEND_FROM_EMAIL`  | Sender on that domain, such as `PIP <auth@pip.e-ducare.org>`                       | `vars` in `wrangler.jsonc`               |
| Database             | `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` locally                 | `HYPERDRIVE` binding in `wrangler.jsonc` |

Generate the auth secret with `openssl rand -base64 32`. Never prefix these variables with `NEXT_PUBLIC_` or commit their values. Supabase publishable and service-role API keys are not database passwords and are not used by this app.

### Database connection

In production, the Worker reaches Supabase through Hyperdrive, which holds the database credentials and pools connections near the database. Workers cannot reuse a socket across requests, so each database checkout opens a `pg` client to Hyperdrive and closes it on release. [Deploy](#deploy) creates the Hyperdrive configuration.

Locally, `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` connects straight to the database instead. On IPv4 networks, use Supabase's session pooler. Copy the complete host and username from Connect rather than constructing them. The string must include the password; percent-encode its reserved characters.

Use TLS with `sslmode=verify-full`. Supabase signs its certificates with its own root CA, `supabase/prod-ca-2021.crt`; set `sslrootcert` to that file, as in `.env.example`. The dashboard's Database settings page offers the same certificate. `sslmode=require` skips certificate validation. See [Supabase connection settings](https://supabase.com/docs/guides/database/connecting-to-postgres).

Auth tables have RLS enabled without browser-facing policies. The server connection must be able to manage those tables, such as the table-owning migration role; a role subject to RLS needs explicit server-only policies. Keep database credentials server-side and restrict their privileges to the auth tables when provisioning a dedicated runtime login.

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

`pnpm dev` runs the app with Vite inside workerd, the Workers runtime. Open http://localhost:3000 and sign up. The email verification link signs you in and opens `/protected`. `/auth/login` also offers verification resend and password recovery; logging in with an unverified email does not send a new link.

`src/lib/auth.ts` configures Better Auth. `src/lib/auth-email.ts` sends plain-text verification and reset links through Resend using `after()`, which vinext passes to the Worker's `waitUntil`. Delivery runs after the response, so a success message confirms the request, not delivery. Monitor Workers Logs and Resend delivery logs for failures; users can request another link. There is no persistent email retry queue.

Password resets revoke all sessions. `src/proxy.ts` validates the database session on every route except `/auth/*`, `/api/auth/*`, and static assets. It redirects requests without a session to login and renews the session cookie, which Server Components cannot set. Pages, route handlers, and server actions still validate the session before accessing data.

Better Auth's default rate limiter keeps counters in memory, and each Workers isolate has its own, so limits apply per isolate. Before a public launch, configure shared rate-limit storage or a Cloudflare rate limiting rule. Better Auth reads the client IP from `cf-connecting-ip`, which Cloudflare sets.

## Validation

```sh
pnpm lint
pnpm test
pnpm build
pnpm start
```

`pnpm lint` runs oxlint with type-aware rules and type-checks through typescript-go. `pnpm format` runs oxfmt, which also formats Markdown.

`pnpm install` installs a pre-commit hook. It formats staged files with oxfmt, re-stages them, and runs `pnpm lint` when code or config is staged.

`pnpm build` needs no database or secrets. `pnpm start` serves the build in workerd on port 3000. For that, the build copies `.env` and `.env.local` into `dist/server/.dev.vars`; `dist/` is gitignored, and deploys do not upload that file.

Tests run in Node, where `tests/cloudflare-workers.ts` stands in for the Workers runtime module and points auth at `TEST_DATABASE_URL`. They mock Resend and never deliver email.

`pnpm test` runs unit tests and skips database integration tests unless `TEST_DATABASE_URL` is set. To run integration tests, create a disposable local Postgres database named `pip_auth_test`, create the `anon`, `authenticated`, and `service_role` Postgres roles, and apply the migration. These roles represent Supabase's Data API roles, not application roles.

```sh
TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55439/pip_auth_test pnpm test
```

Integration tests refuse non-local URLs and other database names. They truncate only the four auth tables in that disposable database. They check email verification, login/logout, reset token expiry and reuse, session revocation, trusted redirects, schema compatibility, and Data API privileges.

## Deploy

```sh
pnpm run deploy
```

`pnpm deploy` is a built-in pnpm command, so use `run`. The script builds the app and deploys the `pip` Worker to the E-ducare.org Cloudflare account, pinned by `account_id` in `wrangler.jsonc`. It serves at https://pip.e-ducare-org.workers.dev. Log Wrangler in to that account with `pnpm exec wrangler login`.

The account holds the rest of the configuration:

- The `supabase-root-2021-ca` certificate authority, uploaded from `supabase/prod-ca-2021.crt`.
- The `pip-db` Hyperdrive configuration. It connects to Supabase's direct host, `db.<project-ref>.supabase.co:5432`, as `postgres` with `sslmode=verify-full` against that certificate authority. `wrangler.jsonc` binds it as `HYPERDRIVE`.
- The `BETTER_AUTH_SECRET` and `RESEND_API_KEY` Worker secrets. Change one with `pnpm exec wrangler secret put <NAME>`.

To set up another account or Worker, upload the certificate authority, then create the Hyperdrive configuration. Hyperdrive tests the connection before saving it.

```sh
pnpm exec wrangler cert upload certificate-authority --ca-cert supabase/prod-ca-2021.crt --name supabase-root-2021-ca
pnpm exec wrangler hyperdrive create pip-db \
  --connection-string="postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres" \
  --ca-certificate-id CA_CERTIFICATE_ID --sslmode verify-full
```

Put the new IDs and origin in `wrangler.jsonc`. Auth reads its secrets at startup, so a new Worker's first deploy must include them. Pass a `KEY=value` file that lives outside the repository:

```sh
pnpm build
pnpm exec wrangler deploy --config dist/server/wrangler.json --secrets-file /path/to/secrets.env
```

Workers Logs are enabled in `wrangler.jsonc`, so `console.error` output from auth and email delivery appears in the dashboard.
