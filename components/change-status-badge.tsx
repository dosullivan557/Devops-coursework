import { Badge } from "@/components/ui/badge";

type ChangeStatusBadgeProps = {
  status?: string | null;
};

const normalizeStatus = (value?: string | null) =>
  (value || "pending").trim().toLowerCase();

export function ChangeStatusBadge({ status }: ChangeStatusBadgeProps) {
  const normalized = normalizeStatus(status);

  if (normalized === "rejected" || normalized === "rolled back") {
    return <Badge variant="destructive">{normalized}</Badge>;
  }

  if (normalized === "approved") {
    return <Badge variant="secondary">approved</Badge>;
  }

  if (normalized === "complete") {
    return (
      <Badge
        variant="outline"
        className="border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      >
        complete
      </Badge>
    );
  }

  return <Badge variant="outline">pending</Badge>;
}
