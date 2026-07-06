"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type EditMemberModalProps = {
  member: {
    id: number;
    name: string;
    email: string;
  };
  teamId: number;
};

export function EditMemberModal({ member, teamId }: EditMemberModalProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState(member.name);
  const [email, setEmail] = useState(member.email);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName(member.name);
    setEmail(member.email);
    setError(null);
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setError("Member name is required.");
      return;
    }

    if (!trimmedEmail) {
      setError("Member email is required.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/users/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          teamId,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(body.error || "Unable to update member.");
        return;
      }

      setOpen(false);
      router.refresh();
    } catch {
      setError("Unexpected error while updating member.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          resetForm();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Edit
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Team Member</DialogTitle>
          <DialogDescription>
            Update this member&apos;s name and email.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label
              className="text-sm font-medium"
              htmlFor={`member-name-${member.id}`}
            >
              Name
            </label>
            <Input
              id={`member-name-${member.id}`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isSaving}
              required
            />
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium"
              htmlFor={`member-email-${member.id}`}
            >
              Email
            </label>
            <Input
              id={`member-email-${member.id}`}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSaving}
              required
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
