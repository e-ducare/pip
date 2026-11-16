"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { listPrograms } from "../admin/programs/data";
import { listUsers } from "../admin/users/data";
import type { AccountContext, AccountRoleId } from "./account-context";

const roleOrder: AccountRoleId[] = ["admin", "board"];

// Uses the shared users/programs contract. When #20 and #21 replace the sample
// store with database queries, this keeps working without UI changes.
export async function getAccountContext(): Promise<AccountContext | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const email = session.user.email.trim().toLowerCase();
  const [users, programs] = await Promise.all([listUsers(), listPrograms()]);

  const user = users.find(
    (candidate) => candidate.email.trim().toLowerCase() === email,
  );
  const managedPrograms = programs.filter((program) =>
    program.managers.some(
      (manager) => manager.email.trim().toLowerCase() === email,
    ),
  );

  return {
    roles: roleOrder.filter((role) => user?.roles.includes(role)),
    programs: managedPrograms.map((program) => program.name),
  };
}
