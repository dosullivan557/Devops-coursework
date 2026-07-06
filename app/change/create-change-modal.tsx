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

type TeamOption = {
  id: number;
  name: string;
};

export function CreateChangeModal({ platformId }: { platformId?: number }) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("pending");
  const [teamId, setTeamId] = useState("");
  const [changeNumber, setChangeNumber] = useState("");
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || teams.length > 0) {
      return;
    }

    const loadTeams = async () => {
      setIsLoadingTeams(true);
      try {
        const query = platformId ? `?platformId=${platformId}` : "";
        const response = await fetch(`/api/teams${query}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          setError("Unable to load teams.");
          return;
        }

        const data = (await response.json()) as TeamOption[];
        setTeams(data);
      } catch {
        setError("Unable to load teams.");
      } finally {
        setIsLoadingTeams(false);
      }
    };

    void loadTeams();
  }, [open, teams.length, platformId]);

  const resetForm = () => {
    setChangeNumber("");
    setTitle("");
    setDescription("");
    setStatus("pending");
    setTeamId("");
    setError(null);
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();

    let trimmedChangeNumber = changeNumber.trim();
    if (trimmedChangeNumber.toUpperCase().startsWith("CHG-"))
      trimmedChangeNumber = trimmedChangeNumber.substring(4);
    const trimmedDescription = description.trim();
    const chgNumber = `CHG-${trimmedChangeNumber}`;

    if (!chgNumber) {
      setError("Change number is required.");
      return;
    }

    if (!trimmedTitle) {
      setError("Title is required.");
      return;
    }

    if (!teamId) {
      setError("Please select a team.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: Number(teamId),
          changeNumber: chgNumber,
          title: trimmedTitle,
          description: trimmedDescription || null,
          status,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(body.error || "Unable to create change request.");
        return;
      }

      setOpen(false);
      resetForm();
      router.refresh();
    } catch {
      setError("Unexpected error while creating change request.");
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
        <Button variant="outline">Create Change Request</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Change Request</DialogTitle>
          <DialogDescription>
            Submit a new change and link it to the owning team.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="change-number">
              Change Number
            </label>
            <div className="flex">
              <span className="flex items-center px-3 bg-muted text-sm font-medium rounded-l-xl border border-input border-r-0">
                CHG-
              </span>
              <Input
                id="change-number"
                name="change-number"
                type="number"
                placeholder="001234"
                value={changeNumber}
                onChange={(event) => setChangeNumber(event.target.value)}
                disabled={isSaving}
                required
                className="rounded-l-none"
              />
            </div>
            <label className="text-sm font-medium" htmlFor="change-title">
              Title
            </label>
            <Input
              id="change-title"
              name="title"
              placeholder="Upgrade PostgreSQL minor version"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isSaving}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="change-description">
              Description
            </label>
            <Textarea
              id="change-description"
              name="description"
              placeholder="Planned change details and rollback approach."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={isSaving}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-1">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="change-team">
                Team
              </label>
              <select
                id="change-team"
                name="team"
                value={teamId}
                onChange={(event) => setTeamId(event.target.value)}
                disabled={isSaving || isLoadingTeams}
                required
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">
                  {isLoadingTeams ? "Loading teams..." : "Select team"}
                </option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
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
            <Button type="submit" disabled={isSaving || teams.length === 0}>
              {isSaving ? "Saving..." : "Save Change"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
