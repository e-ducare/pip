import "server-only";

import * as store from "../sample-store";
import type { AdminUser } from "../types";

// #20 replaces the sample store with the database.
export async function listUsers(): Promise<AdminUser[]> {
  return store.listUsers();
}
