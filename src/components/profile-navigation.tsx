"use client";

import { Settings } from "lucide-react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export function ProfileNavigation() {
  const { data } = authClient.useSession();

  return (
    <div className="flex items-center gap-2">
      <span className="font-medium">{data?.user.name ?? "Account"}</span>
      <Link
        href="/protected/profile"
        aria-label="Profile settings"
        title="Profile settings"
        className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Settings aria-hidden="true" className="size-4" />
      </Link>
    </div>
  );
}
