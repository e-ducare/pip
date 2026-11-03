"use server";

import { revalidatePath } from "next/cache";
import * as store from "../sample-store";
import type { ManagerInput, Result } from "../types";

// Stubs over the sample store. #21 implements them with the database and adds
// the admin check to each one.

function done(result: Result) {
  if (result.ok) revalidatePath("/protected/admin/programs");
  return result;
}

// Creates a program, or renames it when id is set. The manager replaces the
// program's managers. A new email is invited; an existing user is not.
export async function saveProgram(input: { id?: string; name: string; manager: ManagerInput }) {
  return done(store.saveProgram(input));
}

export async function deleteProgram(programId: string) {
  return done(store.deleteProgram(programId));
}
