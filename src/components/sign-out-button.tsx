"use client";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await authClient.signOut();
      if (error) throw new Error(error.message || "Unable to sign out");
      router.push("/auth/login");
      router.refresh();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Unable to sign out. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
      <Button type="button" variant="outline" onClick={handleSignOut} disabled={isLoading}>
        {isLoading ? "Signing out..." : "Sign out"}
      </Button>
    </div>
  );
}
