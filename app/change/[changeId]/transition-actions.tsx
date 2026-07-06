"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const allowedTransitions: Record<string, string[]> = {
  pending: ["approved", "rejected"],
  approved: ["complete", "rejected", "rolled back"],
  complete: ["rolled back"],
  rejected: [],
  "rolled back": [],
};

const labelForStatus = (status: string) =>
  status
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const mainFlow = ["pending", "approved", "complete"];

const statusDescription: Record<string, string> = {
  pending: "Awaiting review and approval",
  approved: "Reviewed and approved for implementation",
  complete: "Implemented successfully",
  rejected: "Stopped due to validation/review issues",
  "rolled back": "Implementation reverted after deployment",
};

export function TransitionActions({
  identifier,
  currentStatus,
}: {
  identifier: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const normalizedStatus = currentStatus.trim().toLowerCase();

  const nextStatuses = useMemo(
    () => allowedTransitions[normalizedStatus] || [],
    [normalizedStatus],
  );
  const [selectedStatus, setSelectedStatus] = useState("");

  const currentMainFlowIndex = mainFlow.indexOf(normalizedStatus);
  const isErrorState =
    normalizedStatus === "rejected" || normalizedStatus === "rolled back";
  const completedStageIndex =
    currentMainFlowIndex >= 0
      ? currentMainFlowIndex
      : normalizedStatus === "rolled back"
        ? 1
        : 0;

  const transition = async (nextStatus: string) => {
    setError(null);
    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/change/${encodeURIComponent(identifier)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        },
      );

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(body.error || "Unable to transition status.");
        return;
      }

      router.refresh();
    } catch {
      setError("Unexpected error while transitioning status.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-4 rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Workflow Progress</p>
          {isErrorState ? (
            <Badge variant="destructive">
              {labelForStatus(normalizedStatus)}
            </Badge>
          ) : (
            <Badge variant="outline">{labelForStatus(normalizedStatus)}</Badge>
          )}
        </div>

        <div className="grid grid-cols-3 items-start gap-2">
          {mainFlow.map((stage, index) => {
            const done = index <= completedStageIndex;
            const active = stage === normalizedStatus;

            return (
              <div key={stage} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div
                    className={[
                      "flex size-7 items-center justify-center rounded-full border text-xs font-semibold",
                      done
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground",
                      active ? "ring-2 ring-primary/30" : "",
                    ].join(" ")}
                  >
                    {index + 1}
                  </div>
                  {index < mainFlow.length - 1 ? (
                    <div
                      className={[
                        "h-1 flex-1 rounded-full",
                        index < completedStageIndex ? "bg-primary" : "bg-muted",
                      ].join(" ")}
                    />
                  ) : null}
                </div>
                <p className="text-xs font-medium">{labelForStatus(stage)}</p>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          {statusDescription[normalizedStatus] || "Current workflow status"}
        </p>
      </div>

      {nextStatuses.length > 0 ? (
        <div className="space-y-3 rounded-lg border border-border p-4">
          <p className="text-sm font-medium">Transition</p>
          <p className="text-xs text-muted-foreground">
            Select the next state to continue this request lifecycle.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value)}
              disabled={isSaving}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <option value="">Select next status</option>
              {nextStatuses.map((status) => (
                <option key={status} value={status}>
                  {labelForStatus(status)}
                </option>
              ))}
            </select>

            <Button
              type="button"
              disabled={isSaving || !selectedStatus}
              variant={
                selectedStatus === "rejected" ||
                selectedStatus === "rolled back"
                  ? "destructive"
                  : "secondary"
              }
              onClick={() => transition(selectedStatus)}
            >
              {isSaving ? "Updating..." : "Apply Transition"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No further transitions available from this status.
        </p>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
