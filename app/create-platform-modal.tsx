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

export function CreatePlatformModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = () => {
    setName("");
    setDescription("");
    setError(null);
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName) {
      setError("Platform name is required.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/platforms", {
        method: "POST",
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
        setError(body.error || "Unable to create platform.");
        return;
      }

      setOpen(false);
      resetForm();
      router.refresh();
    } catch {
      setError("Unexpected error while creating platform.");
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
        <Button variant="outline">Create Platform</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Platform</DialogTitle>
          <DialogDescription>
            Add a platform as the top-level grouping for teams and changes.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="platform-name">
              Platform name
            </label>
            <Input
              id="platform-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isSaving}
              required
            />
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium"
              htmlFor="platform-description"
            >
              Description
            </label>
            <Textarea
              id="platform-description"
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
              {isSaving ? "Saving..." : "Save Platform"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
