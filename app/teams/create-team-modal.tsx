"use client";

import { useEffect, useState } from "react";
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

type PlatformOption = {
  id: number;
  name: string;
};

export function CreateTeamModal({ platformId }: { platformId?: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPlatformId, setSelectedPlatformId] = useState(
    platformId ? String(platformId) : "",
  );
  const [platforms, setPlatforms] = useState<PlatformOption[]>([]);
  const [isLoadingPlatforms, setIsLoadingPlatforms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open || platformId || platforms.length > 0) {
      return;
    }

    const loadPlatforms = async () => {
      setIsLoadingPlatforms(true);
      try {
        const response = await fetch("/api/platforms", { cache: "no-store" });
        if (!response.ok) {
          setError("Unable to load platforms.");
          return;
        }

        const data = (await response.json()) as PlatformOption[];
        setPlatforms(data);
      } catch {
        setError("Unable to load platforms.");
      } finally {
        setIsLoadingPlatforms(false);
      }
    };

    void loadPlatforms();
  }, [open, platformId, platforms.length]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setSelectedPlatformId(platformId ? String(platformId) : "");
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

    if (!selectedPlatformId) {
      setError("Please select a platform.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          description: trimmedDescription || null,
          platformId: Number(selectedPlatformId),
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(body.error || "Unable to create team.");
        return;
      }

      setOpen(false);
      resetForm();
      router.refresh();
    } catch {
      setError("Unexpected error while creating team.");
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
        <Button variant="outline">Create New Team</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Team</DialogTitle>
          <DialogDescription>
            Add a team and make it available in the teams directory.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit}>
          {!platformId ? (
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="team-platform">
                Platform
              </label>
              <select
                id="team-platform"
                value={selectedPlatformId}
                onChange={(event) => setSelectedPlatformId(event.target.value)}
                disabled={isSaving || isLoadingPlatforms}
                required
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">
                  {isLoadingPlatforms
                    ? "Loading platforms..."
                    : "Select platform"}
                </option>
                {platforms.map((platform) => (
                  <option key={platform.id} value={platform.id}>
                    {platform.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="team-name">
              Team name
            </label>
            <Input
              id="team-name"
              name="name"
              placeholder="Platform Engineering"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isSaving}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="team-description">
              Description
            </label>
            <Textarea
              id="team-description"
              name="description"
              placeholder="Owns core infrastructure and deployment pipelines."
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
            <Button
              type="submit"
              disabled={isSaving || (!platformId && platforms.length === 0)}
            >
              {isSaving ? "Saving..." : "Save Team"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
