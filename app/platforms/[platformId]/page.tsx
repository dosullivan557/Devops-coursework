import Link from "next/link";
import { notFound } from "next/navigation";
import { Layers, ListChecks } from "lucide-react";

import { query } from "@/app/lib/db";
import { ensurePlatformSchema } from "@/app/lib/platform-schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

type PlatformRow = {
  id: number;
  name: string;
  description: string | null;
  teams: number;
  changes: number;
};

const PlatformPage = async ({
  params,
}: {
  params: Promise<{ platformId: string }>;
}) => {
  const { platformId } = await params;
  const parsedPlatformId = Number(platformId);

  if (!Number.isInteger(parsedPlatformId) || parsedPlatformId <= 0) {
    notFound();
  }

  await ensurePlatformSchema();

  const [platform] = await query<PlatformRow>(
    `
    SELECT
      p.id,
      p.name,
      p.description,
      COUNT(DISTINCT t.id)::int AS teams,
      COUNT(c.id)::int AS changes
    FROM platform p
    LEFT JOIN teams t ON t.platform_id = p.id
    LEFT JOIN changes c ON c.team_id = t.id
    WHERE p.id = $1
    GROUP BY p.id
  `,
    [parsedPlatformId],
  );

  if (!platform) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto w-full max-w-6xl space-y-8 px-4 py-20 md:px-6">
        <div className="space-y-3">
          <Badge variant="secondary">Platform</Badge>
          <h1 className="font-heading text-4xl md:text-5xl">{platform.name}</h1>
          <p className="max-w-3xl text-muted-foreground">
            {platform.description ||
              "No description provided for this platform."}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="size-4" />
                Teams in Platform
              </CardTitle>
              <CardDescription>
                Browse the teams that belong to this platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-3xl font-heading">{platform.teams}</p>
              <Button asChild variant="secondary">
                <Link href={`/platforms/${platform.id}/teams`}>View Teams</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="size-4" />
                Changes in Platform
              </CardTitle>
              <CardDescription>
                Inspect every change request linked to this platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-3xl font-heading">{platform.changes}</p>
              <Button asChild variant="secondary">
                <Link href={`/platforms/${platform.id}/change`}>
                  View Changes
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-3">
          <Button asChild variant="outline">
            <Link href="/">Back to Platforms</Link>
          </Button>
          <Button asChild variant="link">
            <Link href="/teams">Global Teams</Link>
          </Button>
          <Button asChild variant="link">
            <Link href="/change">Global Changes</Link>
          </Button>
        </div>
      </section>
    </main>
  );
};

export default PlatformPage;
