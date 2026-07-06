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
import { Textarea } from "@/components/ui/textarea";
import { Pencil } from "lucide-react";

type EditTeamModalProps = {
  team: {
    id: number;
    name: string;
    description: string | null;
  };
};

export function EditTeamModal({ team }: EditTeamModalProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description || "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = () => {
    setName(team.name);
    setDescription(team.description || "");
    setError(null);
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName) {
      setError("Team name is required.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/teams/${team.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          description: trimmedDescription || null,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(body.error || "Unable to update team.");
        return;
      }

      setOpen(false);
      router.refresh();
    } catch {
      setError("Unexpected error while updating team.");
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
          <Pencil />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Team</DialogTitle>
          <DialogDescription>
            Update this team&apos;s name and description.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label
              className="text-sm font-medium"
              htmlFor={`team-name-${team.id}`}
            >
              Team name
            </label>
            <Input
              id={`team-name-${team.id}`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isSaving}
              required
            />
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium"
              htmlFor={`team-description-${team.id}`}
            >
              Description
            </label>
            <Textarea
              id={`team-description-${team.id}`}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={isSaving}
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
              {isSaving ? "Saving..." : "Save Team"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
