"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ChevronDown, PencilLine, Plus, X } from "lucide-react";

type Program = {
  name: string;
  manager: string;
  invitePending: boolean;
};

const initialPrograms: Program[] = [
  {
    name: "Tanzania : Canaan Children Home",
    manager: "mario@e-ducare.org",
    invitePending: false,
  },
  {
    name: "Tanzania : Children Home",
    manager: "luca@e-ducare.org",
    invitePending: true,
  },
  {
    name: "—",
    manager: "—",
    invitePending: false,
  },
];

const availableManagers = ["mario@e-ducare.org", "luca@e-ducare.org"];

export default function AdminProgramsPage() {
  const { id } = useParams<{ id: string }>();
  const adminPath = `/protected/projects/${encodeURIComponent(id)}/admin`;
  const [programs, setPrograms] = useState(initialPrograms);
  const [isAddProgramOpen, setIsAddProgramOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteAcknowledged, setDeleteAcknowledged] = useState(false);
  const [editingProgramIndex, setEditingProgramIndex] = useState<number | null>(
    null,
  );
  const [programName, setProgramName] = useState("");
  const [selectedManager, setSelectedManager] = useState("");
  const [isManagerMenuOpen, setIsManagerMenuOpen] = useState(false);
  const managerMenuRef = useRef<HTMLDivElement>(null);
  const editedProgram =
    editingProgramIndex === null ? null : programs[editingProgramIndex];
  const hasProgramChanges =
    editedProgram !== null &&
    editedProgram !== undefined &&
    (programName.trim() !== editedProgram.name ||
      selectedManager !== editedProgram.manager);

  useEffect(() => {
    if (!isAddProgramOpen) return;

    function handleOutsideClick(event: PointerEvent) {
      const target = event.target;
      if (
        target instanceof Node &&
        !managerMenuRef.current?.contains(target)
      ) {
        setIsManagerMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (isDeleteConfirmOpen) {
          setIsDeleteConfirmOpen(false);
          setDeleteAcknowledged(false);
        } else {
          setIsManagerMenuOpen(false);
        }
      }
    }

    document.addEventListener("pointerdown", handleOutsideClick, true);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick, true);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isAddProgramOpen, isDeleteConfirmOpen, isManagerMenuOpen]);

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
    if (editingProgramIndex === null || !deleteAcknowledged) return;

    setPrograms((currentPrograms) =>
      currentPrograms.filter((_, index) => index !== editingProgramIndex),
    );
    closeAddProgramDialog();
  }

  function openAddProgramDialog() {
    setEditingProgramIndex(null);
    setProgramName("");
    setSelectedManager("");
    setIsManagerMenuOpen(false);
    setIsAddProgramOpen(true);
  }

  function openEditProgramDialog(program: Program, index: number) {
    setEditingProgramIndex(index);
    setProgramName(program.name);
    setSelectedManager(program.manager);
    setIsManagerMenuOpen(false);
    setIsAddProgramOpen(true);
  }

  function addProgram(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = programName.trim();
    if (!name || !selectedManager) return;

    if (editingProgramIndex !== null) {
      setPrograms((currentPrograms) =>
        currentPrograms.map((program, index) =>
          index === editingProgramIndex
            ? { ...program, name, manager: selectedManager }
            : program,
        ),
      );
    } else {
      setPrograms((currentPrograms) => [
        ...currentPrograms.filter((program) => program.name !== "—"),
        { name, manager: selectedManager, invitePending: true },
      ]);
    }
    closeAddProgramDialog();
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
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Admin / Programs
          </h1>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[#171815]/10 bg-white shadow-sm">
          <table className="w-full min-w-[600px] border-collapse text-left">
            <thead className="bg-[#f8f9fa] text-sm font-semibold text-slate-700">
              <tr>
                <th scope="col" className="px-5 py-4 sm:px-6">
                  PROGRAM NAME
                </th>
                <th scope="col" className="px-5 py-4 sm:px-6">
                  PROGRAM MANAGER
                </th>
                <th scope="col" className="px-5 py-4 text-center sm:px-6">
                  EDIT PROGRAM
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {programs.map((program, index) => (
                <tr key={`${program.name}-${index}`}>
                  <td
                    className={`px-5 py-5 text-sm font-medium sm:px-6 ${program.name === "—" ? "text-slate-400" : ""}`}
                  >
                    {program.name}
                  </td>
                  <td className="px-5 py-3 sm:px-6">
                    {program.invitePending && (
                      <span className="mb-2 inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 before:size-1.5 before:rounded-full before:bg-red-500">
                        Invite pending
                      </span>
                    )}
                    <p
                      className={
                        program.manager === "—"
                          ? "text-slate-400"
                          : "text-sm font-medium"
                      }
                    >
                      {program.manager}
                    </p>
                  </td>
                  <td className="px-5 py-3 text-center sm:px-6">
                    {program.name === "—" ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <button
                        type="button"
                        aria-label={`Edit ${program.name}`}
                        onClick={() => openEditProgramDialog(program, index)}
                        className="inline-grid size-10 place-items-center rounded-lg text-slate-600 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#347c39]"
                      >
                        <PencilLine aria-hidden="true" className="size-6" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-7">
          <button
            type="button"
            onClick={openAddProgramDialog}
            className="inline-flex min-h-12 items-center gap-3 rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-[#171815] shadow-sm transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#347c39]"
          >
            <span className="grid size-5 place-items-center rounded-md bg-[#171815] text-white">
              <Plus aria-hidden="true" className="size-4" />
            </span>
            Add Program
          </button>
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
            className="w-full max-w-lg rounded-2xl border border-black/10 bg-white p-6 shadow-2xl sm:p-8"
            role="dialog"
          >
            <div className="mb-7 flex items-center justify-between">
              <h2
                id="create-program-title"
                className="text-xl font-medium underline decoration-black/30 underline-offset-8"
              >
                {editingProgramIndex === null
                  ? "Create New Program"
                  : "Edit Program"}
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={closeAddProgramDialog}
                className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-[#347c39]"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>

            <form onSubmit={addProgram} className="space-y-6">
              <div>
                <label
                  htmlFor="program-name"
                  className="mb-2 block text-base font-medium"
                >
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
                    className="min-h-16 w-full rounded-xl border border-slate-400 px-4 pb-5 pt-3 text-sm shadow-sm placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#347c39]"
                  />
                  <span className="pointer-events-none absolute right-3 bottom-2 text-xs text-slate-400">
                    {programName.length}/100
                  </span>
                </div>
              </div>

              <div ref={managerMenuRef} className="relative">
                <label
                  id="program-manager-label"
                  className="mb-2 block text-base font-medium"
                >
                  Program Manager
                </label>
                <button
                  type="button"
                  aria-labelledby="program-manager-label"
                  aria-haspopup="listbox"
                  aria-expanded={isManagerMenuOpen}
                  onClick={() => setIsManagerMenuOpen((isOpen) => !isOpen)}
                  className="inline-flex min-h-11 items-center gap-3 rounded-xl border border-slate-400 px-3.5 text-sm font-semibold shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#347c39]"
                >
                  {selectedManager || "SELECT MANAGER"}
                  <ChevronDown
                    aria-hidden="true"
                    className="size-5 text-slate-600"
                  />
                </button>
                {isManagerMenuOpen && (
                  <ul
                    aria-labelledby="program-manager-label"
                    className="absolute z-10 mt-1 max-h-48 w-full max-w-sm overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
                    role="listbox"
                  >
                    {availableManagers.map((manager) => (
                      <li
                        key={manager}
                        role="option"
                        aria-selected={selectedManager === manager}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedManager(manager);
                            setIsManagerMenuOpen(false);
                          }}
                          className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100"
                        >
                          {manager}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div
                className={
                  editingProgramIndex === null
                    ? ""
                    : "flex items-center justify-between gap-4"
                }
              >
                <button
                  type="submit"
                  disabled={
                    !programName.trim() ||
                    !selectedManager ||
                    (editingProgramIndex !== null && !hasProgramChanges)
                  }
                  className="min-h-11 rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:bg-[#595959] disabled:text-white disabled:opacity-100 disabled:hover:bg-[#595959]"
                >
                  {editingProgramIndex === null
                    ? "ADD PROGRAM"
                    : "SAVE CHANGES"}
                </button>
                {editingProgramIndex !== null && (
                  <button
                    type="button"
                    onClick={openDeleteConfirmation}
                    className="min-h-11 rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                  >
                    DELETE
                  </button>
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
                className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-[#347c39]"
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
                onChange={(event) =>
                  setDeleteAcknowledged(event.target.checked)
                }
                className="mt-1 size-5 shrink-0 accent-red-600"
              />
              <span>
                I understand that this program and its associated data will be
                cleared from the system.
              </span>
            </label>

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteConfirmation}
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#347c39]"
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
    </main>
  );
}
