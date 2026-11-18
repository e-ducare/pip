import "server-only";

import * as store from "../sample-store";
import type { AdminProgram } from "../types";

// #21 replaces the sample store with the database. The manager picker uses
// listUsers from ../users/data.
export async function listPrograms(): Promise<AdminProgram[]> {
  return store.listPrograms();
}
