import { useState } from "react";

const kicker = "mb-1.75 text-[10px] font-bold tracking-[0.16em] text-[#c9f17a] uppercase";
const muted = "text-[#96958f]";
const fieldControl =
  "w-full text-sm leading-normal text-[#f4f1ea] outline-none transition-colors duration-180 placeholder:text-[#777771]";
const cellControl = `${fieldControl} min-h-13.75 px-3.5 py-2.75 focus:bg-[#181817]`;
const cell = "border-r border-b border-[#373734] last:border-r-0";
const formSection = "mt-10.5 max-sm:mt-8.5";
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

export function InfrastructureForm() {
  const [people, setPeople] = useState(() => threeOf(newPerson));
  const [costs, setCosts] = useState(() => threeOf(newCost));
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    setSubmitting(true);
    // Only the textareas have a name, so FormData holds just the text fields.
    const payload = {
      ...Object.fromEntries(new FormData(form)),
      people: trimRows(people),
      costs: trimRows(costs),
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
    setSubmitted(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (submitted) {
    return (
      <section className="max-w-150 animate-in pt-25 pb-35 duration-500 fade-in slide-in-from-bottom-[18px] max-sm:pt-18">
        <div
          className="mb-9 grid size-16 place-items-center rounded-full border border-[#c9f17a] text-[30px] text-[#c9f17a]"
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
          className="mt-9.5 cursor-pointer border-b border-[#c9f17a] pb-1 text-xs leading-[normal] font-semibold text-[#c9f17a]"
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
        <TextField key={field.name} {...field} required />
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

      <TextField
        name="additionalInfo"
        label="Additional information"
        rows={2}
        placeholder="If any."
      />

      <div className="mt-16.75 flex items-center justify-between gap-5 border-t border-[#373734] pt-6.25 max-sm:flex-col-reverse max-sm:items-stretch">
        <p className={`text-[11px] max-sm:text-right ${muted}`}>
          <span className="text-[20px] text-[#c9f17a]">*</span> Required fields
        </p>
        <button
          className="flex min-w-47.5 cursor-pointer items-center justify-between gap-11.25 rounded-[3px] border border-[#c9f17a] bg-[#c9f17a] py-3.75 pr-4.25 pl-5 text-[13px] leading-[normal] font-bold text-[#080808] transition-[translate,background-color] duration-180 enabled:hover:-translate-y-0.5 enabled:hover:bg-[#e0ffab] disabled:cursor-wait disabled:opacity-65 max-sm:w-full"
          type="submit"
          disabled={submitting}
        >
          <span>{submitting ? "Submitting..." : "Submit request"}</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
      <p className="mt-4.25 min-h-5 text-right text-xs text-[#ff9d8d]" role="alert">
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
}: {
  name: string;
  label: string;
  rows: number;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <section className={formSection}>
      <label className="mb-3.25 block text-lg font-semibold tracking-[-0.025em]" htmlFor={name}>
        {label}
        {required && (
          <>
            {" "}
            <span className="text-[#c9f17a]" aria-hidden="true">
              *
            </span>
          </>
        )}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        placeholder={placeholder}
        required={required}
        className={`${fieldControl} block min-h-22 resize-y rounded-[4px] border border-[#373734] bg-[#121211]/74 px-4.5 py-4.25 focus:border-[#c9f17a] focus:bg-[#151513]`}
      />
    </section>
  );
}

function SectionHeading({ number, title, note }: { number: string; title: string; note: string }) {
  return (
    <div className="mb-4.75 flex items-end justify-between gap-6 max-sm:block">
      <div className="flex items-baseline gap-3.25">
        <span className="text-[11px] font-bold tracking-[0.1em] text-[#c9f17a]">{number}</span>
        <h2 className="text-[25px] leading-[1.08] font-bold tracking-[-0.045em]">{title}</h2>
        <p className={`text-[11px] ${muted}`}>
          <span className="text-[20px] text-[#c9f17a]">*</span>
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
    <div className="overflow-x-auto border-y border-[#373734]">
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
      className={`grid min-h-13.75 w-full cursor-pointer place-items-center text-lg hover:text-[#ff9d8d] ${muted}`}
      type="button"
      aria-label={label}
      onClick={onClick}
    >
      ×
    </button>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      className="mt-3.25 cursor-pointer text-xs leading-[normal] font-semibold text-[#c9f17a] hover:underline"
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
