"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { InfrastructureForm } from "./infrastructure-form";

export default function NewPage() {
  const router = useRouter();
  const [projectType, setProjectType] = useState("infrastructure");
  const [showInfrastructureForm, setShowInfrastructureForm] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    console.log({ projectType });

    if (projectType === "infrastructure") setShowInfrastructureForm(true);
    else router.push(`/protected/projects/new/${projectType}`);
  }

  return (
    <main>
      <div className="mb-17 flex items-center gap-3.75 max-sm:mb-12">
        <img
          src="/images/educare-logo.png"
          alt="E-ducare logo"
          className="size-11 rounded-full bg-[#c9f17a]"
        />
        <div>
          <p className="mb-1.75 text-[10px] font-bold tracking-[0.16em] text-[#c9f17a] uppercase">
            E-ducare / {showInfrastructureForm ? "infrastructure form" : "project type"}
          </p>
          <h1 className="text-[clamp(24px,4vw,34px)] leading-[normal] font-bold tracking-[-0.04em]">
            Project Funding
          </h1>
        </div>
      </div>
      {showInfrastructureForm ? (
        <InfrastructureForm />
      ) : (
        <section className="max-w-155 pb-15" aria-labelledby="project-type-title">
          <p className="mb-1.75 text-[10px] font-bold tracking-[0.16em] text-[#c9f17a] uppercase">
            Start your request
          </p>
          <h2
            id="project-type-title"
            className="max-w-140 text-[clamp(36px,6vw,62px)] leading-[1.08] font-bold tracking-[-0.045em]"
          >
            What type of project are you funding?
          </h2>
          <p className="mt-4.5 mb-9 max-w-110 text-base leading-[1.6] text-[#96958f]">
            Choose the option that best describes the support you need.
          </p>

          <form onSubmit={handleSubmit}>
            <fieldset className="grid gap-3.25">
              <legend className="sr-only">Project type</legend>
              <label
                className="group flex cursor-pointer items-start gap-4 rounded-lg border border-[#373734] bg-[#121211]/74 p-5 text-lg tracking-[-0.025em] transition-colors duration-180 has-checked:border-[#c9f17a] has-checked:bg-[#151513]"
                htmlFor="infrastructure"
              >
                <input
                  id="infrastructure"
                  type="radio"
                  name="projectType"
                  value="infrastructure"
                  onChange={(event) => setProjectType(event.target.value)}
                  className="mt-0.75 size-4.5 shrink-0 cursor-pointer accent-[#c9f17a]"
                />
                <span className="grid gap-1.5">
                  <span className="text-xl leading-[1.2] font-semibold">Infrastructure</span>
                  <span className="hidden text-[13px] leading-normal font-normal text-[#96958f] group-has-checked:block">
                    This project involves building or improving schools, colleges, and related
                    facilities.
                  </span>
                </span>
              </label>
              <label
                className="group flex cursor-pointer items-start gap-4 rounded-lg border border-[#373734] bg-[#121211]/74 p-5 text-lg tracking-[-0.025em] transition-colors duration-180 has-checked:border-[#c9f17a] has-checked:bg-[#151513]"
                htmlFor="sponsorship"
              >
                <input
                  id="sponsorship"
                  type="radio"
                  name="projectType"
                  value="sponsorship"
                  onChange={(event) => setProjectType(event.target.value)}
                  className="mt-0.75 size-4.5 shrink-0 cursor-pointer accent-[#c9f17a]"
                />
                <span className="grid gap-1.5">
                  <span className="text-xl leading-[1.2] font-semibold">Sponsorship</span>
                  <span className="hidden text-[13px] leading-normal font-normal text-[#96958f] group-has-checked:block">
                    This project provides sponsorship to support a child's education and well-being.
                  </span>
                </span>
              </label>
            </fieldset>
            <button
              className="mt-6.25 flex w-full cursor-pointer items-center justify-between rounded-[3px] border border-[#c9f17a] bg-[#c9f17a] py-3.75 pr-4.25 pl-5 text-[13px] leading-[normal] font-bold text-[#080808] transition-[translate,background-color] duration-180 enabled:hover:-translate-y-0.5 enabled:hover:bg-[#e0ffab] disabled:cursor-not-allowed disabled:opacity-45"
              type="submit"
              disabled={!projectType}
            >
              <span>Confirm</span>
              <span aria-hidden="true">→</span>
            </button>
          </form>
        </section>
      )}
    </main>
  );
}
