"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, LoaderCircle, Plus, RotateCw, Trash2, X } from "lucide-react";
import { roles, type AdminUser, type Role } from "../../../../admin/types";
import { resendInvite, setRoles } from "../../../../admin/users/actions";

type UserStatus = "Invite Pending" | "Active" | "Removed";
type UserTab = Exclude<UserStatus, "Removed">;
const userTabs: UserTab[] = ["Active", "Invite Pending"];
const userTabId = (tab: UserTab) => `users-tab-${tab === "Active" ? "active" : "pending"}`;
const userStatusLabels: Record<AdminUser["status"], UserStatus> = {
  active: "Active",
  invite_pending: "Invite Pending",
  removed: "Removed",
};
type User = {
  id: string;
  email: string;
  name: string;
  roles: Role[];
  status: UserStatus;
};
type OpenMenu = "email" | "roles" | null;

const maxUserNameLength = 100;
const normalizeEmail = (email: string) => email.trim().toLowerCase();
const normalizeUserName = (name: string) => name.trim().toLowerCase();
const availableEmails = ["alex@e-ducare.org", "maya@e-ducare.org", "sam@e-ducare.org"];
const availableRoles = roles;
const roleDescriptions: Record<Role, string> = {
  admin: "Manage project settings and users",
  board: "View board-level project information",
};
const sameRoles = (left: Role[], right: Role[]) =>
  left.length === right.length && left.every((role) => right.includes(role));

export default function AdminUsersClient({
  id,
  initialUsers,
}: {
  id: string;
  initialUsers: AdminUser[];
}) {
  const adminPath = `/protected/projects/${encodeURIComponent(id)}/admin`;
  const [users, setUsers] = useState<User[]>(() =>
    initialUsers.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles,
      status: userStatusLabels[user.status],
    })),
  );
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [emailMode, setEmailMode] = useState<"existing" | "new">("existing");
  const [newEmail, setNewEmail] = useState("");
  const [selectedEmail, setSelectedEmail] = useState(availableEmails[0]);
  const [selectedRoles, setSelectedRoles] = useState<Role[]>([]);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [selectedTab, setSelectedTab] = useState<UserTab>("Active");
  const [draftRolesByUserId, setDraftRolesByUserId] = useState<Record<string, Role[]>>({});
  const [openUserRoleMenuId, setOpenUserRoleMenuId] = useState<string | null>(null);
  const [isSavingRoleChanges, setIsSavingRoleChanges] = useState(false);
  const [roleSaveError, setRoleSaveError] = useState<string | null>(null);
  const [inviteStatuses, setInviteStatuses] = useState<Record<string, "sending" | "sent">>({});
  const [inviteErrors, setInviteErrors] = useState<Record<string, string>>({});
  const emailMenuRef = useRef<HTMLDivElement>(null);
  const rolesMenuRef = useRef<HTMLDivElement>(null);
  const userRolesMenuRef = useRef<HTMLDivElement>(null);
  const filteredUsers = users.filter((user) => user.status === selectedTab);
  const changedUsers = users.filter((user) => {
    const draftRoles = draftRolesByUserId[user.id];
    return (
      user.status === "Active" && draftRoles !== undefined && !sameRoles(user.roles, draftRoles)
    );
  });
  const unusedEmails = availableEmails.filter(
    (email) => !users.some((user) => user.email === email),
  );
  const currentEmail = emailMode === "existing" ? selectedEmail : newEmail;
  const emailAlreadyExists = Boolean(
    currentEmail &&
    users.some((user) => normalizeEmail(user.email) === normalizeEmail(currentEmail)),
  );
  const userNameAlreadyExists = Boolean(
    userName.trim() &&
    users.some((user) => normalizeUserName(user.name) === normalizeUserName(userName)),
  );
  const removableSelectedUserIds = selectedUserIds.filter((userId) =>
    users.some((user) => user.id === userId && !user.roles.includes("admin")),
  );

  useEffect(() => {
    const removableUserIds = new Set(
      users.filter((user) => !user.roles.includes("admin")).map((user) => user.id),
    );
    setSelectedUserIds((currentIds) => currentIds.filter((userId) => removableUserIds.has(userId)));
  }, [users]);

  useEffect(() => {
    if (!isAddUserOpen) return;

    function handleOutsideClick(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;

      const activeMenuRef = openMenu === "email" ? emailMenuRef : rolesMenuRef;
      if (!activeMenuRef.current?.contains(target)) setOpenMenu(null);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeUserDialog();
      }
    }

    document.addEventListener("pointerdown", handleOutsideClick);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isAddUserOpen, openMenu]);

  useEffect(() => {
    if (!openUserRoleMenuId) return;

    function handleOutsideClick(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && !userRolesMenuRef.current?.contains(target)) {
        setOpenUserRoleMenuId(null);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenUserRoleMenuId(null);
    }

    document.addEventListener("pointerdown", handleOutsideClick);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [openUserRoleMenuId]);

  function updateDraftRoles(userId: string, nextRoles: Role[]) {
    const user = users.find((item) => item.id === userId);
    if (!user || user.status !== "Active") return;

    setDraftRolesByUserId((currentDrafts) => {
      if (sameRoles(user.roles, nextRoles)) {
        const { [userId]: _discarded, ...remainingDrafts } = currentDrafts;
        return remainingDrafts;
      }
      return { ...currentDrafts, [userId]: nextRoles };
    });
    setRoleSaveError(null);
  }

  async function saveRoleChanges() {
    setIsSavingRoleChanges(true);
    setRoleSaveError(null);

    const savedChanges: { userId: string; roles: Role[] }[] = [];
    const errors: string[] = [];
    for (const user of changedUsers) {
      const nextRoles = draftRolesByUserId[user.id];
      if (!nextRoles) continue;

      try {
        const result = await setRoles(user.id, nextRoles);
        if (result.ok) {
          savedChanges.push({ userId: user.id, roles: nextRoles });
        } else {
          errors.push(`${user.name}: ${result.error}`);
        }
      } catch (error) {
        errors.push(
          `${user.name}: ${
            error instanceof Error ? error.message : "Unable to save role changes."
          }`,
        );
      }
    }

    if (savedChanges.length > 0) {
      setUsers((currentUsers) =>
        currentUsers.map((user) => {
          const saved = savedChanges.find((change) => change.userId === user.id);
          return saved ? { ...user, roles: saved.roles } : user;
        }),
      );
      setDraftRolesByUserId((currentDrafts) => {
        const remainingDrafts = { ...currentDrafts };
        for (const saved of savedChanges) delete remainingDrafts[saved.userId];
        return remainingDrafts;
      });
    }

    if (errors.length > 0) setRoleSaveError(errors.join(" "));
    setIsSavingRoleChanges(false);
  }

  async function handleResendInvite(userId: string) {
    setInviteStatuses((currentStatuses) => ({ ...currentStatuses, [userId]: "sending" }));
    setInviteErrors((currentErrors) => {
      const { [userId]: _discarded, ...remainingErrors } = currentErrors;
      return remainingErrors;
    });

    try {
      const [result] = await Promise.all([
        resendInvite(userId),
        new Promise<void>((resolve) => window.setTimeout(resolve, 600)),
      ]);
      if (result.ok) {
        setInviteStatuses((currentStatuses) => ({ ...currentStatuses, [userId]: "sent" }));
        return;
      }

      setInviteStatuses((currentStatuses) => {
        const { [userId]: _discarded, ...remainingStatuses } = currentStatuses;
        return remainingStatuses;
      });
      setInviteErrors((currentErrors) => ({ ...currentErrors, [userId]: result.error }));
    } catch (error) {
      setInviteStatuses((currentStatuses) => {
        const { [userId]: _discarded, ...remainingStatuses } = currentStatuses;
        return remainingStatuses;
      });
      setInviteErrors((currentErrors) => ({
        ...currentErrors,
        [userId]: error instanceof Error ? error.message : "Unable to resend invite.",
      }));
    }
  }

  function toggleUserSelection(userId: string) {
    if (users.some((user) => user.id === userId && user.roles.includes("admin"))) {
      return;
    }

    setSelectedUserIds((currentIds) =>
      currentIds.includes(userId)
        ? currentIds.filter((currentId) => currentId !== userId)
        : [...currentIds, userId],
    );
  }

  function deleteSelectedUsers() {
    setUsers((currentUsers) =>
      currentUsers.filter(
        (user) => user.roles.includes("admin") || !removableSelectedUserIds.includes(user.id),
      ),
    );
    setSelectedUserIds([]);
    setIsDeleteConfirmOpen(false);
  }

  function openAddUserDialog() {
    setUserName("");
    setEmailMode("existing");
    setNewEmail("");
    setSelectedEmail(unusedEmails[0] ?? "");
    setSelectedRoles([]);
    setOpenMenu(null);
    setIsAddUserOpen(true);
  }

  function closeUserDialog() {
    setIsAddUserOpen(false);
    setOpenMenu(null);
  }

  function saveUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = emailMode === "existing" ? selectedEmail : newEmail.trim();
    if (!email) return;
    if (!userName.trim()) return;
    if (users.some((user) => normalizeUserName(user.name) === normalizeUserName(userName))) {
      return;
    }
    if (users.some((user) => normalizeEmail(user.email) === normalizeEmail(email))) {
      return;
    }

    setUsers((currentUsers) => [
      ...currentUsers,
      {
        id: crypto.randomUUID(),
        email,
        name: userName.trim(),
        roles: selectedRoles,
        status: "Invite Pending",
      },
    ]);

    setSelectedTab("Invite Pending");
    closeUserDialog();
  }

  function toggleRole(role: Role) {
    setSelectedRoles((roles) =>
      roles.includes(role)
        ? roles.filter((selectedRole) => selectedRole !== role)
        : [...roles, role],
    );
  }

  return (
    <main className="relative left-1/2 flex min-h-screen w-screen -translate-x-1/2 flex-col bg-grey-light px-5 py-5 text-body sm:px-8 sm:py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
        <header className="flex items-center gap-3">
          <Image
            src="/images/educare-logo.png"
            alt="E-ducare"
            width={44}
            height={44}
            className="size-11 rounded-xl"
          />
          <div>
            <p className="text-sm font-semibold tracking-wide">E-ducare</p>
            <p className="text-xs text-body">Project administration</p>
          </div>
        </header>

        <div className="mb-9 mt-10 text-center sm:mb-12 sm:mt-12">
          <Link
            href={adminPath}
            className="mb-3 inline-block text-sm text-grass hover:underline"
          >
            Admin
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Admin / Users</h1>
        </div>

        <div className="overflow-hidden rounded-2xl border border-grey-mid bg-gallifrey shadow-sm">
          <div
            aria-label="User status"
            className="flex border-b border-slate-200 px-5 pt-2 sm:px-6"
            role="tablist"
          >
            {userTabs.map((tab) => {
              const isSelected = selectedTab === tab;
              const count = users.filter((user) => user.status === tab).length;
              return (
                <button
                  key={tab}
                  id={userTabId(tab)}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  aria-controls="users-tabpanel"
                  onClick={() => setSelectedTab(tab)}
                  onKeyDown={(event) => {
                    const currentIndex = userTabs.indexOf(tab);
                    let nextIndex: number | undefined;
                    if (event.key === "ArrowRight") {
                      nextIndex = (currentIndex + 1) % userTabs.length;
                    } else if (event.key === "ArrowLeft") {
                      nextIndex = (currentIndex - 1 + userTabs.length) % userTabs.length;
                    } else if (event.key === "Home") {
                      nextIndex = 0;
                    } else if (event.key === "End") {
                      nextIndex = userTabs.length - 1;
                    }

                    if (nextIndex === undefined) return;
                    event.preventDefault();
                    const nextTab = userTabs[nextIndex];
                    if (nextTab) {
                      setSelectedTab(nextTab);
                      document.getElementById(userTabId(nextTab))?.focus();
                    }
                  }}
                  className={`-mb-px inline-flex min-h-12 items-center gap-2 border-b-2 px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-grass-mid sm:px-5 ${
                    isSelected
                      ? "border-grass text-grass"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab === "Active" ? "Active Users" : "Pending Invites"}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      isSelected ? "bg-cucumber text-grass" : "bg-grey-light text-grey-ink"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <div
            id="users-tabpanel"
            role="tabpanel"
            aria-labelledby={userTabId(selectedTab)}
            className="overflow-x-auto"
          >
            <table className="w-full min-w-215 border-collapse text-left">
              <thead className="bg-grey-light text-sm font-semibold text-body">
                <tr>
                  <th scope="col" className="px-5 py-5 sm:px-6">
                    USER NAME
                  </th>
                  <th scope="col" className="px-5 py-5 sm:px-6">
                    USER EMAIL
                  </th>
                  <th scope="col" className="px-5 py-5 sm:px-6">
                    ROLES
                  </th>
                  {selectedTab === "Invite Pending" && (
                    <th scope="col" className="px-5 py-5 sm:px-6">
                      RESEND INVITE
                    </th>
                  )}
                  <th scope="col" className="px-5 py-5 text-center sm:px-6">
                    REMOVE USER
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-5 py-5 text-base font-medium sm:px-6 sm:text-lg">
                      {user.name}
                    </td>
                    <td className="px-5 py-5 text-base font-medium sm:px-6 sm:text-lg">
                      {user.email}
                    </td>
                    <td className="px-5 py-5 sm:px-6">
                      {user.status === "Invite Pending" ? (
                        <div className="flex flex-col items-start gap-1.5">
                          {user.roles.map((role) => (
                            <span
                              key={role}
                              className="rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-700"
                            >
                              {role}
                            </span>
                          ))}
                          {user.roles.length === 0 && (
                            <span className="text-sm text-slate-400">No roles</span>
                          )}
                        </div>
                      ) : (
                        <div
                          ref={openUserRoleMenuId === user.id ? userRolesMenuRef : undefined}
                          className="relative"
                        >
                          <button
                            type="button"
                            aria-label={`Edit roles for ${user.name}`}
                            aria-haspopup="true"
                            aria-expanded={openUserRoleMenuId === user.id}
                            disabled={isSavingRoleChanges}
                            onClick={() =>
                              setOpenUserRoleMenuId(openUserRoleMenuId === user.id ? null : user.id)
                            }
                            className="flex min-h-10 items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-cucumber focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-grass-mid"
                          >
                            <span className="flex flex-col items-start gap-1.5">
                              {(draftRolesByUserId[user.id] ?? user.roles).map((role) => (
                                <span
                                  key={role}
                                  className="rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-700"
                                >
                                  {role}
                                </span>
                              ))}
                              {(draftRolesByUserId[user.id] ?? user.roles).length === 0 && (
                                <span className="text-sm text-slate-400">No roles</span>
                              )}
                            </span>
                            <ChevronDown aria-hidden="true" className="size-4 text-slate-500" />
                          </button>
                          {openUserRoleMenuId === user.id && (
                            <div
                              aria-label={`Roles for ${user.name}`}
                              className="absolute left-0 top-full z-20 mt-2 w-72 rounded-xl border border-grey-mid bg-gallifrey p-1.5 shadow-lg"
                              role="group"
                            >
                              {availableRoles.map((role) => {
                                const draftRoles = draftRolesByUserId[user.id] ?? user.roles;
                                const isSelected = draftRoles.includes(role);
                                return (
                                  <button
                                    key={role}
                                    type="button"
                                    role="checkbox"
                                    aria-checked={isSelected}
                                    disabled={isSavingRoleChanges}
                                    onClick={() =>
                                      updateDraftRoles(
                                        user.id,
                                        isSelected
                                          ? draftRoles.filter((item) => item !== role)
                                          : [...draftRoles, role],
                                      )
                                    }
                                    className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left hover:bg-grey-light focus-visible:outline-2 focus-visible:outline-grass-mid"
                                  >
                                    <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded border border-slate-300">
                                      {isSelected && (
                                        <Check
                                          aria-hidden="true"
                                          className="size-3.5 text-grass"
                                        />
                                      )}
                                    </span>
                                    <span>
                                      <span className="block text-sm font-medium text-slate-800">
                                        {role}
                                      </span>
                                      <span className="block text-xs leading-5 text-slate-500">
                                        {roleDescriptions[role]}
                                      </span>
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    {selectedTab === "Invite Pending" && (
                      <td className="px-5 py-5 sm:px-6">
                        <div className="flex flex-col items-start gap-1">
                          <button
                            type="button"
                            disabled={inviteStatuses[user.id] === "sending"}
                            aria-busy={inviteStatuses[user.id] === "sending"}
                            onClick={() => handleResendInvite(user.id)}
                            className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-grass transition-colors hover:bg-cucumber focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-grass-mid disabled:cursor-wait disabled:opacity-70"
                          >
                            {inviteStatuses[user.id] === "sending" ? (
                              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                            ) : inviteStatuses[user.id] === "sent" ? (
                              <Check aria-hidden="true" className="size-4" />
                            ) : (
                              <RotateCw aria-hidden="true" className="size-4" />
                            )}
                            {inviteStatuses[user.id] === "sending"
                              ? "Re-sending invite..."
                              : inviteStatuses[user.id] === "sent"
                                ? "Invite sent"
                                : "Re-send Invite"}
                          </button>
                          {inviteErrors[user.id] && (
                            <span role="alert" className="text-sm text-red-700">
                              {inviteErrors[user.id]}
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                    <td className="px-5 py-5 text-center sm:px-6">
                      <label
                        title={
                          user.roles.includes("admin")
                            ? "Cannot delete User's with Admin Role"
                            : undefined
                        }
                        className={`inline-flex size-10 items-center justify-center gap-1 rounded-lg transition-colors ${
                          user.roles.includes("admin")
                            ? "cursor-not-allowed"
                            : "cursor-pointer hover:bg-slate-100"
                        }`}
                      >
                        <input
                          type="checkbox"
                          aria-label={
                            user.roles.includes("admin")
                              ? `${user.name} cannot be removed because they are an admin`
                              : `Select ${user.name} for removal`
                          }
                          disabled={user.roles.includes("admin")}
                          checked={removableSelectedUserIds.includes(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                          className="peer sr-only"
                        />
                        <span
                          aria-hidden="true"
                          className={`relative grid size-5 place-items-center rounded border text-gallifrey transition-colors peer-checked:border-grass peer-checked:bg-grass peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-grass-mid ${
                            user.roles.includes("admin")
                              ? "border border-slate-400 bg-slate-200 before:absolute before:top-1/2 before:-right-1.5 before:-left-1.5 before:h-px before:-translate-y-1/2 before:bg-slate-400 before:content-['']"
                              : "border-grey-mid bg-gallifrey"
                          }`}
                        >
                          {removableSelectedUserIds.includes(user.id) && (
                            <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
                          )}
                        </span>
                      </label>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td
                      colSpan={selectedTab === "Invite Pending" ? 5 : 4}
                      className="px-5 py-10 text-center text-sm text-grey-ink sm:px-6"
                    >
                      {selectedTab === "Active" ? "No active users." : "No pending invites."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-7 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={changedUsers.length > 0 ? saveRoleChanges : openAddUserDialog}
            disabled={isSavingRoleChanges}
            className="inline-flex min-h-12 items-center gap-3 rounded-xl border border-grey-mid bg-gallifrey px-5 py-3 font-semibold text-body shadow-sm transition hover:bg-cucumber focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-grass-mid"
          >
            {changedUsers.length > 0 ? (
              <>
                <Check aria-hidden="true" className="size-5 text-grass" />
                {isSavingRoleChanges ? "Saving Changes..." : "Save Changes"}
              </>
            ) : (
              <>
                <span className="grid size-5 place-items-center rounded-md bg-grass text-gallifrey">
                  <Plus aria-hidden="true" className="size-4" />
                </span>
                Add User
              </>
            )}
          </button>
          <div className="flex items-center gap-2">
            {removableSelectedUserIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedUserIds([])}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-grey-ink transition hover:bg-grey-light hover:text-body focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-grass-mid"
              >
                <X aria-hidden="true" className="size-4" />
                Deselect all ({removableSelectedUserIds.length})
              </button>
            )}
            <button
              type="button"
              aria-label={`Delete ${removableSelectedUserIds.length} selected users`}
              title="Delete selected users"
              disabled={removableSelectedUserIds.length === 0}
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="grid size-12 place-items-center rounded-xl border border-red-200 bg-white text-red-700 shadow-sm transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 aria-hidden="true" className="size-5" />
            </button>
          </div>
        </div>
        {roleSaveError && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {roleSaveError}
          </p>
        )}
      </div>

      {isAddUserOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/55 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeUserDialog();
            }
          }}
        >
          <section
            aria-labelledby="create-user-title"
            aria-modal="true"
            className="w-full max-w-lg rounded-2xl border border-grey-mid bg-gallifrey p-6 shadow-2xl sm:p-8"
            role="dialog"
          >
            <div className="mb-7 flex items-center justify-between">
              <h2
                id="create-user-title"
                className="text-xl font-medium underline decoration-black/30 underline-offset-8"
              >
                Create New User
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={closeUserDialog}
                className="grid size-9 place-items-center rounded-lg text-grey-ink hover:bg-grey-light focus-visible:outline-2 focus-visible:outline-grass-mid"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>

            <form onSubmit={saveUser} className="space-y-6">
              <div>
                <label htmlFor="user-name" className="mb-2 block text-base font-medium">
                  User Name
                </label>
                <div className="relative">
                  <input
                    id="user-name"
                    type="text"
                    maxLength={maxUserNameLength}
                    required
                    value={userName}
                    onChange={(event) => setUserName(event.target.value)}
                    placeholder="Please enter the user name here"
                    className="min-h-16 w-full rounded-xl border border-grey-mid bg-gallifrey px-4 pb-5 pt-3 text-sm text-body shadow-sm placeholder:text-grey-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-grass-mid"
                  />
                  <span
                    aria-live="polite"
                    className="pointer-events-none absolute right-3 bottom-2 text-xs text-grey-ink"
                  >
                    {userName.length}/{maxUserNameLength}
                  </span>
                </div>
                {userNameAlreadyExists && (
                  <p role="alert" className="mt-2 text-sm text-red-700">
                    user already exists
                  </p>
                )}
              </div>

              <div ref={emailMenuRef} className="relative">
                <label htmlFor="user-email" className="mb-2 block text-base font-medium">
                  User email
                </label>
                <div
                  className="mb-3 grid w-[38%] grid-cols-[1.35fr_1fr] overflow-hidden rounded-full border border-grey-mid bg-gallifrey"
                  role="group"
                  aria-label="Choose whether to use an existing or new email"
                >
                  <button
                    type="button"
                    aria-pressed={emailMode === "existing"}
                    onClick={() => {
                      setEmailMode("existing");
                      setOpenMenu(null);
                    }}
                    className={`min-h-8 min-w-0 whitespace-nowrap px-1.5 text-xs font-medium transition-colors focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-grass-mid ${
                      emailMode === "existing"
                        ? "bg-grass text-gallifrey"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Existing Email
                  </button>
                  <button
                    type="button"
                    aria-pressed={emailMode === "new"}
                    onClick={() => {
                      setEmailMode("new");
                      setOpenMenu(null);
                    }}
                    className={`min-h-8 min-w-0 whitespace-nowrap border-l border-grey-mid px-1.5 text-xs font-medium transition-colors focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-grass-mid ${
                      emailMode === "new"
                        ? "bg-grass text-gallifrey"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    New Email
                  </button>
                </div>
                {emailMode === "new" ? (
                  <input
                    id="user-email"
                    type="email"
                    required
                    maxLength={254}
                    pattern="[A-Za-z0-9._%+\-]+@e-ducare\.org"
                    title="Enter a valid @e-ducare.org email address."
                    value={newEmail}
                    onChange={(event) => setNewEmail(event.target.value)}
                    placeholder="name@e-ducare.org"
                    className="min-h-13 w-full rounded-xl border border-grey-mid bg-gallifrey px-3.5 text-sm text-body shadow-sm placeholder:text-grey-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-grass-mid"
                  />
                ) : (
                  <>
                    <button
                      id="user-email"
                      type="button"
                      aria-haspopup="listbox"
                      aria-expanded={openMenu === "email"}
                      onClick={() => setOpenMenu(openMenu === "email" ? null : "email")}
                      className="flex min-h-13 w-full items-center justify-between rounded-xl border border-grey-mid bg-gallifrey px-3.5 text-left text-sm text-body shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-grass-mid"
                    >
                      <span className={selectedEmail ? "" : "text-grey-ink"}>
                        {selectedEmail || "Select a user email"}
                      </span>
                      <ChevronDown aria-hidden="true" className="size-5 text-grey-ink" />
                    </button>
                    {openMenu === "email" && (
                      <ul
                        aria-labelledby="user-email"
                        className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-grey-mid bg-gallifrey p-1 shadow-lg"
                        role="listbox"
                      >
                        {unusedEmails.length > 0 ? (
                          unusedEmails.map((email) => (
                            <li key={email} role="option" aria-selected={selectedEmail === email}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedEmail(email);
                                  setOpenMenu(null);
                                }}
                                className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-grey-light"
                              >
                                {email}
                              </button>
                            </li>
                          ))
                        ) : (
                          <li className="px-3 py-2 text-sm text-grey-ink">
                            No more sample emails available
                          </li>
                        )}
                      </ul>
                    )}
                  </>
                )}
                {emailAlreadyExists && (
                  <p role="alert" className="mt-2 text-sm text-red-700">
                    user already exists
                  </p>
                )}
              </div>

              <div ref={rolesMenuRef} className="relative">
                <label id="user-roles-label" className="mb-2 block text-base font-medium">
                  Roles
                </label>
                <div
                  aria-labelledby="user-roles-label"
                  aria-haspopup="listbox"
                  aria-expanded={openMenu === "roles"}
                  className="flex min-h-13 w-full cursor-pointer items-center gap-2 rounded-xl border border-grey-mid bg-gallifrey px-3 py-2 text-body shadow-sm focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-grass-mid"
                  onClick={() => setOpenMenu(openMenu === "roles" ? null : "roles")}
                  onKeyDown={(event) => {
                    if (
                      event.target === event.currentTarget &&
                      (event.key === "Enter" || event.key === " ")
                    ) {
                      event.preventDefault();
                      setOpenMenu(openMenu === "roles" ? null : "roles");
                    }
                  }}
                  role="group"
                  tabIndex={0}
                >
                  <div className="flex flex-1 flex-wrap gap-1.5">
                    {selectedRoles.map((role) => (
                      <span
                        key={role}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-sm font-medium text-slate-700"
                      >
                        {role}
                        <button
                          type="button"
                          aria-label={`Remove ${role}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleRole(role);
                          }}
                          className="text-grey-ink hover:text-body"
                        >
                          <X aria-hidden="true" className="size-4" />
                        </button>
                      </span>
                    ))}
                    {selectedRoles.length === 0 && (
                      <span className="text-sm text-slate-400">Select roles</span>
                    )}
                  </div>
                  <button
                    type="button"
                    aria-label="Choose roles"
                    aria-haspopup="listbox"
                    aria-expanded={openMenu === "roles"}
                    tabIndex={-1}
                    className="grid size-8 shrink-0 place-items-center rounded-md text-slate-600"
                  >
                    <ChevronDown aria-hidden="true" className="size-5" />
                  </button>
                </div>
                <p className="mt-2 text-sm text-slate-500">Select one or more roles.</p>
                {openMenu === "roles" && (
                  <ul
                    aria-labelledby="user-roles-label"
                    className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-grey-mid bg-gallifrey p-1 shadow-lg"
                    role="listbox"
                    aria-multiselectable="true"
                  >
                    {availableRoles.map((role) => {
                      const isSelected = selectedRoles.includes(role);
                      return (
                        <li key={role} role="option" aria-selected={isSelected}>
                          <button
                            type="button"
                            onClick={() => toggleRole(role)}
                            className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left hover:bg-grey-light"
                          >
                            <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded border border-slate-300">
                              {isSelected && (
                                <Check aria-hidden="true" className="size-3.5 text-grass" />
                              )}
                            </span>
                            <span>
                              <span className="block text-sm font-medium">{role}</span>
                              <span className="block text-xs leading-5 text-slate-500">
                                {roleDescriptions[role]}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <button
                type="submit"
                disabled={
                  !(emailMode === "existing" ? selectedEmail : newEmail.trim()) ||
                  !userName.trim() ||
                  userNameAlreadyExists ||
                  emailAlreadyExists
                }
                className="min-h-11 w-full rounded-lg bg-grass px-5 py-3 text-sm font-semibold text-gallifrey transition hover:bg-grass-dark disabled:cursor-not-allowed disabled:opacity-45 sm:w-1/2"
              >
                ADD USER
              </button>
            </form>
          </section>
        </div>
      )}

      {isDeleteConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsDeleteConfirmOpen(false);
            }
          }}
        >
          <section
            aria-labelledby="delete-users-title"
            aria-describedby="delete-users-description"
            aria-modal="true"
            className="w-full max-w-md rounded-xl border border-grey-mid bg-gallifrey p-6 shadow-2xl sm:p-8"
            role="alertdialog"
          >
            <h2 id="delete-users-title" className="text-xl font-semibold">
              Delete users?
            </h2>
            <p id="delete-users-description" className="mt-3 text-sm leading-6 text-slate-600">
              Do you wish to proceed and delete {selectedUserIds.length} users?
            </p>
            <div className="mt-7 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="min-h-10 rounded-lg border border-grey-mid px-4 text-sm font-medium text-body transition hover:bg-grey-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-grass-mid"
              >
                No
              </button>
              <button
                type="button"
                onClick={deleteSelectedUsers}
                className="min-h-10 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white transition hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
              >
                Yes
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
