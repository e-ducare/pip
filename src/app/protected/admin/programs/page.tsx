"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, ChevronDown, PencilLine, Plus, Trash2, X } from "lucide-react";

type ProgramManager = {
  email: string;
  invitePending: boolean;
};

type Program = {
  name: string;
  managers: ProgramManager[];
  hasProjects: boolean;
};

function hasPendingManagerInvites(program: Program) {
  return program.managers.some((manager) => manager.invitePending);
}

type ProgramTab = "Active" | "Invite Pending";
const programTabs: ProgramTab[] = ["Active", "Invite Pending"];
const programTabId = (tab: ProgramTab) => `programs-tab-${tab === "Active" ? "active" : "pending"}`;

const initialPrograms: Program[] = [
  {
    name: "Tanzania : Canaan Children Home",
    managers: [{ email: "mario@e-ducare.org", invitePending: false }],
    hasProjects: true,
  },
  {
    name: "Tanzania : Children Home",
    managers: [{ email: "luca@e-ducare.org", invitePending: true }],
    hasProjects: false,
  },
  {
    name: "—",
    managers: [],
    hasProjects: false,
  },
];

const availableManagers = ["mario@e-ducare.org", "luca@e-ducare.org"];

export default function AdminProgramsPage() {
  const { id } = useParams<{ id: string }>();
  const adminPath = `/protected/projects/${encodeURIComponent(id)}/admin`;
  const [programs, setPrograms] = useState(initialPrograms);
  const [selectedTab, setSelectedTab] = useState<ProgramTab>("Active");
  const [selectedPendingProgramIndices, setSelectedPendingProgramIndices] = useState<number[]>([]);
  const [isAddProgramOpen, setIsAddProgramOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteAcknowledged, setDeleteAcknowledged] = useState(false);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [bulkDeleteAcknowledged, setBulkDeleteAcknowledged] = useState(false);
  const [editingProgramIndex, setEditingProgramIndex] = useState<number | null>(null);
  const [programName, setProgramName] = useState("");
  const [selectedManagers, setSelectedManagers] = useState<string[]>([]);
  const [isManagerMenuOpen, setIsManagerMenuOpen] = useState(false);
  const managerMenuRef = useRef<HTMLDivElement>(null);
  const editedProgram = editingProgramIndex === null ? null : programs[editingProgramIndex];
  const filteredPrograms = programs.flatMap((program, index) =>
    program.name !== "—" && hasPendingManagerInvites(program) === (selectedTab === "Invite Pending")
      ? [{ program, index }]
      : [],
  );
  const removableSelectedPendingProgramIndices = selectedPendingProgramIndices.filter(
    (index) => programs[index] && !programs[index].hasProjects,
  );
  const hasProgramChanges =
    editedProgram !== null &&
    editedProgram !== undefined &&
    (programName.trim() !== editedProgram.name ||
      selectedManagers.length !== editedProgram.managers.length ||
      selectedManagers.some(
        (manager) => !editedProgram.managers.some((item) => item.email === manager),
      ));

  useEffect(() => {
    if (!isAddProgramOpen && !isBulkDeleteConfirmOpen) return;

    function handleOutsideClick(event: MouseEvent) {
      const target = event.target;
      if (target instanceof Node && !managerMenuRef.current?.contains(target)) {
        setIsManagerMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (isDeleteConfirmOpen) {
          setIsDeleteConfirmOpen(false);
          setDeleteAcknowledged(false);
        } else if (isBulkDeleteConfirmOpen) {
          setIsBulkDeleteConfirmOpen(false);
          setBulkDeleteAcknowledged(false);
        } else {
          setIsManagerMenuOpen(false);
        }
      }
    }

    document.addEventListener("click", handleOutsideClick);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isAddProgramOpen, isBulkDeleteConfirmOpen, isDeleteConfirmOpen, isManagerMenuOpen]);

  function closeAddProgramDialog() {
    setIsAddProgramOpen(false);
    setIsDeleteConfirmOpen(false);
    setDeleteAcknowledged(false);
    setEditingProgramIndex(null);
    setIsManagerMenuOpen(false);
  }

  function openDeleteConfirmation() {
    setDeleteAcknowledged(false);
    setIsManagerMenuOpen(false);
    setIsDeleteConfirmOpen(true);
  }

  function closeDeleteConfirmation() {
    setIsDeleteConfirmOpen(false);
    setDeleteAcknowledged(false);
  }

  function deleteProgram() {
    if (
      editingProgramIndex === null ||
      !deleteAcknowledged ||
      programs[editingProgramIndex]?.hasProjects
    )
      return;

    setPrograms((currentPrograms) =>
      currentPrograms.filter((_, index) => index !== editingProgramIndex),
    );
    closeAddProgramDialog();
  }

  function togglePendingProgramSelection(index: number) {
    if (programs[index]?.hasProjects) return;

    setSelectedPendingProgramIndices((currentIndices) =>
      currentIndices.includes(index)
        ? currentIndices.filter((currentIndex) => currentIndex !== index)
        : [...currentIndices, index],
    );
  }

  function deleteSelectedPendingPrograms() {
    if (!bulkDeleteAcknowledged || removableSelectedPendingProgramIndices.length === 0) return;

    setPrograms((currentPrograms) =>
      currentPrograms.filter((_, index) => !removableSelectedPendingProgramIndices.includes(index)),
    );
    setSelectedPendingProgramIndices([]);
    setIsBulkDeleteConfirmOpen(false);
    setBulkDeleteAcknowledged(false);
  }

  function openAddProgramDialog() {
    setEditingProgramIndex(null);
    setProgramName("");
    setSelectedManagers([]);
    setIsManagerMenuOpen(false);
    setIsAddProgramOpen(true);
  }

  function openEditProgramDialog(program: Program, index: number) {
    setEditingProgramIndex(index);
    setProgramName(program.name);
    setSelectedManagers(program.managers.map((manager) => manager.email));
    setIsManagerMenuOpen(false);
    setIsAddProgramOpen(true);
  }

  function addProgram(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = programName.trim();
    if (!name || selectedManagers.length === 0) return;

    if (editingProgramIndex !== null) {
      setPrograms((currentPrograms) =>
        currentPrograms.map((program, index) =>
          index === editingProgramIndex
            ? {
                ...program,
                name,
                managers: selectedManagers.map(
                  (email) =>
                    program.managers.find((manager) => manager.email === email) ?? {
                      email,
                      invitePending: true,
                    },
                ),
              }
            : program,
        ),
      );
    } else {
      setPrograms((currentPrograms) => [
        ...currentPrograms.filter((program) => program.name !== "—"),
        {
          name,
          managers: selectedManagers.map((email) => ({ email, invitePending: true })),
          hasProjects: false,
        },
      ]);
      setSelectedTab("Invite Pending");
    }
    closeAddProgramDialog();
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
          <Link href={adminPath} className="mb-3 inline-block text-sm text-grass hover:underline">
            Admin
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Admin / Programs</h1>
        </div>

        <div className="overflow-hidden rounded-2xl border border-grey-mid bg-gallifrey shadow-sm">
          <div
            aria-label="Program status"
            className="flex border-b border-slate-200 px-5 pt-2 sm:px-6"
            role="tablist"
          >
            {programTabs.map((tab) => {
              const isSelected = selectedTab === tab;
              const count = programs.filter(
                (program) =>
                  program.name !== "—" &&
                  hasPendingManagerInvites(program) === (tab === "Invite Pending"),
              ).length;
              return (
                <button
                  key={tab}
                  id={programTabId(tab)}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  aria-controls="programs-tabpanel"
                  onClick={() => {
                    setSelectedTab(tab);
                    setSelectedPendingProgramIndices([]);
                  }}
                  onKeyDown={(event) => {
                    const currentIndex = programTabs.indexOf(tab);
                    let nextIndex: number | undefined;
                    if (event.key === "ArrowRight") {
                      nextIndex = (currentIndex + 1) % programTabs.length;
                    } else if (event.key === "ArrowLeft") {
                      nextIndex = (currentIndex - 1 + programTabs.length) % programTabs.length;
                    } else if (event.key === "Home") {
                      nextIndex = 0;
                    } else if (event.key === "End") {
                      nextIndex = programTabs.length - 1;
                    }

                    if (nextIndex === undefined) return;
                    event.preventDefault();
                    const nextTab = programTabs[nextIndex];
                    if (nextTab) {
                      setSelectedTab(nextTab);
                      setSelectedPendingProgramIndices([]);
                      document.getElementById(programTabId(nextTab))?.focus();
                    }
                  }}
                  className={`-mb-px inline-flex min-h-12 items-center gap-2 border-b-2 px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-grass-mid sm:px-5 ${
                    isSelected
                      ? "border-grass text-grass"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab === "Active" ? "Active Programs" : "Pending Invite"}
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
            id="programs-tabpanel"
            role="tabpanel"
            aria-labelledby={programTabId(selectedTab)}
            className="overflow-x-auto"
          >
            <table className="w-full min-w-[600px] border-collapse text-left">
              <thead className="bg-grey-light text-sm font-semibold text-body">
                <tr>
                  <th scope="col" className="px-5 py-4 sm:px-6">
                    PROGRAM NAME
                  </th>
                  <th scope="col" className="px-5 py-4 sm:px-6">
                    PROGRAM MANAGER
                  </th>
                  <th scope="col" className="px-5 py-4 text-center sm:px-6">
                    {selectedTab === "Active" ? "EDIT PROGRAM" : "DELETE PROGRAM"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredPrograms.map(({ program, index }) => (
                  <tr key={`${program.name}-${index}`}>
                    <td className="px-5 py-5 text-sm font-medium sm:px-6">{program.name}</td>
                    <td className="px-5 py-3 sm:px-6">
                      {program.managers.length > 1 ? (
                        <ul className="space-y-2">
                          {program.managers.map((manager) => (
                            <li
                              key={manager.email}
                              className="flex items-center gap-2 text-sm font-medium"
                            >
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium before:size-1.5 before:rounded-full ${
                                  manager.invitePending
                                    ? "bg-red-50 text-red-700 before:bg-red-500"
                                    : "bg-green-50 text-green-700 before:bg-green-500"
                                }`}
                              >
                                {manager.invitePending ? "Invite pending" : "Invite accepted"}
                              </span>
                              <span>{manager.email}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <>
                          {program.managers[0]?.invitePending && (
                            <span className="mb-2 inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 before:size-1.5 before:rounded-full before:bg-red-500">
                              Invite pending
                            </span>
                          )}
                          <p
                            className={
                              program.managers.length === 0
                                ? "text-slate-400"
                                : "text-sm font-medium"
                            }
                          >
                            {program.managers[0]?.email || "—"}
                          </p>
                        </>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center sm:px-6">
                      {selectedTab === "Active" ? (
                        <button
                          type="button"
                          aria-label={`Edit ${program.name}`}
                          onClick={() => openEditProgramDialog(program, index)}
                          className="inline-grid size-10 place-items-center rounded-lg text-grey-ink transition hover:bg-grey-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-grass-mid"
                        >
                          <PencilLine aria-hidden="true" className="size-6" />
                        </button>
                      ) : (
                        <label
                          title={
                            program.hasProjects
                              ? "Cannot delete a program with projects"
                              : undefined
                          }
                          className={`inline-flex size-10 items-center justify-center rounded-lg transition-colors ${
                            program.hasProjects
                              ? "cursor-not-allowed"
                              : "cursor-pointer hover:bg-slate-100"
                          }`}
                        >
                          <input
                            type="checkbox"
                            aria-label={
                              program.hasProjects
                                ? `${program.name} cannot be deleted because it has projects`
                                : `Select ${program.name} for deletion`
                            }
                            disabled={program.hasProjects}
                            checked={removableSelectedPendingProgramIndices.includes(index)}
                            onChange={() => togglePendingProgramSelection(index)}
                            className="peer sr-only"
                          />
                          <span
                            aria-hidden="true"
                            className={`relative grid size-5 place-items-center rounded border text-gallifrey transition-colors peer-checked:border-grass peer-checked:bg-grass peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-grass-mid ${
                              program.hasProjects
                                ? "border-slate-400 bg-slate-200 before:absolute before:top-1/2 before:-right-1.5 before:-left-1.5 before:h-px before:-translate-y-1/2 before:bg-slate-400 before:content-['']"
                                : "border-grey-mid bg-gallifrey"
                            }`}
                          >
                            {removableSelectedPendingProgramIndices.includes(index) && (
                              <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
                            )}
                          </span>
                        </label>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredPrograms.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-5 py-10 text-center text-sm text-slate-500 sm:px-6"
                    >
                      {selectedTab === "Active"
                        ? "No active programs."
                        : "No pending program invites."}
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
            onClick={openAddProgramDialog}
            className="inline-flex min-h-12 items-center gap-3 rounded-xl border border-grey-mid bg-gallifrey px-5 py-3 font-semibold text-body shadow-sm transition hover:bg-cucumber focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-grass-mid"
          >
            <span className="grid size-5 place-items-center rounded-md bg-grass text-gallifrey">
              <Plus aria-hidden="true" className="size-4" />
            </span>
            Add Program
          </button>
          {selectedTab === "Invite Pending" && (
            <div className="flex items-center gap-2">
              {removableSelectedPendingProgramIndices.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedPendingProgramIndices([])}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-grey-ink transition hover:bg-grey-light hover:text-body focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-grass-mid"
                >
                  <X aria-hidden="true" className="size-4" />
                  Deselect all ({removableSelectedPendingProgramIndices.length})
                </button>
              )}
              <button
                type="button"
                aria-label={`Delete ${removableSelectedPendingProgramIndices.length} selected programs`}
                title="Delete selected programs"
                disabled={removableSelectedPendingProgramIndices.length === 0}
                onClick={() => {
                  setBulkDeleteAcknowledged(false);
                  setIsBulkDeleteConfirmOpen(true);
                }}
                className="grid size-12 place-items-center rounded-xl border border-red-200 bg-white text-red-700 shadow-sm transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 aria-hidden="true" className="size-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {isAddProgramOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/55 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeAddProgramDialog();
          }}
        >
          <section
            aria-labelledby="create-program-title"
            aria-modal="true"
            className="w-full max-w-lg rounded-2xl border border-grey-mid bg-gallifrey p-6 shadow-2xl sm:p-8"
            role="dialog"
          >
            <div className="mb-7 flex items-center justify-between">
              <h2
                id="create-program-title"
                className="text-xl font-medium underline decoration-black/30 underline-offset-8"
              >
                {editingProgramIndex === null ? "Create New Program" : "Edit Program"}
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={closeAddProgramDialog}
                className="grid size-9 place-items-center rounded-lg text-grey-ink hover:bg-grey-light focus-visible:outline-2 focus-visible:outline-grass-mid"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>

            <form onSubmit={addProgram} className="space-y-6">
              <div>
                <label htmlFor="program-name" className="mb-2 block text-base font-medium">
                  Program Name
                </label>
                <div className="relative">
                  <input
                    id="program-name"
                    type="text"
                    maxLength={100}
                    required
                    value={programName}
                    onChange={(event) => setProgramName(event.target.value)}
                    placeholder="Please enter the program name here"
                    className="min-h-16 w-full rounded-xl border border-grey-mid bg-gallifrey px-4 pb-5 pt-3 text-sm text-body shadow-sm placeholder:text-grey-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-grass-mid"
                  />
                  <span className="pointer-events-none absolute right-3 bottom-2 text-xs text-grey-ink">
                    {programName.length}/100
                  </span>
                </div>
              </div>

              <div ref={managerMenuRef} className="relative">
                <label id="program-manager-label" className="mb-2 block text-base font-medium">
                  Program Manager
                </label>
                <button
                  type="button"
                  aria-labelledby="program-manager-label"
                  aria-controls="program-manager-options"
                  aria-expanded={isManagerMenuOpen}
                  onClick={() => setIsManagerMenuOpen((isOpen) => !isOpen)}
                  className="inline-flex min-h-11 items-center gap-3 rounded-xl border border-grey-mid bg-gallifrey px-3.5 text-sm font-semibold text-body shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-grass-mid"
                >
                  {selectedManagers.length > 0 ? selectedManagers.join(", ") : "SELECT MANAGER"}
                  <ChevronDown aria-hidden="true" className="size-5 text-grey-ink" />
                </button>
                {isManagerMenuOpen && (
                  <ul
                    id="program-manager-options"
                    aria-labelledby="program-manager-label"
                    className="mt-1 max-h-48 w-72 overflow-y-auto rounded-xl border border-grey-mid bg-gallifrey p-1.5 shadow-lg"
                    role="group"
                  >
                    {availableManagers.map((manager) => (
                      <li key={manager}>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={selectedManagers.includes(manager)}
                          onClick={() =>
                            setSelectedManagers((currentManagers) =>
                              currentManagers.includes(manager)
                                ? currentManagers.filter((item) => item !== manager)
                                : [...currentManagers, manager],
                            )
                          }
                          className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left hover:bg-grey-light focus-visible:outline-2 focus-visible:outline-grass-mid"
                        >
                          <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded border border-slate-300">
                            {selectedManagers.includes(manager) && (
                              <Check aria-hidden="true" className="size-3.5 text-grass" />
                            )}
                          </span>
                          <span className="block text-sm font-medium text-body">{manager}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div
                className={
                  editingProgramIndex === null ? "" : "flex items-center justify-between gap-4"
                }
              >
                <button
                  type="submit"
                  disabled={
                    !programName.trim() ||
                    selectedManagers.length === 0 ||
                    (editingProgramIndex !== null && !hasProgramChanges)
                  }
                  className="min-h-11 rounded-lg bg-grass px-5 py-3 text-sm font-semibold text-gallifrey transition hover:bg-grass-dark disabled:cursor-not-allowed disabled:bg-grey-mid disabled:text-body disabled:opacity-100 disabled:hover:bg-grey-mid"
                >
                  {editingProgramIndex === null ? "ADD PROGRAM" : "SAVE CHANGES"}
                </button>
                {editingProgramIndex !== null && (
                  <div className="flex flex-col items-end gap-1">
                    <button
                      type="button"
                      onClick={openDeleteConfirmation}
                      disabled={editedProgram?.hasProjects}
                      className="min-h-11 rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 disabled:hover:bg-slate-300"
                    >
                      DELETE
                    </button>
                    {editedProgram?.hasProjects && (
                      <span className="text-right text-xs text-slate-600">
                        Can&apos;t delete a program with projects.
                      </span>
                    )}
                  </div>
                )}
              </div>
            </form>
          </section>
        </div>
      )}

      {isDeleteConfirmOpen && editedProgram && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/70 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDeleteConfirmation();
          }}
        >
          <section
            aria-labelledby="delete-program-title"
            aria-modal="true"
            className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-9"
            role="alertdialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-red-50 text-red-600">
                  <AlertTriangle aria-hidden="true" className="size-6" />
                </span>
                <h2
                  id="delete-program-title"
                  className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
                >
                  Deleting program
                </h2>
              </div>
              <button
                type="button"
                aria-label="Return to edit program"
                onClick={closeDeleteConfirmation}
                className="grid size-9 shrink-0 place-items-center rounded-lg text-grey-ink transition hover:bg-grey-light hover:text-body focus-visible:outline-2 focus-visible:outline-grass-mid"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>

            <p className="mt-8 text-lg leading-relaxed text-slate-800 sm:text-xl">
              Are you sure you would like to delete{" "}
              <span className="font-semibold">{editedProgram.name}</span>?
            </p>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-red-100 bg-red-50/70 p-4 text-sm leading-6 text-slate-800 sm:text-base">
              <input
                type="checkbox"
                checked={deleteAcknowledged}
                onChange={(event) => setDeleteAcknowledged(event.target.checked)}
                className="mt-1 size-5 shrink-0 accent-red-600"
              />
              <span>
                I understand that this program and its associated data will be cleared from the
                system.
              </span>
            </label>

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteConfirmation}
                className="min-h-11 rounded-xl border border-grey-mid bg-gallifrey px-5 py-3 text-sm font-semibold text-body transition hover:bg-grey-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-grass-mid"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={deleteProgram}
                disabled={!deleteAcknowledged}
                className="min-h-11 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300 disabled:hover:bg-red-300"
              >
                DELETE PROGRAM
              </button>
            </div>
          </section>
        </div>
      )}

      {isBulkDeleteConfirmOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/70 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsBulkDeleteConfirmOpen(false);
              setBulkDeleteAcknowledged(false);
            }
          }}
        >
          <section
            aria-labelledby="delete-pending-programs-title"
            aria-describedby="delete-pending-programs-description"
            aria-modal="true"
            className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-9"
            role="alertdialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-red-50 text-red-600">
                  <AlertTriangle aria-hidden="true" className="size-6" />
                </span>
                <h2
                  id="delete-pending-programs-title"
                  className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
                >
                  Deleting programs
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => {
                  setIsBulkDeleteConfirmOpen(false);
                  setBulkDeleteAcknowledged(false);
                }}
                className="grid size-9 shrink-0 place-items-center rounded-lg text-grey-ink transition hover:bg-grey-light hover:text-body focus-visible:outline-2 focus-visible:outline-grass-mid"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>

            <p
              id="delete-pending-programs-description"
              className="mt-8 text-lg leading-relaxed text-slate-800 sm:text-xl"
            >
              Are you sure you would like to delete{" "}
              <span className="font-semibold">
                {removableSelectedPendingProgramIndices.length} selected{" "}
                {removableSelectedPendingProgramIndices.length === 1 ? "program" : "programs"}
              </span>
              ?
            </p>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-red-100 bg-red-50/70 p-4 text-sm leading-6 text-slate-800 sm:text-base">
              <input
                type="checkbox"
                checked={bulkDeleteAcknowledged}
                onChange={(event) => setBulkDeleteAcknowledged(event.target.checked)}
                className="mt-1 size-5 shrink-0 accent-red-600"
              />
              <span>
                I understand that these programs and their associated data will be cleared from the
                system.
              </span>
            </label>

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsBulkDeleteConfirmOpen(false);
                  setBulkDeleteAcknowledged(false);
                }}
                className="min-h-11 rounded-xl border border-grey-mid bg-gallifrey px-5 py-3 text-sm font-semibold text-body transition hover:bg-grey-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-grass-mid"
              >
                CANCEL
              </button>
              <button
                type="button"
                disabled={!bulkDeleteAcknowledged}
                onClick={deleteSelectedPendingPrograms}
                className="min-h-11 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 disabled:hover:bg-slate-300"
              >
                DELETE
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
