import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, GraduationCap, UsersRound } from "lucide-react";

const adminSections = [
  {
    title: "Check Users",
    description: "Review and manage the people connected to this project.",
    href: "users",
    Icon: UsersRound,
  },
  {
    title: "Check Programs",
    description: "Browse and manage the programs submitted for review.",
    href: "programs",
    Icon: GraduationCap,
  },
];

export default async function AdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const adminPath = `/protected/projects/${encodeURIComponent(id)}/admin`;

  return (
    <main className="relative left-1/2 flex min-h-screen w-screen -translate-x-1/2 flex-col bg-[#fcfafa] px-5 py-5 text-[#171815] sm:px-8 sm:py-8">
      <section className="flex min-h-[min(72vh,680px)] flex-1 flex-col rounded-xl border border-[#171815]/15 px-6 py-7 sm:px-10 sm:py-9">
        <header className="flex items-center gap-3">
          <Image
            src="/images/educare-logo.png"
            alt="E-ducare"
            width={48}
            height={48}
            className="size-12 rounded-xl"
          />
          <div>
            <p className="text-sm font-semibold tracking-wide">E-ducare</p>
            <p className="text-xs text-[#171815]/55">Project administration</p>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center py-14">
          <div className="mb-10 text-center">
            <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-[#347c39] uppercase">
              Administration
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Admin Page
            </h1>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#171815]/65 sm:text-base">
              Choose an area to continue managing this project.
            </p>
          </div>

          <nav
            aria-label="Admin sections"
            className="grid gap-4 sm:grid-cols-2 sm:gap-6"
          >
            {adminSections.map(({ title, description, href, Icon }, index) => (
              <Link
                key={href}
                href={`${adminPath}/${href}`}
                className="group flex min-h-52 flex-col rounded-xl border border-white/80 bg-white p-6 text-[#171815] shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#c9f17a] hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c9f17a]"
              >
                <div className="flex items-start justify-between">
                  <span className="grid size-12 place-items-center rounded-xl bg-[#eff8df] text-[#347c39]">
                    <Icon aria-hidden="true" className="size-6" />
                  </span>
                  <span className="text-xs font-medium tracking-widest text-black/35">
                    0{index + 1}
                  </span>
                </div>
                <div className="mt-auto flex items-end justify-between gap-4 pt-8">
                  <div>
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <p className="mt-1 text-sm leading-5 text-black/60">
                      {description}
                    </p>
                  </div>
                  <ArrowUpRight
                    aria-hidden="true"
                    className="mb-1 size-5 shrink-0 text-black/55 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </div>
              </Link>
            ))}
          </nav>
        </div>

        <p className="text-center text-xs text-[#171815]/45">
          E-ducare · Project admin
        </p>
      </section>
    </main>
  );
}
