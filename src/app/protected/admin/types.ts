// The contract between the admin pages and their server code. The pages render
// these types and call the actions in users/actions.ts and programs/actions.ts.

export const roles = ["admin", "board"] as const;
export type Role = (typeof roles)[number];

// Derived, not stored: removed users are banned, pending users never set a password.
export type UserStatus = "active" | "invite_pending" | "removed";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  roles: Role[];
};

export type ProgramManager = Pick<AdminUser, "id" | "name" | "email" | "status">;

export type AdminProgram = {
  id: string;
  name: string;
  managers: ProgramManager[];
  // Programs with projects can't be deleted.
  hasProjects: boolean;
};

// An existing user, or a new person to invite.
export type ManagerInput = { userId: string } | { name: string; email: string };

export type Result = { ok: true } | { ok: false; error: string };
