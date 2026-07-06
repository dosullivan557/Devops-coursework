import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { query } from "@/app/lib/db";
import { ensurePlatformSchema } from "@/app/lib/platform-schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateTeamModal } from "@/app/teams/create-team-modal";

export const dynamic = "force-dynamic";

type Team = {
  id: number;
  name: string;
  description: string | null;
  members: number;
  platformId: number | null;
  platformName: string | null;
};

type Platform = {
  id: number;
  name: string;
  description: string | null;
};

const PlatformTeamsPage = async ({
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
    throw new Error("Unable to determine host for teams API request");
  }

  await ensurePlatformSchema();

  const [platform] = await query<Platform>(
    `SELECT id, name, description FROM platform WHERE id = $1`,
    [Number(platformId)],
  );

  if (!platform) {
    notFound();
  }

  const teamsResponse = await fetch(
    `${protocol}://${host}/api/teams?platformId=${encodeURIComponent(platformId)}`,
    { cache: "no-store" },
  );

  if (!teamsResponse.ok) {
    throw new Error("Failed to fetch teams");
  }

  const teams = (await teamsResponse.json()) as Team[];
  const parsedPlatformId = Number(platformId);

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto w-full max-w-6xl space-y-8 px-4 py-20 md:px-6">
        <div className="space-y-3">
          <Badge variant="secondary">Platform Teams</Badge>
          <h1 className="font-heading text-4xl md:text-5xl">{platform.name}</h1>
          <p className="max-w-3xl text-muted-foreground">
            {platform.description ||
              "Explore every team that belongs to this platform."}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Link key={team.id} href={`/teams/${team.id}`}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>{team.name}</CardTitle>
                  <CardDescription>
                    {team.description || "No description available."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline">
                    {team.members} member{team.members === 1 ? "" : "s"}
                  </Badge>
                </CardContent>
                <CardFooter className="justify-between">
                  <span className="text-sm text-muted-foreground">
                    Team ID: {team.id}
                  </span>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>

        {teams.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Teams Yet</CardTitle>
              <CardDescription>
                Create the first team for this platform.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        <div className="flex items-center gap-3">
          <CreateTeamModal platformId={parsedPlatformId} />
          <Button asChild variant="outline">
            <Link href={`/platforms/${platformId}`}>Back to Platform</Link>
          </Button>
          <Button asChild variant="link">
            <Link href={`/platforms/${platformId}/change`}>
              Platform Changes
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
};

export default PlatformTeamsPage;
