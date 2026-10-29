"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ListFilter, PencilLine, Plus, X } from "lucide-react";

type UserStatus = "Invite Pending" | "Active" | "Removed";
const userStatuses: UserStatus[] = ["Invite Pending", "Active", "Removed"];
type User = {
  email: string;
  roles: string[];
  status: UserStatus;
};
type OpenMenu = "email" | "roles" | null;

const initialUsers: User[] = [
  {
    email: "director@e-ducare.org",
    roles: ["Director"],
    status: "Invite Pending",
  },
  {
    email: "luca@e-ducare.org",
    roles: ["Marketing Manager", "Fundraiser"],
    status: "Active",
  },
  {
    email: "gian@e-ducare.org",
    roles: ["Developer", "Admin"],
    status: "Removed",
  },
];

const availableEmails = ["alex@e-ducare.org", "maya@e-ducare.org", "sam@e-ducare.org"];
const availableRoles = ["Director", "Marketing Manager", "Fundraiser", "Developer", "Admin"];

const statusStyles: Record<UserStatus, string> = {
  "Invite Pending": "bg-red-50 text-red-700 before:bg-red-500",
  Active: "bg-green-50 text-green-800 before:bg-green-500",
  Removed: "bg-stone-100 text-stone-600 before:bg-stone-500",
};

export default function AdminUsersPage() {
  const { id } = useParams<{ id: string }>();
  const adminPath = `/protected/projects/${encodeURIComponent(id)}/admin`;
  const [users, setUsers] = useState(initialUsers);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUserEmail, setEditingUserEmail] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState(availableEmails[0]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [selectedStatuses, setSelectedStatuses] = useState<UserStatus[]>(userStatuses);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const emailMenuRef = useRef<HTMLDivElement>(null);
  const rolesMenuRef = useRef<HTMLDivElement>(null);
  const statusFilterRef = useRef<HTMLDivElement>(null);
  const filteredUsers = users.filter((user) => selectedStatuses.includes(user.status));
  const unusedEmails = availableEmails.filter(
    (email) => !users.some((user) => user.email === email),
  );
  const emailOptions = editingUserEmail
    ? [editingUserEmail, ...unusedEmails.filter((email) => email !== editingUserEmail)]
    : unusedEmails;

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
    if (!isStatusFilterOpen) return;

    function handleOutsideClick(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && !statusFilterRef.current?.contains(target)) {
        setIsStatusFilterOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsStatusFilterOpen(false);
    }

    document.addEventListener("pointerdown", handleOutsideClick);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isStatusFilterOpen]);

  function toggleStatusFilter(status: UserStatus) {
    setSelectedStatuses((currentStatuses) =>
      currentStatuses.includes(status)
        ? currentStatuses.filter((selectedStatus) => selectedStatus !== status)
        : [...currentStatuses, status],
    );
  }

  function openAddUserDialog() {
    setEditingUserEmail(null);
    setSelectedEmail(unusedEmails[0] ?? "");
    setSelectedRoles([]);
    setOpenMenu(null);
    setIsAddUserOpen(true);
  }

  function openEditUserDialog(user: User) {
    setEditingUserEmail(user.email);
    setSelectedEmail(user.email);
    setSelectedRoles([...user.roles]);
    setOpenMenu(null);
    setIsAddUserOpen(true);
  }

  function closeUserDialog() {
    setIsAddUserOpen(false);
    setEditingUserEmail(null);
    setOpenMenu(null);
  }

  function saveUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEmail || selectedRoles.length === 0) return;

    if (editingUserEmail) {
      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.email === editingUserEmail
            ? { ...user, email: selectedEmail, roles: selectedRoles }
            : user,
        ),
      );
    } else {
      setUsers((currentUsers) => [
        ...currentUsers,
        {
          email: selectedEmail,
          roles: selectedRoles,
          status: "Invite Pending",
        },
      ]);
    }

    closeUserDialog();
  }

  function toggleRole(role: string) {
    setSelectedRoles((roles) =>
      roles.includes(role)
        ? roles.filter((selectedRole) => selectedRole !== role)
        : [...roles, role],
    );
  }

  return (
    <main className="relative left-1/2 flex min-h-screen w-screen -translate-x-1/2 flex-col bg-[#fcfafa] px-5 py-5 text-[#171815] sm:px-8 sm:py-8">
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
            <p className="text-xs text-[#171815]/55">Project administration</p>
          </div>
        </header>

        <div className="mb-9 mt-10 text-center sm:mb-12 sm:mt-12">
          <Link
            href={adminPath}
            className="mb-3 inline-block text-sm text-[#347c39] hover:underline"
          >
            Admin
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Admin / Users</h1>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[#171815]/10 bg-white shadow-sm">
          <table className="w-full min-w-[660px] border-collapse text-left">
            <thead className="bg-[#f8f9fa] text-sm font-semibold text-slate-700">
              <tr>
                <th scope="col" className="px-5 py-5 sm:px-6">
                  USER EMAIL
                </th>
                <th scope="col" className="px-5 py-5 sm:px-6">
                  ROLES
                </th>
                <th scope="col" className="px-5 py-5 sm:px-6">
                  <div ref={statusFilterRef} className="relative flex items-center gap-2">
                    <span>STATUS</span>
                    <button
                      type="button"
                      aria-label="Filter by status"
                      aria-haspopup="menu"
                      aria-expanded={isStatusFilterOpen}
                      onClick={() => setIsStatusFilterOpen((isOpen) => !isOpen)}
                      className={`grid size-7 place-items-center rounded-md transition hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#347c39] ${
                        selectedStatuses.length < userStatuses.length
                          ? "text-[#347c39]"
                          : "text-slate-600"
                      }`}
                    >
                      <ListFilter aria-hidden="true" className="size-4" />
                    </button>
                    {isStatusFilterOpen && (
                      <div
                        role="menu"
                        aria-label="Filter users by status"
                        className="absolute left-0 top-full z-20 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1.5 font-normal shadow-lg"
                      >
                        {userStatuses.map((status) => {
                          const isSelected = selectedStatuses.includes(status);
                          return (
                            <button
                              key={status}
                              type="button"
                              role="menuitemcheckbox"
                              aria-checked={isSelected}
                              onClick={() => toggleStatusFilter(status)}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-[#347c39]"
                            >
                              <span className="grid size-4 place-items-center rounded border border-slate-300">
                                {isSelected && (
                                  <Check aria-hidden="true" className="size-3.5 text-[#347c39]" />
                                )}
                              </span>
                              {status}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </th>
                <th scope="col" className="px-5 py-5 text-center sm:px-6">
                  EDIT USER
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredUsers.map((user) => (
                <tr key={user.email}>
                  <td className="px-5 py-5 text-base font-medium sm:px-6 sm:text-lg">
                    {user.email}
                  </td>
                  <td className="px-5 py-5 sm:px-6">
                    <div className="flex flex-col items-start gap-1.5">
                      {user.roles.map((role) => (
                        <span
                          key={role}
                          className="rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-700"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-5 sm:px-6">
                    <span
                      className={`inline-flex items-center gap-2 rounded-lg px-2.5 py-1 text-sm font-medium before:size-2 before:rounded-full ${statusStyles[user.status]}`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="px-5 py-5 text-center sm:px-6">
                    <button
                      type="button"
                      aria-label={`Edit ${user.email}`}
                      onClick={() => openEditUserDialog(user)}
                      className="inline-grid size-10 place-items-center rounded-lg text-slate-600 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#347c39]"
                    >
                      <PencilLine aria-hidden="true" className="size-6" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-500 sm:px-6">
                    No users match the selected statuses.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-7">
          <button
            type="button"
            onClick={openAddUserDialog}
            className="inline-flex min-h-12 items-center gap-3 rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-[#171815] shadow-sm transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#347c39]"
          >
            <span className="grid size-5 place-items-center rounded-md bg-[#171815] text-white">
              <Plus aria-hidden="true" className="size-4" />
            </span>
            Add User
          </button>
        </div>
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
            className="w-full max-w-lg rounded-2xl border border-black/10 bg-white p-6 shadow-2xl sm:p-8"
            role="dialog"
          >
            <div className="mb-7 flex items-center justify-between">
              <h2
                id="create-user-title"
                className="text-xl font-medium underline decoration-black/30 underline-offset-8"
              >
                {editingUserEmail ? "Edit User" : "Create New User"}
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={closeUserDialog}
                className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-[#347c39]"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>

            <form onSubmit={saveUser} className="space-y-6">
              <div ref={emailMenuRef} className="relative">
                <label htmlFor="user-email" className="mb-2 block text-base font-medium">
                  User email
                </label>
                <button
                  id="user-email"
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={openMenu === "email"}
                  onClick={() => setOpenMenu(openMenu === "email" ? null : "email")}
                  className="flex min-h-13 w-full items-center justify-between rounded-xl border border-slate-400 px-3.5 text-left text-sm shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#347c39]"
                >
                  <span className={selectedEmail ? "" : "text-slate-400"}>
                    {selectedEmail || "Select a user email"}
                  </span>
                  <ChevronDown aria-hidden="true" className="size-5 text-slate-600" />
                </button>
                {openMenu === "email" && (
                  <ul
                    aria-labelledby="user-email"
                    className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
                    role="listbox"
                  >
                    {emailOptions.length > 0 ? (
                      emailOptions.map((email) => (
                        <li key={email} role="option" aria-selected={selectedEmail === email}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEmail(email);
                              setOpenMenu(null);
                            }}
                            className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100"
                          >
                            {email}
                          </button>
                        </li>
                      ))
                    ) : (
                      <li className="px-3 py-2 text-sm text-slate-500">
                        No more sample emails available
                      </li>
                    )}
                  </ul>
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
                  className="flex min-h-13 w-full cursor-pointer items-center gap-2 rounded-xl border border-slate-400 px-3 py-2 shadow-sm focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#347c39]"
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
                          className="text-slate-500 hover:text-slate-900"
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
                    className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
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
                            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100"
                          >
                            {role}
                            {isSelected && (
                              <Check aria-hidden="true" className="size-4 text-[#347c39]" />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <button
                type="submit"
                disabled={!selectedEmail || selectedRoles.length === 0}
                className="min-h-11 w-full rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-45 sm:w-1/2"
              >
                {editingUserEmail ? "SAVE CHANGES" : "ADD USER"}
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
