# Users, roles, and invites

Status: decided 2026-10-31. Work is split into the tasks at the end.

## Decisions

1. Admins can invite any email address. Field program managers use their own addresses.
2. Sign-up is closed. The app is invite-only.
3. Global roles are `admin` and `board`. #11 adds stage-owner roles.
4. Every table name is plural snake_case, Better Auth's included.
5. The migration drops the test submission.

## Requirements

From the open issues and `NOTES.md`:

- Admins see a list of users with email, status (Active, Invite pending, Removed), and roles. They invite new users and change roles. A user can hold several roles. (#10, #14)
- Admins create and edit programs. A program has one or more program managers. The admin picks an existing user or invites a new one by email. Existing users get no invite. The programs table shows "Invite pending" next to managers who have not joined. (#13)
- Program managers create projects in their programs. They see those projects and the feedback on them, and resubmit. (#10, mockup in #13)
- Reviewers see every submitted project and leave feedback. #10 treats reviewer and admin as the same person.
- E-ducare admins see everything. Field program managers see their own program only. E-ducare staff can manage several programs. (`NOTES.md`)
- Later: each project moves through stages owned by Applicant, Board, L&F Director, Marketing Director, and Fundraising Director, with deadline reminders. (#11)
- Later: each program gets a Drive folder, and each approved project gets a subfolder under it. (#12, #15)

## Current state

- Better Auth tables: `user`, `session`, `account`, `verification`, with camelCase columns. 3 users, 2 verified. Anyone can sign up.
- There are no roles. Any signed-in user can submit a project.
- `infrastructure_form` (the project), `"Beneficiaries"`, and `projected_costs` were created in the dashboard, and no migration creates them. They hold 1 test project with no owner, 1 beneficiary, and 3 costs.
- The admin pages from PR #18 live under `/protected/projects/[id]/admin` and render hard-coded sample data. Users and programs don't belong to a project.

## Model

Access comes from two separate places:

1. Global roles live on the user: `admin` and `board`. They apply to every program.
2. Program access lives on the program. A `program_managers` row links a user to a program. "Program manager" is not a role.

|                               | admin | board | manager of program P | no role or program |
| ----------------------------- | ----- | ----- | -------------------- | ------------------ |
| See all programs and projects | yes   | yes   | no                   | no                 |
| Create and edit projects in P | yes   | no    | yes                  | no                 |
| See P's projects and feedback | yes   | yes   | yes                  | no                 |
| Manage users and programs     | yes   | no    | no                   | no                 |

A new role such as `marketing_director` is one more string in the role list. The role column is text, so adding a role needs no migration.

Every person is a `users` row, including people who haven't accepted their invite. So `program_managers.user_id` can point at an invited manager before they have a password.

Status is derived from existing columns, not stored:

- Removed: `users.banned` is true.
- Invite pending: the user has no `credential` row in `accounts`, meaning they never set a password.
- Active: everyone else.

## Better Auth admin plugin

Use the [admin plugin](https://www.better-auth.com/docs/plugins/admin). It adds `role`, `banned`, `banReason`, and `banExpires` to the user, and `impersonatedBy` to the session. It provides `createUser`, `setRole`, `banUser`, `unbanUser`, `listUsers`, and impersonation. It stores several roles comma-separated, as in `admin,board`. Its `schema` option maps these fields to snake_case columns.

I checked these in the better-auth 1.7.4 source:

- `createUser` without a password creates a user with no credential account (`plugins/admin/routes.mjs`).
- `resetPassword` creates the credential account when it is missing (`api/routes/password.mjs`). A reset link therefore works as a set-password link.
- `resetPassword` does not set `emailVerified`. Because `requireEmailVerification` is on, an invited user could not log in. An `onPasswordReset` hook will mark the email verified, because the user clicked a link sent to that inbox.
- Banning deletes the user's sessions and blocks new ones.

I rejected the organization plugin. It is built for multi-tenant products: each session has an active organization, roles are per organization, and invitees accept after signing up. Programs here are not tenants, and staff roles such as `board` would need a second invite path.

## Invite flow

One server function serves both the users page and the programs page:

1. Lowercase the email.
2. If a user with that email exists, the users page answers "already a user, edit them instead". The programs page adds them as a manager and sends nothing.
3. Otherwise, call `auth.api.createUser({ email, name, role })` without a password.
4. Create a set-password token valid for 7 days and email the link. The link passes through Better Auth's `/reset-password/:token` endpoint to the existing `/auth/reset-password` page.
5. "Resend invite" on a pending user repeats step 4.

Step 4 writes the token with `(await auth.$context).internalAdapter.createVerificationValue`, using Better Auth's `reset-password:<token>` identifier. The reason: `resetPasswordTokenExpiresIn` is global, and a 1-hour invite is too short for field staff. The identifier format is internal to Better Auth, so an integration test runs invite, set password, and log in. A Better Auth upgrade that changes the format fails that test.

A pending user who uses "Forgot password" gets an ordinary 1-hour reset link, which also activates them.

Sign-up closes (`emailAndPassword.disableSignUp`), and the sign-up page and link go away. Remove means ban, and restore means unban. The UI has no hard delete. Emails are read-only after the invite.

## Tables

Naming rule: plural, lowercase snake_case, `id` primary keys.

Better Auth's tables are renamed in place, so the 3 users and their sessions survive. `src/lib/auth.ts` maps each model and field with `modelName` and `fields`.

| Better Auth model | Table           | Renamed columns                                                                                                                                                        |
| ----------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| user              | `users`         | `email_verified`, `created_at`, `updated_at`, new `role`, `banned`, `ban_reason`, `ban_expires`                                                                        |
| session           | `sessions`      | `expires_at`, `ip_address`, `user_agent`, `user_id`, `created_at`, `updated_at`, new `impersonated_by`                                                                 |
| account           | `accounts`      | `account_id`, `provider_id`, `user_id`, `access_token`, `refresh_token`, `id_token`, `access_token_expires_at`, `refresh_token_expires_at`, `created_at`, `updated_at` |
| verification      | `verifications` | `expires_at`, `created_at`, `updated_at`                                                                                                                               |

App tables replace the three dashboard tables:

```text
programs          id uuid pk, name text not null unique, created_at
program_managers  program_id uuid → programs on delete cascade, user_id text → users on delete cascade,
                  created_at; pk (program_id, user_id); index on user_id
projects          id uuid pk, program_id uuid not null → programs, created_by text not null → users,
                  situation, risk, goal, mission_adherence, change, sustainability, additional_info,
                  created_at, updated_at; indexes on program_id and created_by
beneficiaries     id uuid pk, project_id uuid not null → projects on delete cascade,
                  name, age int, family_members int, additional_info; index on project_id
project_costs     id uuid pk, project_id uuid not null → projects on delete cascade,
                  description, amount numeric(12,2), category text check in ('NRC', 'RC'); index on project_id
```

New tables follow the existing pattern: RLS on, no policies, and privileges revoked from `anon`, `authenticated`, and `service_role`. The Next.js server does all data access and checks roles and program membership in its SQL.

The migration also has to make a fresh database buildable. Today `20261002120000` alters `infrastructure_form`, which no migration creates.

These wait for their own features: project status and review feedback (#10), stages and deadlines (#11), a project type for sponsorship (`NOTES.md`), and a project name and Drive folder ids (#12).

## Release order

Worker Previews share the production database. Once the Better Auth rename runs, every deploy still on the old names fails auth, including `main` and open preview branches. Apply the migration when the auth task merges to `main`, then rebase open branches.

Between the app-tables task and "Projects belong to a program", submitting a project fails, because a project needs a program. Nobody submits real projects yet, so this gap is acceptable.

## Tasks

The admin pages split at the server/client boundary. Each page's server component loads data and passes it as props. The client component renders it and calls server actions for every change. A typed contract (data types and action signatures) sits between the two and lands first, with stub actions, so frontend and backend work in parallel.

| Path under `src/app/protected/admin/` | Owner  | Contents                                                         |
| ------------------------------------- | ------ | ---------------------------------------------------------------- |
| `layout.tsx`                          | Gian   | Admin check                                                      |
| `users/page.tsx`, `users/actions.ts`  | Gian   | Data loading; `"use server"` actions with admin check, SQL, auth |
| `users/users-table.tsx`               | Zephan | `"use client"` table, filter, dialogs, pending and error states  |
| `programs/…`                          | same   | Same split                                                       |

Server actions enforce the rules that protect data. The UI repeats them only to help the user, for example by disabling "Remove" on the admin's own row.

Epics: #26 (users, roles, and invites) and #27 (programs and projects).

| Issue | Task                                                                 | Owner  | Blocked by    |
| ----- | -------------------------------------------------------------------- | ------ | ------------- |
| #18   | Move the pages to `/protected/admin` in review, then merge           | Zephan | review        |
| #19   | Contract: types and stub actions for users and programs              | Gian   | #18           |
| #20   | Auth foundation, admin check, Admin nav link, users actions and data | Gian   | #19           |
| #21   | App tables, programs actions and data                                | Gian   | #20           |
| #22   | Users table on the contract                                          | Zephan | #19           |
| #23   | Programs table on the contract, one manager in the form              | Zephan | #19           |
| #24   | Projects belong to a program, upload access check                    | Zephan | #21, #22, #23 |
| #25   | Profile page: name, password, sign out                               | Zephan |               |

Gian keeps the migrations, Better Auth config, invite tokens, and server actions. They touch production data, sessions, and Better Auth internals. #24 is Zephan's first task across the boundary, with Gian reviewing the server check.
