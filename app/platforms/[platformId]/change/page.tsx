import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { query } from "@/app/lib/db";
import { ensurePlatformSchema } from "@/app/lib/platform-schema";
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
import { CreateChangeModal } from "@/app/change/create-change-modal";
import { EditChangeModal } from "@/app/change/edit-change-modal";

export const dynamic = "force-dynamic";

type ChangeRequest = {
  id: number;
  changeNumber: string | null;
  title: string;
  description: string | null;
  requester: string;
  status?: string;
  createdAt?: string;
  teamId?: number;
};

type Platform = {
  id: number;
  name: string;
  description: string | null;
};

const PlatformChangesPage = async ({
  params,
}: {
  params: Promise<{ platformId: string }>;
}) => {
  const { platformId } = await params;

  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";

  if (!host) {
    throw new Error("Unable to determine host for change API request");
  }

  await ensurePlatformSchema();

  const [platform] = await query<Platform>(
    `SELECT id, name, description FROM platform WHERE id = $1`,
    [Number(platformId)],
  );

  if (!platform) {
    notFound();
  }

  const changeRequestsResponse = await fetch(
    `${protocol}://${host}/api/change?platformId=${encodeURIComponent(platformId)}`,
    { cache: "no-store" },
  );

  if (!changeRequestsResponse.ok) {
    throw new Error("Failed to fetch change requests");
  }

  const changeRequests =
    (await changeRequestsResponse.json()) as ChangeRequest[];
  const parsedPlatformId = Number(platformId);

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto w-full max-w-6xl space-y-8 px-4 py-20 md:px-6">
        <div className="space-y-3">
          <Badge variant="secondary">Platform Changes</Badge>
          <h1 className="font-heading text-4xl md:text-5xl">{platform.name}</h1>
          <p className="max-w-3xl text-muted-foreground">
            {platform.description ||
              "Review every change request linked to this platform."}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Change Queue</CardTitle>
            <CardDescription>
              Requests are ordered by latest creation time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CHG Number</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {changeRequests.map((cr) => (
                  <TableRow key={cr.id}>
                    <TableCell className="font-mono text-xs">
                      <Link
                        href={`/change/${encodeURIComponent(
                          cr.changeNumber || String(cr.id),
                        )}`}
                      >
                        {cr.changeNumber || String(cr.id)}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">{cr.title}</TableCell>
                    <TableCell>{cr.description || "-"}</TableCell>
                    <TableCell>{cr.requester}</TableCell>
                    <TableCell>
                      <ChangeStatusBadge status={cr.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <EditChangeModal change={cr} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {changeRequests.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Change Requests</CardTitle>
              <CardDescription>
                Create the first change request for this platform.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        <div className="flex items-center gap-3">
          <CreateChangeModal platformId={parsedPlatformId} />
          <Button asChild variant="outline">
            <Link href={`/platforms/${platformId}`}>Back to Platform</Link>
          </Button>
          <Button asChild variant="link">
            <Link href={`/platforms/${platformId}/teams`}>Platform Teams</Link>
          </Button>
        </div>
      </section>
    </main>
  );
};

export default PlatformChangesPage;
