"use client";

import { useEffect, useState } from "react";
import { CalendarDays, ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAccountContext } from "./account-context-actions";
import type { AccountContext, AccountRoleId } from "./account-context";

const roleDetails: Record<
  AccountRoleId,
  { label: string; description: string }
> = {
  admin: {
    label: "Admin",
    description:
      "Manages users, programs, and project settings across PIP.",
  },
  board: {
    label: "Board",
    description:
      "Reviews project information and funding decisions across programs.",
  },
};

function formatMemberSince(value: string | Date | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function AccountContextCard({
  memberSince,
  userId,
}: {
  memberSince: string | Date | undefined;
  userId: string;
}) {
  const [context, setContext] = useState<AccountContext | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    let cancelled = false;
    getAccountContext()
      .then((nextContext) => {
        if (cancelled) return;
        setContext(nextContext);
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const memberSinceLabel = formatMemberSince(memberSince);
  const hasError = status === "error" || (status === "ready" && !context);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck aria-hidden="true" className="size-5" />
          Account context
        </CardTitle>
        <CardDescription>Your role and access in PIP.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {status === "loading" && (
          <div className="space-y-4" aria-busy="true">
            <p role="status" className="sr-only">
              Loading your account context...
            </p>
            <div className="space-y-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-6 w-40 max-w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full max-w-md" />
              <Skeleton className="h-4 w-3/4 max-w-sm" />
            </div>
          </div>
        )}

        {hasError && (
          <p role="alert" className="text-sm text-red-600">
            Unable to load your account context right now.
          </p>
        )}

        {status === "ready" && context && (
          <>
            {context.roles.length === 0 ? (
              <div className="space-y-1">
                <p className="text-sm font-medium">No roles</p>
                <p className="text-sm text-muted-foreground">
                  Neither the Admin nor Board role is assigned to your
                  account.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Role</p>
                  <div className="flex flex-wrap gap-2">
                    {context.roles.map((roleId) => (
                      <span
                        key={roleId}
                        className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-sm font-medium text-green-700"
                      >
                        {roleDetails[roleId].label}
                      </span>
                    ))}
                  </div>
                </div>

                <dl className="space-y-3">
                  {context.roles.map((roleId) => (
                    <div key={roleId} className="space-y-0.5">
                      <dt className="text-sm font-medium">
                        {roleDetails[roleId].label}
                      </dt>
                      <dd className="text-sm text-muted-foreground">
                        {roleDetails[roleId].description}
                      </dd>
                    </div>
                  ))}
                </dl>
              </>
            )}

            {context.programs.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-sm font-medium">
                  Assigned{" "}
                  {context.programs.length === 1 ? "program" : "programs"}
                </p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {context.programs.map((program) => (
                    <li key={program}>{program}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {memberSinceLabel && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays aria-hidden="true" className="size-4" />
            Member since {memberSinceLabel}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
