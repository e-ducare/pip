# oxfmt, oxlint, and the pre-commit hook

## Decision

oxfmt formats code, config, and Markdown. oxlint lints and type-checks. husky runs lint-staged on every commit. The setup follows holabrisa's `web/` package, without its monorepo path workarounds.

## Chosen approach

- `.oxfmtrc.json` sets `printWidth: 100` and skips `.agents/skills/**`, which `skills-lock.json` manages, and `src/components/ui/**`, which stays as shadcn writes it. oxfmt already skips gitignored paths.
- oxfmt formats Markdown with its bundled Prettier printer, so there is no separate `prettier` dependency.
- `.oxlintrc.jsonc` enables the `typescript`, `react`, `react-perf`, `nextjs`, and `vitest` plugins. `no-console` allows `console.error`, which the auth server code uses for failures it cannot surface to users.
- `pnpm lint` runs `vinext typegen` before `oxlint --type-aware --type-check`. Without `.next/types` and `next-env.d.ts`, the `LayoutProps` global in `src/app/layout.tsx` and the `next/*` declarations do not resolve.
- oxlint's `--type-check` runs typescript-go over `tsconfig.json`. It is the only type check; `vite build` does not type-check.
- lint-staged formats staged Markdown only. Staged code or config is formatted and then linted in sequence, so oxfmt never writes a file oxlint is reading. oxlint takes no filenames because type-aware rules need the whole program.
- `--no-error-on-unmatched-pattern` lets a commit that touches only oxfmt-ignored files pass.

## Alternatives not selected

- Omitting the `vitest` plugin, as holabrisa does. The tests use Vitest, and `require-mock-type-parameters` keeps mock call arguments from being `any`.
- Keeping `tsc --noEmit` alongside oxlint. typescript-go already checks the project, and a second checker on every commit adds time.
- ESLint. The project never had it; Next.js 16 has no `next lint`.

## Verification

In a scratch copy, the hook reformatted and re-staged a staged `.ts` and `.md` file, blocked a commit with a type error, and passed a commit touching only `src/components/ui/`. A web-only commit took about 2 seconds.
