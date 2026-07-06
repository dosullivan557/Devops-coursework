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
import { Pencil } from "lucide-react";

type TeamOption = {
  id: number;
  name: string;
};

type EditChangeModalProps = {
  change: {
    id: number;
    changeNumber: string | null;
    title: string;
    description: string | null;
    status?: string;
    teamId?: number;
  };
};

export function EditChangeModal({ change }: EditChangeModalProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [changeNumber, setChangeNumber] = useState(change.changeNumber || "");
  const [title, setTitle] = useState(change.title);
  const [description, setDescription] = useState(change.description || "");
  const [status, setStatus] = useState(change.status || "pending");
  const [teamId, setTeamId] = useState(
    change.teamId ? String(change.teamId) : "",
  );
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
        const response = await fetch("/api/teams", { cache: "no-store" });
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
  }, [open, teams.length]);

  const resetForm = () => {
    setChangeNumber(change.changeNumber || "");
    setTitle(change.title);
    setDescription(change.description || "");
    setStatus(change.status || "pending");
    setTeamId(change.teamId ? String(change.teamId) : "");
    setError(null);
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedChangeNumber = changeNumber.trim();
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedChangeNumber) {
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
      const response = await fetch(`/api/change/${change.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: Number(teamId),
          changeNumber: trimmedChangeNumber,
          title: trimmedTitle,
          description: trimmedDescription || null,
          status,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(body.error || "Unable to update change request.");
        return;
      }

      setOpen(false);
      router.refresh();
    } catch {
      setError("Unexpected error while updating change request.");
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
          <DialogTitle>Edit Change Request</DialogTitle>
          <DialogDescription>
            Update the request details and ownership.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label
              className="text-sm font-medium"
              htmlFor={`change-number-${change.id}`}
            >
              Change Number
            </label>
            <Input
              id={`change-number-${change.id}`}
              value={changeNumber}
              onChange={(event) => setChangeNumber(event.target.value)}
              disabled={isSaving}
              required
            />
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium"
              htmlFor={`change-title-${change.id}`}
            >
              Title
            </label>
            <Input
              id={`change-title-${change.id}`}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isSaving}
              required
            />
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium"
              htmlFor={`change-description-${change.id}`}
            >
              Description
            </label>
            <Textarea
              id={`change-description-${change.id}`}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={isSaving}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                htmlFor={`change-team-${change.id}`}
              >
                Team
              </label>
              <select
                id={`change-team-${change.id}`}
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

            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                htmlFor={`change-status-${change.id}`}
              >
                Status
              </label>
              <select
                id={`change-status-${change.id}`}
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                disabled={isSaving}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="complete">Complete</option>
                <option value="rejected">Rejected</option>
                <option value="rolled back">Rolled Back</option>
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
