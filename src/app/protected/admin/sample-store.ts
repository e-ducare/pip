import "server-only";

import type { AdminProgram, AdminUser, ManagerInput, Role, Result } from "./types";
import { roles } from "./types";

// In-memory stand-in for the database until #20 and #21 replace it. It lives in
// one server process, so changes last until the dev server restarts.

type SampleProgram = { id: string; name: string; managerIds: string[]; hasProjects: boolean };

const users: AdminUser[] = [
  { id: "u1", name: "Mario", email: "mario@e-ducare.org", status: "active", roles: ["admin"] },
  { id: "u2", name: "Luca", email: "luca@e-ducare.org", status: "invite_pending", roles: [] },
  {
    id: "u3",
    name: "Board Member",
    email: "board@e-ducare.org",
    status: "active",
    roles: ["board"],
  },
  { id: "u4", name: "Former Staff", email: "former@e-ducare.org", status: "removed", roles: [] },
  { id: "u5", name: "Rehema Kaarem", email: "rehema@example.org", status: "active", roles: [] },
];

const programs: SampleProgram[] = [
  { id: "p1", name: "Tanzania: Canaan Children Home", managerIds: ["u1"], hasProjects: true },
  { id: "p2", name: "Tanzania: Children Home", managerIds: ["u2", "u5"], hasProjects: false },
];

const fail = (error: string): Result => ({ ok: false, error });

export function listUsers(): AdminUser[] {
  return structuredClone(users);
}

export function listPrograms(): AdminProgram[] {
  return programs.map((program) => ({
    id: program.id,
    name: program.name,
    hasProjects: program.hasProjects,
    managers: users
      .filter((user) => program.managerIds.includes(user.id))
      .map(({ id, name, email, status }) => ({ id, name, email, status })),
  }));
}

export function inviteUser(input: { name: string; email: string; roles: Role[] }): Result {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name) return fail("Enter a name.");
  if (!email.includes("@")) return fail("Enter a valid email address.");
  if (!input.roles.every((role) => roles.includes(role))) return fail("Unknown role.");
  if (users.some((user) => user.email === email)) {
    return fail("A user with this email already exists. Edit them instead.");
  }
  users.push({
    id: crypto.randomUUID(),
    name,
    email,
    status: "invite_pending",
    roles: input.roles,
  });
  return { ok: true };
}

function findUser(userId: string) {
  return users.find((user) => user.id === userId);
}

export function setRoles(userId: string, newRoles: Role[]): Result {
  const user = findUser(userId);
  if (!user) return fail("User not found.");
  if (!newRoles.every((role) => roles.includes(role))) return fail("Unknown role.");
  user.roles = newRoles;
  return { ok: true };
}

export function resendInvite(userId: string): Result {
  const user = findUser(userId);
  if (!user) return fail("User not found.");
  if (user.status !== "invite_pending") return fail("This user has already set a password.");
  return { ok: true };
}

export function setRemoved(userId: string, removed: boolean): Result {
  const user = findUser(userId);
  if (!user) return fail("User not found.");
  user.status = removed ? "removed" : "active";
  return { ok: true };
}

export function saveProgram(input: { id?: string; name: string; manager: ManagerInput }): Result {
  const name = input.name.trim();
  if (!name) return fail("Enter a program name.");
  if (programs.some((program) => program.id !== input.id && program.name === name)) {
    return fail("A program with this name already exists.");
  }

  let managerId: string;
  if ("userId" in input.manager) {
    if (!findUser(input.manager.userId)) return fail("Manager not found.");
    managerId = input.manager.userId;
  } else {
    // An existing user becomes the manager without a new invite.
    const email = input.manager.email.trim().toLowerCase();
    const existing = users.find((user) => user.email === email);
    if (existing) {
      managerId = existing.id;
    } else {
      const invited = inviteUser({ name: input.manager.name, email, roles: [] });
      if (!invited.ok) return invited;
      managerId = users[users.length - 1].id;
    }
  }

  if (input.id) {
    const program = programs.find((candidate) => candidate.id === input.id);
    if (!program) return fail("Program not found.");
    program.name = name;
    program.managerIds = [managerId];
  } else {
    programs.push({ id: crypto.randomUUID(), name, managerIds: [managerId], hasProjects: false });
  }
  return { ok: true };
}

export function deleteProgram(programId: string): Result {
  const index = programs.findIndex((program) => program.id === programId);
  if (index === -1) return fail("Program not found.");
  if (programs[index].hasProjects)
    return fail("This program has projects, so it can't be deleted.");
  programs.splice(index, 1);
  return { ok: true };
}
