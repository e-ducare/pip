# Cloudflare Workers with vinext

## Decision

The app runs on Cloudflare Workers. vinext builds the unchanged App Router code with Vite, and `@cloudflare/vite-plugin` runs it in workerd for development, local preview, and production. Postgres stays on Supabase; the Worker reaches it through Hyperdrive. The README's Deploy section covers commands and account resources.

## Chosen approach

- Each database checkout opens a `pg` `Client` on the Hyperdrive binding, and `release()` ends it. Workers forbid I/O on a socket opened by another request, so a module-level `pg.Pool` fails once a second request reuses its connection. Hyperdrive pools the origin connections.
- Hyperdrive connects to Supabase's IPv6-only direct host with `verify-full` against Supabase's root CA. Workers cannot read an `sslrootcert` file, and their sockets cannot trust a private CA.
- `supabase/prod-ca-2021.crt` is that public root CA, committed because the dashboard download is hard to find. It came from Supabase's download bucket over HTTPS and verified against both the direct host and the session pooler.
- Better Auth's schema check is off. `betterAuth()` starts it at module load, which is Worker startup, where I/O is forbidden. The integration suite checks the schema.
- Better Auth reads client IPs from `cf-connecting-ip`, which Cloudflare sets. Clients can prepend values to `x-forwarded-for`.
- `wrangler.jsonc` pins `account_id`. The first deploy targeted the wrong account because Wrangler was logged in there.
- Auth reads its secrets at module load, so a new Worker's first deploy must pass them with `wrangler deploy --secrets-file`. Later deploys keep them.
- vinext ignores `reactCompiler` in `next.config.ts`; the compiler is a `vinext()` option.
- Workers Builds runs `pnpm run build`, then `npx wrangler deploy` on `main` or `npx wrangler preview` on other branches. The build's `.wrangler/deploy/config.json` points both at `dist/server/wrangler.json`, which keeps the `previews` block.
- Previews do not inherit top-level bindings or vars, so `wrangler.jsonc` repeats them under `previews`. Previews share the production Hyperdrive configuration by choice: no staging database exists yet.
- Better Auth uses a dynamic `baseURL` that allows the production host and `*-pip.e-ducare-org.workers.dev`. Each Preview has its own host, so origin checks and email links follow the request host, with `BETTER_AUTH_URL` as the fallback.
- Locally, miniflare's Hyperdrive proxy runs in Node and honors `sslmode=verify-full&sslrootcert=<path>`. It rejects connection strings without a password.
- Vitest runs in Node without the vinext plugin. `vitest.config.mts` maps `next/*` to vinext's shims and `cloudflare:workers` to a stub that returns `TEST_DATABASE_URL`.
- The proxy matcher test imports vinext's `matchesMiddleware` from its `dist` path; vinext does not export it. Next's matcher helper tests code that no longer runs.

## Alternatives not selected

- OpenNext. Cloudflare's Next.js guide defaults to vinext for Workers.
- `next dev` for development and vinext only for deploys. vinext-specific bugs would appear only in production, and the database module would need two variants.
- A `DATABASE_URL` secret with direct connections. Every request would pay the full TCP, TLS, and auth handshake, without certificate validation.
- Better Auth constructed per request. Every call site would need a request-scoped factory.
- `pg.Pool` with `maxUses: 1`. The pool hands a waiting request a client created during another request's release.
- A staging database for Previews. Deferred until preview traffic justifies a second Supabase project.
- `trustedOrigins` for preview hosts with a static `baseURL`. Sign-in would work, but email links would point at production.
- `wrangler preview --var BETTER_AUTH_URL=...` per branch. It depends on how Workers Builds names each Preview.

## Verification

- `pnpm lint`, `pnpm build`, and `pnpm test` pass, including the integration suite on a throwaway Postgres.
- An integration test signs up from a preview origin, expects the verification link on that origin, and expects a 403 from an unlisted host.
- `pnpm dev` and the built Worker passed sign-up, sign-in, repeated `/protected` requests, and a foreign-origin 403 against local Postgres through the Hyperdrive proxy.
- The production bundle contains no `.env.local` values. The build copies them into `dist/server/.dev.vars` for `pnpm start`; deploys do not upload that file.
- The app works on https://pip.e-ducare-org.workers.dev.

## Open items

- Custom domain such as `pip.e-ducare.org`, which changes `BETTER_AUTH_URL`.
- Shared rate-limit storage before a public launch; the in-memory limiter applies per isolate.
- Preview isolation: Previews write to the production database.
