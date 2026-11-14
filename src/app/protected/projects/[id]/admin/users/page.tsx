import { listUsers } from "../../../../admin/users/data";
import AdminUsersClient from "./users-client";

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, users] = await Promise.all([params, listUsers()]);

  return <AdminUsersClient id={id} initialUsers={users} />;
}
