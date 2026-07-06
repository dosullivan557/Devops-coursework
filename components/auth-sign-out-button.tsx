"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function AuthSignOutButton() {
  return (
    <Button
      className="w-full group-data-[collapsible=icon]:hidden"
      variant="outline"
      size="sm"
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      <LogOut className="size-4" />
      Sign Out
    </Button>
  );
}
