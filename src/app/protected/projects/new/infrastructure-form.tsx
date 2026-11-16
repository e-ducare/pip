"use client";

import { cn } from "cn";
import { useEffect, useRef, useState } from "react";

const kicker = "mb-1.75 text-[10px] font-bold tracking-[0.16em] text-grass uppercase";
const muted = "text-grey-ink";
const fieldControl =
  "w-full text-sm leading-normal text-body outline-none transition-colors duration-180 placeholder:text-grey-ink";
const cellControl = `${fieldControl} min-h-13.75 bg-gallifrey px-3.5 py-2.75 focus:bg-grey-light`;
const cell = "border-r border-b border-grey-mid last:border-r-0";
const formSection = "mt-10.5 max-sm:mt-8.5 w-full";
const tableSection = "mt-16 max-sm:mt-8.5";

const textFields = [
  {
    name: "situation",
    label: "The situation",
    rows: 2,
    placeholder: "Explain the situation requiring funds. Few lines is enough",
  },
  {
    name: "risk",
    label: "The risk",
    rows: 2,
    placeholder:
      "Explain the risk if we don't do this project. Gravity of the situation, major problem faced that needs to be addressed. Few lines is enough",
  },
  {
    name: "goal",
    label: "The goal",
    rows: 2,
    placeholder:
      "Explain what we aim to achieve with this project. This will clarify what we are trying to change and why. Few lines is enough",
  },
  {
    name: "mission",
    label: "E-ducare's mission adherence",
    rows: 4,
    placeholder:
      "Explain how this project is aligned with e-ducare's mission (vulnerable children's education). Consider that educare wants to provide a holistic approach, therefore children well-being (such as, providing clean water access, health, proper meals, clothing, etc.) is part of our mission",
  },
  {
    name: "change",
    label: "What are we changing",
    rows: 2,
    placeholder: "Explain what impact will create this project. Few lines is enough",
  },
  {
    name: "sustainability",
    label: "Sustainability / compliance",
    rows: 4,
    placeholder:
      "Explain how this project will be sustainable in the medium/long term. And how do we guarantee compliance with e-ducare mission, national policies and rules. Few lines is enough.",
  },
];

type Person = { id: string; name: string; info: string; familyMembers: string; age: string };
type Cost = { id: string; description: string; amount: string; category: string };

const newPerson = (): Person => ({
  id: crypto.randomUUID(),
  name: "",
  info: "",
  familyMembers: "",
  age: "",
});
const newCost = (): Cost => ({
  id: crypto.randomUUID(),
  description: "",
  amount: "",
  category: "NRC",
});
const threeOf = <T,>(create: () => T) => [create(), create(), create()];

function updateRow<T extends { id: string }>(rows: T[], id: string, patch: Partial<T>) {
  return rows.map((row) => (row.id === id ? { ...row, ...patch } : row));
}

function removeRow<T extends { id: string }>(rows: T[], id: string) {
  return rows.length > 1 ? rows.filter((row) => row.id !== id) : rows;
}

function trimRows<T extends { id: string }>(rows: T[]) {
  return rows.map(({ id: _id, ...row }) =>
    Object.fromEntries(Object.entries(row).map(([key, value]) => [key, String(value).trim()])),
  );
}

export type Role = "applicant" | "reviewer";
type Review = "approved" | "rejected";

export function InfrastructureForm({ role, isReviewing }: { role?: Role; isReviewing: boolean }) {
  const [people, setPeople] = useState(() => threeOf(newPerson));
  const [costs, setCosts] = useState(() => threeOf(newCost));
  const [reviews, setReviews] = useState<Record<string, Review>>({});
  const [fundsNeededBy, setFundsNeededBy] = useState("");
  const [dateError, setDateError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  let mode = "newForm";

  if (role == "applicant" && isReviewing) {
    mode = "re-submitting";
  }
  if (role == "reviewer" && isReviewing) {
    mode = "feedback";
  }

  let submitBtnText = "Submit request";

  if (mode === "re-submitting") {
    submitBtnText = "Save review";
  }
  if (mode === "feedback") {
    submitBtnText = "Submit feedback";
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    if (role === "applicant" && !fundsNeededBy) {
      const message = "Select the date by which the funds are needed.";
      setDateError(message);
      setError(message);
      document.getElementById("fundsNeededBy")?.focus();
      return;
    }
    setDateError("");
    if (role === "reviewer" && textFields.some((field) => !reviews[field.name])) {
      setError("Approve or reject every field before submitting.");
      return;
    }

    setSubmitting(true);
    // Only the textareas have a name, so FormData holds just the text fields.
    // Disabled textareas are left out, so a reviewer sends only their feedback.
    const payload = {
      ...Object.fromEntries(new FormData(form)),
      people: trimRows(people),
      costs: trimRows(costs),
      ...(role === "reviewer" && { reviews }),
    };

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Submission failed");
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("We could not save your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function startNewRequest() {
    setPeople(threeOf(newPerson));
    setCosts(threeOf(newCost));
    setReviews({});
    setFundsNeededBy("");
    setDateError("");
    setSubmitted(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (submitted) {
    return (
      <section className="max-w-150 animate-in pt-25 pb-35 duration-500 fade-in slide-in-from-bottom-[18px] max-sm:pt-18">
        <div
          className="mb-9 grid size-16 place-items-center rounded-full border border-grass text-[30px] text-grass"
          aria-hidden="true"
        >
          ✓
        </div>
        <p className={kicker}>Request received</p>
        <h2 className="mb-4.5 text-[clamp(40px,7vw,72px)] leading-[1.08] font-bold tracking-[-0.045em]">
          Your form was submitted.
        </h2>
        <p className={`max-w-97.5 leading-[1.6] ${muted}`}>
          Thank you for sharing the details of your project. Your request has been recorded and is
          ready for review.
        </p>
        <button
          className="mt-9.5 cursor-pointer border-b border-grass pb-1 text-xs leading-[normal] font-semibold text-grass"
          type="button"
          onClick={startNewRequest}
        >
          Submit another request <span aria-hidden="true">↗</span>
        </button>
      </section>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <section className="mb-17.5 max-w-155 max-sm:mb-13">
        <p className={kicker}>Tell us what is needed</p>
        <h2 className="max-w-145 text-[clamp(36px,6vw,62px)] leading-[1.08] font-bold tracking-[-0.045em]">
          Help us understand the project.
        </h2>
        <p className={`mt-4.5 max-w-110 text-base leading-[1.6] ${muted}`}>
          A clear, honest overview helps us direct support where it can have the greatest effect.
        </p>
      </section>

      {textFields.map((field) => (
        <div key={field.name} className="flex flex-row items-end gap-4">
          <TextField {...field} required={role === "applicant"} disabled={role === "reviewer"} />
          {role === "reviewer" && (
            <>
              <div className="flex shrink-0 flex-col gap-2">
                <ReviewButton
                  active={reviews[field.name] === "approved"}
                  onClick={() =>
                    setReviews((current) => ({ ...current, [field.name]: "approved" }))
                  }
                >
                  ✓ Approve
                </ReviewButton>
                <ReviewButton
                  active={reviews[field.name] === "rejected"}
                  tone="reject"
                  onClick={() =>
                    setReviews((current) => ({ ...current, [field.name]: "rejected" }))
                  }
                >
                  × Reject
                </ReviewButton>
              </div>
              {reviews[field.name] === "rejected" && (
                <textarea
                  name={`${field.name}_reviewer`}
                  aria-label={`Review feedback for ${field.label}`}
                  placeholder="Explain what needs to change"
                  rows={field.rows}
                  required
                  className={cn(
                    fieldControl,
                    "block min-h-22 w-1/2 resize-y rounded-lg border border-red-300 bg-gallifrey px-4.5 py-4.25 focus:border-red-400 focus:bg-grey-light",
                  )}
                />
              )}
            </>
          )}
        </div>
      ))}

      <section className={tableSection}>
        <SectionHeading
          number="01"
          title="Beneficiaries"
          note="List the people or households this project will support."
        />
        <Table
          headers={[
            ["Name", "w-[29%]"],
            ["Additional info", "w-[36%]"],
            [
              <>
                N. family
                <br />
                members
              </>,
              "w-[17%]",
            ],
            ["Age", "w-[12%]"],
            ["Delete row", "w-22"],
          ]}
        >
          {people.map((person) => {
            const update = (patch: Partial<Person>) =>
              setPeople((rows) => updateRow(rows, person.id, patch));
            return (
              <tr key={person.id}>
                <td className={cell}>
                  <input
                    className={cellControl}
                    placeholder="Name"
                    value={person.name}
                    onChange={(event) => update({ name: event.target.value })}
                  />
                </td>
                <td className={cell}>
                  <input
                    className={cellControl}
                    placeholder="Additional info"
                    value={person.info}
                    onChange={(event) => update({ info: event.target.value })}
                  />
                </td>
                <td className={cell}>
                  <input
                    className={cellControl}
                    type="number"
                    min="1"
                    placeholder="0"
                    value={person.familyMembers}
                    onChange={(event) => update({ familyMembers: event.target.value })}
                  />
                </td>
                <td className={cell}>
                  <input
                    className={cellControl}
                    type="number"
                    min="0"
                    max="117"
                    placeholder="Age"
                    value={person.age}
                    onChange={(event) => update({ age: event.target.value })}
                  />
                </td>
                <td className={cell}>
                  <RemoveButton
                    label="Remove person"
                    onClick={() => setPeople((rows) => removeRow(rows, person.id))}
                  />
                </td>
              </tr>
            );
          })}
        </Table>
        <AddButton onClick={() => setPeople((rows) => [...rows, newPerson()])}>
          ＋ Add person
        </AddButton>
      </section>

      <section className={tableSection}>
        <SectionHeading
          number="02"
          title="Summary of projected costs"
          note="Show how the requested funds would be used."
        />
        <p className={`mb-4 text-xs leading-[1.6] ${muted}`}>
          NRC - Non recurring costs is a fixed one-time payment that does not repeat
          <br />
          RC - recurring costs that repeat every set interval (eg: yearly)
        </p>
        <Table
          headers={[
            ["Description of items required", "w-[29%]"],
            [
              <>
                Amount
                <br />
                local currency
              </>,
              "w-[36%]",
            ],
            ["NRC / RC", "w-[17%]"],
            ["Delete row", "w-[12%]"],
          ]}
        >
          {costs.map((cost) => {
            const update = (patch: Partial<Cost>) =>
              setCosts((rows) => updateRow(rows, cost.id, patch));
            return (
              <tr key={cost.id}>
                <td className={cell}>
                  <input
                    className={cellControl}
                    placeholder="Item description"
                    value={cost.description}
                    onChange={(event) => update({ description: event.target.value })}
                  />
                </td>
                <td className={cell}>
                  <input
                    className={cellControl}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="$ 0.00"
                    value={cost.amount}
                    onChange={(event) => update({ amount: event.target.value })}
                  />
                </td>
                <td className={cell}>
                  <select
                    className={`${cellControl} cursor-pointer`}
                    aria-label="NRC or RC"
                    value={cost.category}
                    onChange={(event) => update({ category: event.target.value })}
                  >
                    <option value="">Select</option>
                    <option value="NRC">NRC</option>
                    <option value="RC">RC</option>
                  </select>
                </td>
                <td className={cell}>
                  <RemoveButton
                    label="Remove cost item"
                    onClick={() => setCosts((rows) => removeRow(rows, cost.id))}
                  />
                </td>
              </tr>
            );
          })}
        </Table>
        <AddButton onClick={() => setCosts((rows) => [...rows, newCost()])}>
          ＋ Add cost item
        </AddButton>
      </section>

      <DateField
        name="fundsNeededBy"
        label="Funds needed by"
        value={fundsNeededBy}
        onChange={(value) => {
          setFundsNeededBy(value);
          if (value) {
            setDateError("");
            setError("");
          }
        }}
        error={dateError}
        required={role === "applicant"}
        disabled={role === "reviewer"}
      />

      <TextField
        name="additionalInfo"
        label="Additional information"
        rows={2}
        placeholder="If any."
        disabled={role === "reviewer"}
      />

      <div className="mt-16.75 flex items-center justify-between gap-5 border-t border-grey-mid pt-6.25 max-sm:flex-col-reverse max-sm:items-stretch">
        <p className={`text-[11px] max-sm:text-right ${muted}`}>
          <span className="text-[20px] text-grass">*</span> Required fields
        </p>
        <button
          className="flex min-w-47.5 cursor-pointer items-center justify-between gap-11.25 rounded-[3px] border border-grass bg-grass py-3.75 pr-4.25 pl-5 text-[13px] leading-[normal] font-bold text-gallifrey transition-[translate,background-color] duration-180 enabled:hover:-translate-y-0.5 enabled:hover:bg-grass-mid disabled:cursor-wait disabled:opacity-65 max-sm:w-full"
          type="submit"
          disabled={submitting}
        >
          <span>{submitBtnText}</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
      <p className="mt-4.25 min-h-5 text-right text-xs text-red-600" role="alert">
        {error}
      </p>
    </form>
  );
}

function TextField({
  name,
  label,
  rows,
  placeholder,
  required = false,
  ...rest
}: {
  name: string;
  label: string;
  rows: number;
  placeholder: string;
  required?: boolean;
} & Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "name" | "id" | "rows" | "placeholder" | "required" | "className"
>) {
  return (
    <section className={formSection}>
      <label className="mb-3.25 block text-lg font-semibold tracking-tight" htmlFor={name}>
        {label}
        {required && (
          <>
            {" "}
            <span className="text-grass" aria-hidden="true">
              *
            </span>
          </>
        )}
      </label>
      <textarea
        {...rest}
        id={name}
        name={name}
        rows={rows}
        placeholder={placeholder}
        required={required}
        className={`${fieldControl} block min-h-22 resize-y rounded-lg border border-grey-mid bg-gallifrey px-4.5 py-4.25 focus:border-grass focus:bg-grey-light`}
      />
    </section>
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const longDateFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const shortDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function formatDisplayDate(value: string) {
  const date = parseDate(value);
  return date ? shortDateFormatter.format(date) : "";
}

function DateField({
  name,
  label,
  value,
  onChange,
  error = "",
  required = false,
  disabled = false,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => startOfMonth(parseDate(value) ?? new Date()));
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const selectedDate = parseDate(value);
  const todayValue = toISODate(new Date());
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const leadingDays = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(year, month, index - leadingDays + 1);
    return {
      date,
      value: toISODate(date),
      outside: index < leadingDays || index >= leadingDays + daysInMonth,
    };
  });
  const currentYear = new Date().getFullYear();
  const firstYear = Math.min(currentYear - 5, year);
  const lastYear = Math.max(currentYear + 20, year);
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, index) => firstYear + index);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function toggleCalendar() {
    if (!open) setViewDate(startOfMonth(selectedDate ?? new Date()));
    setOpen((current) => !current);
  }

  function changeMonth(offset: number) {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function showCurrentMonth() {
    setViewDate(startOfMonth(new Date()));
  }

  function selectDate(date: Date) {
    onChange(toISODate(date));
    setViewDate(startOfMonth(date));
    setOpen(false);
    buttonRef.current?.focus();
  }

  return (
    <section className={formSection}>
      <p id={`${name}-label`} className="mb-3.25 block text-lg font-semibold tracking-tight">
        {label}
        {required && (
          <>
            {" "}
            <span className="text-grass" aria-hidden="true">
              *
            </span>
          </>
        )}
      </p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div ref={containerRef} className="relative">
          <button
            ref={buttonRef}
            id={name}
            type="button"
            className={cn(
              "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-grey-mid bg-gallifrey px-4 text-[13px] leading-[normal] font-semibold text-body transition-colors duration-180 hover:border-grass hover:bg-cucumber focus-visible:border-grass focus-visible:ring-3 focus-visible:ring-grass/20 focus-visible:outline-none aria-expanded:border-grass aria-expanded:bg-cucumber disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-red-400 focus-visible:border-red-400 focus-visible:ring-red-400/20",
            )}
            aria-describedby={error ? `${name}-label ${name}-error` : `${name}-label`}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls={open ? `${name}-calendar` : undefined}
            aria-invalid={Boolean(error)}
            aria-required={required}
            disabled={disabled}
            onClick={toggleCalendar}
          >
            <svg
              className="size-4 text-grass"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M16 3v4M8 3v4M3 10h18" />
            </svg>
            <span>Select Date</span>
          </button>

          {open && (
            <div
              id={`${name}-calendar`}
              role="dialog"
              aria-label={`Choose a date for ${label}`}
              className="absolute top-[calc(100%+0.5rem)] left-0 z-30 w-72 origin-top-left animate-in rounded-lg border border-grey-mid bg-gallifrey p-3.5 shadow-[0_18px_45px_rgb(28_53_87_/_14%)] duration-150 fade-in-0 zoom-in-95"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <select
                    aria-label="Month"
                    value={month}
                    className="cursor-pointer rounded-md bg-transparent py-1 text-sm font-bold text-body outline-none transition-colors duration-150 hover:text-grass focus-visible:bg-cucumber"
                    onChange={(event) => setViewDate(new Date(year, Number(event.target.value), 1))}
                  >
                    {MONTHS.map((monthName, index) => (
                      <option key={monthName} value={index}>
                        {monthName}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Year"
                    value={year}
                    className="cursor-pointer rounded-md bg-transparent py-1 text-sm font-bold text-body outline-none transition-colors duration-150 hover:text-grass focus-visible:bg-cucumber"
                    onChange={(event) =>
                      setViewDate(new Date(Number(event.target.value), month, 1))
                    }
                  >
                    {years.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    className="cursor-pointer rounded-md px-1.5 py-1 text-[11px] font-semibold text-grey-ink transition-colors duration-150 hover:bg-cucumber hover:text-body focus-visible:bg-cucumber"
                    aria-label="Go to the current month"
                    onClick={showCurrentMonth}
                  >
                    Now
                  </button>
                  <button
                    type="button"
                    className="grid size-7 cursor-pointer place-items-center rounded-md text-grey-ink transition-colors duration-150 hover:bg-cucumber hover:text-body focus-visible:bg-cucumber"
                    aria-label="Previous month"
                    onClick={() => changeMonth(-1)}
                  >
                    <svg
                      className="size-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="grid size-7 cursor-pointer place-items-center rounded-md text-grey-ink transition-colors duration-150 hover:bg-cucumber hover:text-body focus-visible:bg-cucumber"
                    aria-label="Next month"
                    onClick={() => changeMonth(1)}
                  >
                    <svg
                      className="size-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map((weekday) => (
                  <span
                    key={weekday}
                    className="grid h-7 place-items-center text-[10px] font-semibold tracking-[0.08em] text-grey-ink"
                  >
                    {weekday}
                  </span>
                ))}
                {days.map((day) => {
                  const isSelected = day.value === value;
                  const isToday = day.value === todayValue;
                  return (
                    <button
                      key={day.value}
                      type="button"
                      className={cn(
                        "grid size-8 place-items-center rounded-md text-xs transition-colors duration-150 outline-none",
                        day.outside ? "text-grey-ink/50" : "text-body",
                        isSelected
                          ? "bg-grass font-semibold text-gallifrey hover:bg-grass-mid"
                          : isToday
                            ? "border border-grass font-semibold text-grass hover:bg-cucumber"
                            : "hover:bg-cucumber focus-visible:bg-cucumber",
                      )}
                      aria-label={longDateFormatter.format(day.date)}
                      aria-pressed={isSelected}
                      aria-current={isToday ? "date" : undefined}
                      onClick={() => selectDate(day.date)}
                    >
                      {day.date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <p aria-live="polite" className="min-h-5 text-sm text-body">
          {value ? formatDisplayDate(value) : ""}
        </p>

        {value && !disabled && (
          <button
            type="button"
            className="cursor-pointer border-b border-grey-mid text-[11px] font-semibold text-grey-ink transition-colors duration-180 hover:border-body hover:text-body"
            onClick={() => onChange("")}
          >
            Clear
          </button>
        )}
      </div>
      {error && (
        <p id={`${name}-error`} className="mt-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
      <input type="hidden" name={name} value={value} disabled={disabled} />
    </section>
  );
}

function SectionHeading({ number, title, note }: { number: string; title: string; note: string }) {
  return (
    <div className="mb-4.75 flex items-end justify-between gap-6 max-sm:block">
      <div className="flex items-baseline gap-3.25">
        <span className="text-[11px] font-bold tracking-widest text-grass">{number}</span>
        <h2 className="text-[25px] leading-[1.08] font-bold tracking-[-0.045em]">{title}</h2>
        <p className={`text-[11px] ${muted}`}>
          <span className="text-[20px] text-grass">*</span>
        </p>
      </div>
      <p
        className={`max-w-67.5 text-right text-xs leading-[1.6] max-sm:mt-2.75 max-sm:text-left ${muted}`}
      >
        {note}
      </p>
    </div>
  );
}

function Table({
  headers,
  children,
}: {
  headers: [React.ReactNode, string][];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto border-y border-grey-mid">
      <table className="w-full min-w-155 table-fixed border-collapse">
        <thead>
          <tr>
            {headers.map(([header, width], index) => (
              <th
                key={index}
                className={`${cell} ${width} h-14 px-3.5 py-2.5 text-left text-[11px] leading-[1.25] font-medium tracking-[0.08em] uppercase ${muted}`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr:last-child>td]:border-b-0">{children}</tbody>
      </table>
    </div>
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      className={`grid min-h-13.75 w-full cursor-pointer place-items-center text-lg text-red-500 hover:text-red-700`}
      type="button"
      aria-label={label}
      onClick={onClick}
    >
      ×
    </button>
  );
}

function ReviewButton({
  active,
  tone = "approve",
  onClick,
  children,
}: {
  active: boolean;
  tone?: "approve" | "reject";
  onClick: () => void;
  children: React.ReactNode;
}) {
  const color =
    tone === "approve"
      ? "aria-pressed:border-grass aria-pressed:bg-grass aria-pressed:text-gallifrey hover:border-grass"
      : "aria-pressed:border-red-400 aria-pressed:bg-red-400 aria-pressed:text-body hover:border-red-400";
  return (
    <button
      className={cn(
        "min-w-24 cursor-pointer rounded-[3px] border border-grey-mid bg-gallifrey px-3 py-2 text-xs font-semibold text-body transition-colors duration-180",
        color,
      )}
      type="button"
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      className="mt-3.25 cursor-pointer text-xs leading-[normal] font-semibold text-grass hover:underline"
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
