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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddMemberModal } from "@/app/teams/[teamId]/add-member-modal";
import { EditChangeModal } from "@/app/change/edit-change-modal";
import { EditMemberModal } from "@/app/teams/[teamId]/edit-member-modal";
import { EditTeamModal } from "@/app/teams/edit-team-modal";

export const dynamic = "force-dynamic";

type TeamRow = {
  id: number;
  name: string;
  description: string | null;
  members: number;
  platformId: number | null;
  platformName: string | null;
};

type TeamChangeRow = {
  id: number;
  teamId: number;
  changeNumber: string | null;
  title: string;
  description: string | null;
  status: string;
  createdAt: string;
};

type ChangeSchemaRow = {
  hasTitle: boolean;
  hasChangeType: boolean;
  hasChgNumber: boolean;
};

type TeamSchemaCheckRow = {
  usersExists: boolean;
};

type TeamMemberRow = {
  id: number;
  name: string;
  email: string;
  createdAt: string;
};

const TeamPage = async ({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) => {
  const { teamId } = await params;
  const parsedTeamId = Number(teamId);

  if (!Number.isInteger(parsedTeamId) || parsedTeamId <= 0) {
    notFound();
  }

  const [teamSchema] = await query<TeamSchemaCheckRow>(
    `SELECT to_regclass('public.users') IS NOT NULL AS "usersExists"`,
  );

  const [team] = teamSchema?.usersExists
    ? await query<TeamRow>(
        `
        SELECT
          t.id,
          t.name,
          t.description,
          t.platform_id AS "platformId",
          p.name AS "platformName",
          COUNT(u.id)::int AS members
        FROM teams t
        LEFT JOIN platform p ON p.id = t.platform_id
        LEFT JOIN users u ON u.team_id = t.id
        WHERE t.id = $1
        GROUP BY t.id, t.platform_id, p.name
      `,
        [parsedTeamId],
      )
    : await query<TeamRow>(
        `
        SELECT
          t.id,
          t.name,
          t.description,
          t.platform_id AS "platformId",
          p.name AS "platformName",
          0::int AS members
        FROM teams t
        LEFT JOIN platform p ON p.id = t.platform_id
        WHERE t.id = $1
      `,
        [parsedTeamId],
      );

  if (!team) {
    notFound();
  }

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
      ) AS "hasChgNumber"
  `);

  const titleExpr = schema?.hasTitle
    ? "c.title"
    : schema?.hasChangeType
      ? "c.change_type"
      : "'Untitled change'";
  const changeNumberExpr = schema?.hasChgNumber
    ? "c.chg_number::text"
    : "NULL::text";

  const changes = await query<TeamChangeRow>(
    `
    SELECT
      c.id,
      c.team_id AS "teamId",
      ${changeNumberExpr} AS "changeNumber",
      ${titleExpr} AS title,
      c.description,
      c.status,
      c.created_at::text AS "createdAt"
    FROM changes c
    WHERE c.team_id = $1
    ORDER BY c.created_at DESC, c.id DESC
  `,
    [parsedTeamId],
  );

  const members = teamSchema?.usersExists
    ? await query<TeamMemberRow>(
        `
        SELECT
          u.id,
          u.name,
          u.email,
          u.created_at::text AS "createdAt"
        FROM users u
        WHERE u.team_id = $1
        ORDER BY u.created_at DESC, u.id DESC
      `,
        [parsedTeamId],
      )
    : [];

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto w-full max-w-6xl space-y-8 px-4 py-20 md:px-6">
        <div className="space-y-3">
          <Badge variant="secondary">Team Detail</Badge>
          <h1 className="font-heading text-4xl md:text-5xl">{team.name}</h1>
          <p className="max-w-3xl text-muted-foreground">
            {team.description || "No description provided for this team."}
          </p>
          {team.platformName && team.platformId ? (
            <Button asChild variant="link" className="px-0">
              <Link href={`/platforms/${team.platformId}`}>
                {team.platformName}
              </Link>
            </Button>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                Overview
                <EditTeamModal team={team} />
              </CardTitle>
              <CardDescription>{team.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Team ID: {team.id}
              </p>
              <p className="text-sm text-muted-foreground">
                Members: {team.members}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Change Volume</CardTitle>
              <CardDescription>
                Change requests linked to this team.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-heading">{changes.length}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Team Change Requests</CardTitle>
            <CardDescription>
              Latest changes owned by this team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CHG Number</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {changes.map((change) => (
                  <TableRow key={change.id}>
                    <TableCell className="font-mono text-xs">
                      {change.changeNumber || "-"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {change.title}
                    </TableCell>
                    <TableCell>{change.description || "-"}</TableCell>
                    <TableCell>
                      <ChangeStatusBadge status={change.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <EditChangeModal change={change} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {changes.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Change Requests Yet</CardTitle>
              <CardDescription>
                Create a change request and assign it to this team.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              Team Members
              <AddMemberModal teamId={team.id} />
            </CardTitle>

            <CardDescription>People assigned to this team.</CardDescription>
          </CardHeader>
          <CardContent>
            {members.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.name}
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell className="text-right">
                        <EditMemberModal member={member} teamId={team.id} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">
                No members added for this team yet.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button asChild variant="outline">
            <Link href="/teams">Back to Teams</Link>
          </Button>
          {team.platformId ? (
            <Button asChild variant="link">
              <Link href={`/platforms/${team.platformId}`}>
                Back to Platform
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="link">
            <Link href="/change">Go to Change Requests</Link>
          </Button>
        </div>
      </section>
    </main>
  );
};

export default TeamPage;
