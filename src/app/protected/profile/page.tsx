"use client";

import { useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Eye,
  EyeOff,
  KeyRound,
  UserRound,
} from "lucide-react";
import { cn } from "cn";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { SignOutButton } from "@/components/sign-out-button";
import { authClient } from "@/lib/auth-client";
import { AccountContextCard } from "./account-context-card";

function PasswordInput({
  id,
  visible,
  onToggleVisibility,
  toggleLabel,
  ...props
}: React.ComponentProps<typeof Input> & {
  id: string;
  visible: boolean;
  onToggleVisibility: () => void;
  toggleLabel: string;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        className="pr-10"
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
        onClick={onToggleVisibility}
        aria-label={`${visible ? "Hide" : "Show"} ${toggleLabel}`}
        aria-controls={id}
        disabled={props.disabled}
      >
        {visible ? (
          <EyeOff aria-hidden="true" className="size-4" />
        ) : (
          <Eye aria-hidden="true" className="size-4" />
        )}
      </Button>
    </div>
  );
}

function ProfilePageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <p role="status" className="sr-only">
        Loading profile settings...
      </p>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-44 max-w-full" />
          <Skeleton className="h-4 w-56 max-w-full" />
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-6 w-40 max-w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="h-4 w-3/4 max-w-sm" />
          </div>
          <Skeleton className="h-4 w-48" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-52 max-w-full" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-8 w-full" />
          </div>
          <div className="grid gap-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-8 w-full" />
          </div>
          <Skeleton className="h-8 w-28" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-28 max-w-full" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-36" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-20 max-w-full" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, isPending, refetch } = authClient.useSession();
  const [nameDraft, setNameDraft] = useState<{
    userId: string;
    value: string;
  } | null>(null);
  const name =
    session?.user && nameDraft?.userId === session.user.id
      ? nameDraft.value
      : (session?.user.name ?? "");
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameStatus, setNameStatus] = useState<string | null>(null);
  const [isPasswordFormOpen, setIsPasswordFormOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);

  const handleSaveName = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) {
      setNameError(
        "Unable to load your profile. Please refresh and try again.",
      );
      return;
    }
    const updatedName = name.trim();
    if (!updatedName) {
      setNameError("Enter your name.");
      return;
    }

    setIsSavingName(true);
    setNameError(null);
    setNameStatus(null);
    try {
      const { error } = await authClient.updateUser({ name: updatedName });
      if (error)
        throw new Error(error.message || "Unable to update your name.");
      setNameDraft({ userId: session.user.id, value: updatedName });
      await refetch();
      setNameStatus("Your name has been updated.");
    } catch (error: unknown) {
      setNameError(
        error instanceof Error ? error.message : "Unable to update your name.",
      );
    } finally {
      setIsSavingName(false);
    }
  };

  const handleChangePassword = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordStatus(null);
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    setIsChangingPassword(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
      });
      if (error) {
        throw new Error(
          error.code === "INVALID_PASSWORD"
            ? "Incorrect current password"
            : error.message || "Unable to change your password.",
        );
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setPasswordStatus("Your password has been changed.");
    } catch (error: unknown) {
      setPasswordError(
        error instanceof Error
          ? error.message
          : "Unable to change your password.",
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleCancelPasswordChange = () => {
    setIsPasswordFormOpen(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setPasswordError(null);
    setPasswordStatus(null);
  };

  return (
    <section className="w-full max-w-6xl space-y-6">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-ml-2 w-fit cursor-pointer"
        onClick={() => router.back()}
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back
      </Button>
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Account
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Profile settings
        </h1>
      </div>

      {isPending ? (
        <ProfilePageSkeleton />
      ) : (
        <>
          {session?.user && (
            <AccountContextCard
              key={session.user.id}
              userId={session.user.id}
              memberSince={session.user.createdAt}
            />
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound aria-hidden="true" className="size-5" />
                Personal information
              </CardTitle>
              <CardDescription>
                Update the name shown in your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveName} className="space-y-5">
                <div className="grid gap-2">
                  <Label htmlFor="profile-name">Name</Label>
                  <Input
                    id="profile-name"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(event) => {
                      if (session?.user) {
                        setNameDraft({
                          userId: session.user.id,
                          value: event.target.value,
                        });
                      }
                    }}
                    disabled={isPending || !session}
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="profile-email">Email</Label>
                    {session?.user.emailVerified ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                        <BadgeCheck aria-hidden="true" className="size-3.5" />
                        Verified
                      </span>
                    ) : session?.user ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        Not verified
                      </span>
                    ) : null}
                  </div>
                  <Input
                    id="profile-email"
                    type="email"
                    value={session?.user.email ?? ""}
                    readOnly
                    disabled={isPending}
                  />
                </div>
                {nameError && (
                  <p role="alert" className="text-sm text-red-600">
                    {nameError}
                  </p>
                )}
                {nameStatus && (
                  <p role="status" className="text-sm text-green-700">
                    {nameStatus}
                  </p>
                )}
                <Button
                  type="submit"
                  disabled={isPending || isSavingName || !session}
                >
                  {isSavingName ? "Saving..." : "Save changes"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound aria-hidden="true" className="size-5" />
                Password
              </CardTitle>
              <CardDescription>
                Change your password using your current password or reset your
                password
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isPasswordFormOpen ? (
                <form onSubmit={handleChangePassword} className="space-y-5">
                  <div className="grid gap-2">
                    <Label htmlFor="current-password">Current password</Label>
                    <PasswordInput
                      id="current-password"
                      autoComplete="current-password"
                      required
                      value={currentPassword}
                      onChange={(event) =>
                        setCurrentPassword(event.target.value)
                      }
                      disabled={isChangingPassword}
                      visible={showCurrentPassword}
                      onToggleVisibility={() =>
                        setShowCurrentPassword((visible) => !visible)
                      }
                      toggleLabel="current password"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="new-password">New password</Label>
                    <PasswordInput
                      id="new-password"
                      autoComplete="new-password"
                      minLength={8}
                      required
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      disabled={isChangingPassword}
                      visible={showNewPassword}
                      onToggleVisibility={() =>
                        setShowNewPassword((visible) => !visible)
                      }
                      toggleLabel="new password"
                    />
                    <p className="text-sm text-muted-foreground">
                      Use at least 8 characters.
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="confirm-password">
                      Confirm new password
                    </Label>
                    <PasswordInput
                      id="confirm-password"
                      autoComplete="new-password"
                      minLength={8}
                      required
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      disabled={isChangingPassword}
                      visible={showConfirmPassword}
                      onToggleVisibility={() =>
                        setShowConfirmPassword((visible) => !visible)
                      }
                      toggleLabel="confirm new password"
                    />
                  </div>
                  {passwordError && (
                    <p role="alert" className="text-sm text-red-600">
                      {passwordError}
                    </p>
                  )}
                  {passwordStatus && (
                    <p role="status" className="text-sm text-green-700">
                      {passwordStatus}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={isChangingPassword}>
                      {isChangingPassword
                        ? "Changing password..."
                        : "Update password"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancelPasswordChange}
                      disabled={isChangingPassword}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsPasswordFormOpen(true);
                      setPasswordStatus(null);
                    }}
                  >
                    Change password
                  </Button>
                  <Link
                    href="/auth/forgot-password"
                    className={cn(buttonVariants({ variant: "outline" }))}
                  >
                    Forgot current password?
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sign out</CardTitle>
              <CardDescription>
                Sign out of your account on this device.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SignOutButton />
            </CardContent>
          </Card>
        </>
      )}
    </section>
  );
}
