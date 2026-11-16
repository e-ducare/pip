"use client";

import { useState } from "react";
import { ArrowLeft, KeyRound, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignOutButton } from "@/components/sign-out-button";
import { authClient } from "@/lib/auth-client";

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, isPending, refetch } = authClient.useSession();
  const [nameDraft, setNameDraft] = useState<{ userId: string; value: string } | null>(null);
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
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);

  const handleSaveName = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) {
      setNameError("Unable to load your profile. Please refresh and try again.");
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
      if (error) throw new Error(error.message || "Unable to update your name.");
      setNameDraft({ userId: session.user.id, value: updatedName });
      await refetch();
      setNameStatus("Your name has been updated.");
    } catch (error: unknown) {
      setNameError(error instanceof Error ? error.message : "Unable to update your name.");
    } finally {
      setIsSavingName(false);
    }
  };

  const handleChangePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsChangingPassword(true);
    setPasswordError(null);
    setPasswordStatus(null);
    try {
      const { error } = await authClient.changePassword({ currentPassword, newPassword });
      if (error) throw new Error(error.message || "Unable to change your password.");
      setCurrentPassword("");
      setNewPassword("");
      setPasswordStatus("Your password has been changed.");
    } catch (error: unknown) {
      setPasswordError(error instanceof Error ? error.message : "Unable to change your password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleCancelPasswordChange = () => {
    setIsPasswordFormOpen(false);
    setCurrentPassword("");
    setNewPassword("");
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
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Profile settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRound aria-hidden="true" className="size-5" />
            Personal information
          </CardTitle>
          <CardDescription>Update the name shown in your account.</CardDescription>
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
                    setNameDraft({ userId: session.user.id, value: event.target.value });
                  }
                }}
                disabled={isPending || !session}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-email">Email</Label>
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
            <Button type="submit" disabled={isPending || isSavingName || !session}>
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
          <CardDescription>Change your password using your current password.</CardDescription>
        </CardHeader>
        <CardContent>
          {isPasswordFormOpen ? (
            <form onSubmit={handleChangePassword} className="space-y-5">
              <div className="grid gap-2">
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  disabled={isChangingPassword}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  disabled={isChangingPassword}
                />
                <p className="text-sm text-muted-foreground">Use at least 8 characters.</p>
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
                  {isChangingPassword ? "Changing password..." : "Update password"}
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
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sign out</CardTitle>
          <CardDescription>Sign out of your PIP account on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <SignOutButton />
        </CardContent>
      </Card>
    </section>
  );
}
