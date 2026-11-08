"use server";

import { revalidatePath } from "next/cache";
import * as store from "../sample-store";
import type { Result, Role } from "../types";

// Stubs over the sample store. #20 implements them with Better Auth and adds the
// admin check to each one.

function done(result: Result) {
  if (result.ok) revalidatePath("/protected/admin/users");
  return result;
}

export async function inviteUser(input: { name: string; email: string; roles: Role[] }) {
  return done(store.inviteUser(input));
}

export async function setRoles(userId: string, roles: Role[]) {
  return done(store.setRoles(userId, roles));
}

export async function resendInvite(userId: string) {
  return done(store.resendInvite(userId));
}

export async function removeUser(userId: string) {
  return done(store.setRemoved(userId, true));
}

export async function restoreUser(userId: string) {
  return done(store.setRemoved(userId, false));
}
