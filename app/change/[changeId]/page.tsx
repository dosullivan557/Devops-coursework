import Link from "next/link";
import { notFound } from "next/navigation";

import { query } from "@/app/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChangeStatusBadge } from "@/components/change-status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EditChangeModal } from "@/app/change/edit-change-modal";
import { TransitionActions } from "@/app/change/[changeId]/transition-actions";

export const dynamic = "force-dynamic";

type ChangeSchemaRow = {
  hasTitle: boolean;
  hasChangeType: boolean;
  hasChgNumber: boolean;
  hasUserId: boolean;
  usersExists: boolean;
  hasUpdatedAt: boolean;
};

type ChangeDetailRow = {
  id: number;
  changeNumber: string | null;
  title: string;
  description: string | null;
  status: string;
  requester: string;
  teamId: number;
  teamName: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export const metadata = {
  title: "Change Requests",
  description: "View and manage change requests for your systems.",
};

const ChangePage = async ({
  params,
}: {
  params: Promise<{ changeId: string }>;
}) => {
  const { changeId } = await params;
  const parsedChangeId = Number(changeId);
  const isNumericId = Number.isInteger(parsedChangeId) && parsedChangeId > 0;

  const [schema] = await query<ChangeSchemaRow>(`
    SELECT
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'changes' AND column_name = 'title'
      ) AS "hasTitle",
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'changes' AND column_name = 'change_type'
      ) AS "hasChangeType",
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'changes' AND column_name = 'chg_number'
      ) AS "hasChgNumber",
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'changes' AND column_name = 'user_id'
      ) AS "hasUserId",
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'changes' AND column_name = 'updated_at'
      ) AS "hasUpdatedAt",
      to_regclass('public.users') IS NOT NULL AS "usersExists"
  `);

  const titleExpr = schema?.hasTitle
    ? "c.title"
    : schema?.hasChangeType
      ? "c.change_type"
      : "'Untitled change'";
  const chgNumberExpr = schema?.hasChgNumber
    ? "c.chg_number::text"
    : "NULL::text";
  const includeUsersJoin = Boolean(schema?.usersExists && schema?.hasUserId);
  const usersJoin = includeUsersJoin
    ? "LEFT JOIN users u ON u.id = c.user_id"
    : "";
  const requesterExpr = includeUsersJoin
    ? "COALESCE(u.name, t.name, 'Unknown')"
    : "COALESCE(t.name, 'Unknown')";
  const updatedExpr = schema?.hasUpdatedAt
    ? "c.updated_at::text"
    : "NULL::text";
  const whereClause = isNumericId
    ? "c.id = $1"
    : schema?.hasChgNumber
      ? "LOWER(c.chg_number::text) = LOWER($1)"
      : "";

  if (!whereClause) {
    notFound();
  }

  const [change] = await query<ChangeDetailRow>(
    `
    SELECT
      c.id,
      ${chgNumberExpr} AS "changeNumber",
      ${titleExpr} AS title,
      c.description,
      c.status,
      ${requesterExpr} AS requester,
      c.team_id AS "teamId",
      t.name AS "teamName",
      c.created_at::text AS "createdAt",
      ${updatedExpr} AS "updatedAt"
    FROM changes c
    LEFT JOIN teams t ON t.id = c.team_id
    ${usersJoin}
    WHERE ${whereClause}
  `,
    [isNumericId ? parsedChangeId : changeId],
  );

  if (!change) {
    notFound();
  }

  const transitionIdentifier = change.changeNumber || String(change.id);

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto w-full max-w-5xl space-y-8 px-4 py-20 md:px-6">
        <div className="space-y-3">
          <Badge variant="secondary">Change Detail</Badge>
          <h1 className="font-heading text-4xl md:text-5xl">{change.title}</h1>
          <p className="max-w-3xl text-muted-foreground">
            {change.description || "No description provided for this change."}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
              <CardDescription>
                Core attributes for this request.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Change ID: {change.id}</p>
              <p>CHG Number: {change.changeNumber || "-"}</p>
              <p>
                Status: <ChangeStatusBadge status={change.status} />
              </p>
              <p>Requester: {change.requester}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ownership</CardTitle>
              <CardDescription>Team and timestamps.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Team: {change.teamName ? change.teamName : "Unknown"} (ID:{" "}
                {change.teamId})
              </p>
              <p>Created: {change.createdAt}</p>
              <p>Updated: {change.updatedAt || "-"}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Transition Request</CardTitle>
            <CardDescription>
              Move this change through its allowed workflow stages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TransitionActions
              identifier={transitionIdentifier}
              currentStatus={change.status}
            />
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <EditChangeModal change={change} />
          <Button asChild variant="outline">
            <Link href="/change">Back to Change Requests</Link>
          </Button>
          <Button asChild variant="link">
            <Link href={`/teams/${change.teamId}`}>Go to Team</Link>
          </Button>
        </div>
      </section>
    </main>
  );
};

export default ChangePage;
