import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export default async function ProtectedPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/auth/login");
  }

  return (
    <section className="flex w-full flex-col items-start gap-8">
      <h1 className="text-[clamp(32px,5vw,42px)] leading-[1.15] font-normal tracking-[-0.025em] text-black">
        Welcome {session.user.name || "there"}
      </h1>
      <div className="flex flex-col items-start gap-8">
        <p className="max-w-md text-xl leading-[1.25] text-black">
          You can begin by creating a new project.
        </p>
        <Link
          href="/protected/projects/new"
          className="inline-flex h-9 cursor-pointer items-center rounded-lg bg-primary px-3 text-lg leading-none font-normal text-primary-foreground transition-colors hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          New project
        </Link>
      </div>
    </section>
  );
}
